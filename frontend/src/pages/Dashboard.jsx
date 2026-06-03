import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts'
import api from '../api/axios'
import Navbar from '../components/Navbar'

const CATEGORIES = ['Food', 'Travel', 'Shopping', 'Entertainment', 'Bills', 'Income', 'Other']
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#6b7280']

const empty = { amount: '', type: 'expense', merchant: '', category: 'Food', date: '', description: '' }

export default function Dashboard() {
  const [transactions, setTransactions] = useState([])
  const [showForm, setShowForm]         = useState(false)
  const [form, setForm]                 = useState(empty)
  const [editId, setEditId]             = useState(null)
  const [loading, setLoading]           = useState(false)

  const fetchTransactions = async () => {
    const res = await api.get('/transactions/')
    setTransactions(res.data)
  }

  useEffect(() => { fetchTransactions() }, [])

  const totalIncome  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const balance      = totalIncome - totalExpense

  const categoryData = CATEGORIES.map(cat => ({
    name: cat,
    value: transactions.filter(t => t.category === cat && t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  })).filter(d => d.value > 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = { ...form, amount: parseFloat(form.amount) }
      if (editId) {
        await api.put(`/transactions/${editId}`, payload)
      } else {
        await api.post('/transactions/', payload)
      }
      setForm(empty)
      setEditId(null)
      setShowForm(false)
      fetchTransactions()
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (t) => {
    setForm({
      amount: t.amount,
      type: t.type,
      merchant: t.merchant || '',
      category: t.category,
      date: t.date.slice(0, 16),
      description: t.description || '',
    })
    setEditId(t.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this transaction?')) return
    await api.delete(`/transactions/${id}`)
    fetchTransactions()
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Income',  value: totalIncome,  color: 'text-emerald-400' },
            { label: 'Total Expense', value: totalExpense, color: 'text-red-400' },
            { label: 'Balance',       value: balance,      color: balance >= 0 ? 'text-emerald-400' : 'text-red-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <p className="text-slate-400 text-sm">{label}</p>
              <p className={`text-2xl font-bold mt-1 ${color}`}>₹{value.toLocaleString('en-IN')}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        {categoryData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h2 className="text-white font-semibold mb-4">Spending by category</h2>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name }) => name}>
                    {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => `₹${v.toLocaleString('en-IN')}`} contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h2 className="text-white font-semibold mb-4">Category breakdown</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={categoryData}>
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip formatter={(v) => `₹${v.toLocaleString('en-IN')}`} contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8 }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Add transaction */}
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold text-lg">Transactions</h2>
          <button
            onClick={() => { setForm(empty); setEditId(null); setShowForm(!showForm) }}
            className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {showForm ? 'Cancel' : '+ Add transaction'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Amount (₹)', key: 'amount', type: 'number', placeholder: '500' },
              { label: 'Merchant', key: 'merchant', type: 'text', placeholder: 'Zomato' },
              { label: 'Date', key: 'date', type: 'datetime-local', placeholder: '' },
              { label: 'Description', key: 'description', type: 'text', placeholder: 'Optional' },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label className="text-sm text-slate-400 mb-1 block">{label}</label>
                <input
                  type={type}
                  required={key !== 'merchant' && key !== 'description'}
                  value={form[key]}
                  onChange={e => setForm({ ...form, [key]: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                  placeholder={placeholder}
                />
              </div>
            ))}
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Type</label>
              <select
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Category</label>
              <select
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
              >
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={loading}
                className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
              >
                {loading ? 'Saving...' : editId ? 'Update transaction' : 'Add transaction'}
              </button>
            </div>
          </form>
        )}

        {/* Transaction list */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          {transactions.length === 0 ? (
            <div className="text-center text-slate-500 py-12">No transactions yet. Add one above.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  {['Date', 'Merchant', 'Category', 'Type', 'Amount', ''].map(h => (
                    <th key={h} className="text-left px-5 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map(t => (
                  <tr key={t.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-3 text-slate-400">{new Date(t.date).toLocaleDateString('en-IN')}</td>
                    <td className="px-5 py-3 text-white">{t.merchant || '—'}</td>
                    <td className="px-5 py-3">
                      <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md text-xs">{t.category}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium ${t.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {t.type}
                      </span>
                    </td>
                    <td className={`px-5 py-3 font-semibold ${t.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {t.type === 'income' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-5 py-3 flex gap-3">
                      <button onClick={() => handleEdit(t)} className="text-slate-400 hover:text-white transition-colors">Edit</button>
                      <button onClick={() => handleDelete(t.id)} className="text-slate-400 hover:text-red-400 transition-colors">Delete</button>
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