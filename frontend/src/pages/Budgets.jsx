import { useState, useEffect } from 'react'
import api from '../api/axios'
import Navbar from '../components/Navbar'

const CATEGORIES = [
  "Food", "Travel", "Shopping", "Entertainment",
  "Bills", "Health", "Education", "Investment"
]

const statusColor = {
  ok:      { bar: 'bg-emerald-500', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-400' },
  warning: { bar: 'bg-amber-500',   text: 'text-amber-400',   badge: 'bg-amber-500/20 text-amber-400' },
  danger:  { bar: 'bg-red-500',     text: 'text-red-400',     badge: 'bg-red-500/20 text-red-400' },
}

const burnStatusConfig = {
  ok:       { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', label: 'Healthy burn rate' },
  warning:  { color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20',     label: 'Burning fast' },
  critical: { color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20',         label: 'Critical burn' },
}

export default function Budgets() {
  const [budgets,  setBudgets]  = useState([])
  const [runway,   setRunway]   = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [month,    setMonth]    = useState(() => new Date().toISOString().slice(0, 7))
  const [form,     setForm]     = useState({ category: 'Food', limit: '', month })
  const [loading,  setLoading]  = useState(false)
  const [message,  setMessage]  = useState('')

  const fetchBudgets = async () => {
    const res = await api.get(`/budgets/?month=${month}`)
    setBudgets(res.data)
  }

  const fetchRunway = async () => {
    const res = await api.get('/budgets/runway')
    setRunway(res.data)
  }

  useEffect(() => {
    fetchBudgets()
    fetchRunway()
  }, [month])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/budgets/', { ...form, limit: parseFloat(form.limit), month })
      setForm({ category: 'Food', limit: '', month })
      setShowForm(false)
      setMessage('Budget created')
      setTimeout(() => setMessage(''), 3000)
      fetchBudgets()
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Error creating budget')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    await api.delete(`/budgets/${id}`)
    fetchBudgets()
  }

  const fmt = (n) => `₹${Number(n).toLocaleString('en-IN')}`

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">

        <div>
          <h1 className="text-2xl font-bold text-white">Budget Management</h1>
          <p className="text-slate-400 text-sm mt-1">Set limits, track usage, and monitor your financial runway</p>
        </div>

        {/* Days to Broke — signature metric */}
        {runway && (() => {
          const cfg = burnStatusConfig[runway.burn_status]
          return (
            <div className={`border rounded-2xl p-6 ${cfg.bg}`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="text-slate-400 text-sm">Days-to-Broke</p>
                  <div className="flex items-end gap-3 mt-1">
                    <span className={`text-6xl font-bold ${cfg.color}`}>
                      {runway.days_to_broke}
                    </span>
                    <span className="text-slate-400 text-lg mb-2">days</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.color} bg-white/5`}>
                    {cfg.label}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-right">
                  {[
                    { label: 'Balance',     value: fmt(runway.balance),       color: runway.balance >= 0 ? 'text-emerald-400' : 'text-red-400' },
                    { label: 'Daily burn',  value: fmt(runway.daily_burn),    color: 'text-amber-400' },
                    { label: 'Days left',   value: `${runway.days_remaining} days`, color: 'text-slate-300' },
                    { label: 'Projected',   value: fmt(runway.projected_balance), color: runway.projected_balance >= 0 ? 'text-emerald-400' : 'text-red-400' },
                  ].map(({ label, value, color }) => (
                    <div key={label}>
                      <p className="text-slate-500 text-xs">{label}</p>
                      <p className={`font-semibold text-sm ${color}`}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })()}

        {/* Month selector + add button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <label className="text-slate-400 text-sm">Month</label>
            <input
              type="month"
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {showForm ? 'Cancel' : '+ Set budget'}
          </button>
        </div>

        {message && (
          <div className="bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 rounded-xl px-4 py-3 text-sm">
            {message}
          </div>
        )}

        {/* Add budget form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-wrap gap-4 items-end">
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Category</label>
              <select
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
              >
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Monthly limit (₹)</label>
              <input
                type="number"
                required
                value={form.limit}
                onChange={e => setForm({ ...form, limit: e.target.value })}
                className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 w-40"
                placeholder="5000"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              {loading ? 'Saving...' : 'Set budget'}
            </button>
          </form>
        )}

        {/* Budget cards */}
        {budgets.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
            No budgets set for {month}. Add one above.
          </div>
        ) : (
          <div className="space-y-4">
            {budgets.map(b => {
              const cfg = statusColor[b.status]
              return (
                <div key={b.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <p className="text-white font-medium">{b.category}</p>
                      {b.status !== 'ok' && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.badge}`}>
                          {b.status === 'danger' ? 'Over budget' : 'Warning'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-sm font-semibold ${cfg.text}`}>
                        {fmt(b.spent)} / {fmt(b.limit)}
                      </span>
                      <button
                        onClick={() => handleDelete(b.id)}
                        className="text-slate-600 hover:text-red-400 text-xs transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="bg-slate-800 rounded-full h-2 mb-2">
                    <div
                      className={`${cfg.bar} h-2 rounded-full transition-all duration-500`}
                      style={{ width: `${Math.min(b.percentage, 100)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{b.percentage}% used</span>
                    <span>
                      {b.remaining >= 0
                        ? `${fmt(b.remaining)} remaining`
                        : `${fmt(Math.abs(b.remaining))} over limit`}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}