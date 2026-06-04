import { useState, useEffect } from 'react'
import api from '../api/axios'
import Navbar from '../components/Navbar'

const CATEGORIES = [
  "Food", "Travel", "Shopping", "Entertainment",
  "Bills", "Health", "Education", "Investment", "Income", "Other"
]

export default function Categorize() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading]           = useState(false)
  const [bulkLoading, setBulkLoading]   = useState(false)
  const [suggestLoading, setSuggestLoading] = useState({})
  const [message, setMessage]           = useState('')

  const fetchTransactions = async () => {
    const res = await api.get('/transactions/')
    setTransactions(res.data)
  }

  useEffect(() => { fetchTransactions() }, [])

  const handleCategoryChange = async (id, category) => {
    await api.put(`/transactions/${id}`, { category })
    setTransactions(prev =>
      prev.map(t => t.id === id ? { ...t, category } : t)
    )
  }

  const handleAISuggest = async (txn) => {
    if (!txn.merchant) return
    setSuggestLoading(prev => ({ ...prev, [txn.id]: true }))
    try {
      const res = await api.post('/categorize/suggest', { merchant: txn.merchant })
      await handleCategoryChange(txn.id, res.data.category)
      setMessage(`"${txn.merchant}" → ${res.data.category} (via ${res.data.source})`)
      setTimeout(() => setMessage(''), 3000)
    } finally {
      setSuggestLoading(prev => ({ ...prev, [txn.id]: false }))
    }
  }

  const handleBulkCategorize = async (useAi) => {
    setBulkLoading(true)
    setMessage('')
    try {
      const res = await api.post('/categorize/bulk', { use_ai: useAi })
      setMessage(res.data.message)
      fetchTransactions()
    } finally {
      setBulkLoading(false)
    }
  }

  const uncategorized = transactions.filter(t => t.category === 'Other')

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        <div>
          <h1 className="text-2xl font-bold text-white">Smart Categorization</h1>
          <p className="text-slate-400 text-sm mt-1">Review and fix transaction categories. Use AI to auto-suggest.</p>
        </div>

        {/* Bulk actions */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-white font-medium">Bulk categorize</p>
            <p className="text-slate-400 text-sm mt-0.5">
              {uncategorized.length} transaction{uncategorized.length !== 1 ? 's' : ''} in "Other"
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => handleBulkCategorize(false)}
              disabled={bulkLoading || uncategorized.length === 0}
              className="bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white text-sm px-4 py-2 rounded-lg transition-colors"
            >
              Rules only
            </button>
            <button
              onClick={() => handleBulkCategorize(true)}
              disabled={bulkLoading || uncategorized.length === 0}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              {bulkLoading ? 'Running AI...' : '✨ AI categorize all'}
            </button>
          </div>
        </div>

        {message && (
          <div className="bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 rounded-xl px-4 py-3 text-sm">
            {message}
          </div>
        )}

        {/* Transaction table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          {transactions.length === 0 ? (
            <div className="text-center text-slate-500 py-12">No transactions found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  {['Date', 'Merchant', 'Amount', 'Category', 'AI Suggest'].map(h => (
                    <th key={h} className="text-left px-5 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map(txn => (
                  <tr key={txn.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                    <td className="px-5 py-3 text-slate-400 whitespace-nowrap">
                      {new Date(txn.date).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-5 py-3 text-white">
                      {txn.merchant || <span className="text-slate-600">—</span>}
                    </td>
                    <td className={`px-5 py-3 font-medium ${txn.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {txn.type === 'income' ? '+' : '-'}₹{txn.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-5 py-3">
                      <select
                        value={txn.category}
                        onChange={e => handleCategoryChange(txn.id, e.target.value)}
                        className={`bg-slate-800 border rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-emerald-500 transition-colors
                          ${txn.category === 'Other'
                            ? 'border-amber-500/50 text-amber-400'
                            : 'border-slate-700 text-slate-300'}`}
                      >
                        {CATEGORIES.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-3">
                      {txn.merchant ? (
                        <button
                          onClick={() => handleAISuggest(txn)}
                          disabled={suggestLoading[txn.id]}
                          className="text-purple-400 hover:text-purple-300 disabled:opacity-40 text-xs flex items-center gap-1 transition-colors"
                        >
                          {suggestLoading[txn.id] ? 'Thinking...' : '✨ Suggest'}
                        </button>
                      ) : (
                        <span className="text-slate-600 text-xs">No merchant</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  )
}