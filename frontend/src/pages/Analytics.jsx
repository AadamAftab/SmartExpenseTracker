import { useState, useEffect } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Cell, Legend
} from 'recharts'
import api from '../api/axios'
import Navbar from '../components/Navbar'

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899']

const StatCard = ({ label, value, sub, color = 'text-white' }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
    <p className="text-slate-400 text-sm">{label}</p>
    <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
    {sub && <p className="text-xs mt-1 text-slate-500">{sub}</p>}
  </div>
)

const SectionTitle = ({ title, sub }) => (
  <div className="mb-4">
    <h2 className="text-white font-semibold text-lg">{title}</h2>
    {sub && <p className="text-slate-400 text-sm mt-0.5">{sub}</p>}
  </div>
)

export default function Analytics() {
  const [summary,    setSummary]    = useState(null)
  const [trend,      setTrend]      = useState([])
  const [merchants,  setMerchants]  = useState([])
  const [daily,      setDaily]      = useState([])
  const [weekend,    setWeekend]    = useState(null)
  const [subs,       setSubs]       = useState([])
  const [catTrend,   setCatTrend]   = useState([])
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    const load = async () => {
      const [s, t, m, d, w, su, ct] = await Promise.all([
        api.get('/analytics/summary'),
        api.get('/analytics/monthly-trend'),
        api.get('/analytics/top-merchants'),
        api.get('/analytics/daily-pattern'),
        api.get('/analytics/weekend-vs-weekday'),
        api.get('/analytics/subscriptions'),
        api.get('/analytics/category-trend'),
      ])
      setSummary(s.data)
      setTrend(t.data)
      setMerchants(m.data)
      setDaily(d.data)
      setWeekend(w.data)
      setSubs(su.data)
      setCatTrend(ct.data)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <div className="flex items-center justify-center h-96 text-slate-400">Loading analytics...</div>
    </div>
  )

  const fmt = (n) => `₹${Number(n).toLocaleString('en-IN')}`
  const pctColor = (n) => n > 0 ? 'text-red-400' : n < 0 ? 'text-emerald-400' : 'text-slate-400'
  const pctLabel = (n) => n > 0 ? `▲ ${n}% vs last month` : n < 0 ? `▼ ${Math.abs(n)}% vs last month` : 'No change'

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-10">

        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-slate-400 text-sm mt-1">Deep dive into your spending patterns</p>
        </div>

        {/* Month comparison */}
        {summary && (
          <>
            <div>
              <SectionTitle title="This month vs last month" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                  label="Income"
                  value={fmt(summary.this_month.income)}
                  sub={pctLabel(summary.changes.income)}
                  color={pctColor(-summary.changes.income)}
                />
                <StatCard
                  label="Expenses"
                  value={fmt(summary.this_month.expense)}
                  sub={pctLabel(summary.changes.expense)}
                  color={pctColor(summary.changes.expense)}
                />
                <StatCard
                  label="Savings"
                  value={fmt(summary.this_month.savings)}
                  sub={pctLabel(summary.changes.savings)}
                  color={summary.this_month.savings >= 0 ? 'text-emerald-400' : 'text-red-400'}
                />
              </div>
            </div>
          </>
        )}

        {/* Monthly trend */}
        {trend.length > 0 && (
          <div>
            <SectionTitle title="6-month trend" sub="Income vs expenses over time" />
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trend}>
                  <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip
                    formatter={(v) => fmt(v)}
                    contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8 }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="income"  stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="savings" stroke="#3b82f6" strokeWidth={2} dot={false} strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Top merchants */}
        {merchants.length > 0 && (
          <div>
            <SectionTitle title="Top merchants" sub="Where most of your money goes" />
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    {['Merchant', 'Category', 'Transactions', 'Avg spend', 'Total'].map(h => (
                      <th key={h} className="text-left px-5 py-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {merchants.map((m, i) => (
                    <tr key={m.merchant} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                      <td className="px-5 py-3 text-white flex items-center gap-2">
                        <span className="text-slate-600 text-xs w-4">{i + 1}</span>
                        {m.merchant}
                      </td>
                      <td className="px-5 py-3">
                        <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-xs">{m.category}</span>
                      </td>
                      <td className="px-5 py-3 text-slate-400">{m.count}×</td>
                      <td className="px-5 py-3 text-slate-300">{fmt(m.avg)}</td>
                      <td className="px-5 py-3 text-red-400 font-medium">{fmt(m.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Daily pattern + weekend vs weekday */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {daily.length > 0 && (
            <div>
              <SectionTitle title="Spend by day" sub="Which days cost most" />
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={daily}>
                    <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 10 }}
                      tickFormatter={d => d.slice(0, 3)} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip
                      formatter={(v) => fmt(v)}
                      contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8 }}
                    />
                    <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                      {daily.map((_, i) => (
                        <Cell key={i} fill={i >= 5 ? '#f59e0b' : '#3b82f6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-slate-500 mt-2 text-center">
                  Blue = weekday · Amber = weekend
                </p>
              </div>
            </div>
          )}

          {weekend && (
            <div>
              <SectionTitle title="Weekend vs weekday" sub="Average spend per transaction" />
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                {[
                  { label: 'Weekday avg',  value: weekend.weekday.avg,  count: weekend.weekday.count,  color: 'bg-blue-500' },
                  { label: 'Weekend avg',  value: weekend.weekend.avg,  count: weekend.weekend.count,  color: 'bg-amber-500' },
                ].map(({ label, value, count, color }) => (
                  <div key={label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-400">{label}</span>
                      <span className="text-white font-medium">{fmt(value)}</span>
                    </div>
                    <div className="bg-slate-800 rounded-full h-2">
                      <div
                        className={`${color} h-2 rounded-full transition-all`}
                        style={{ width: `${Math.min((value / Math.max(weekend.weekday.avg, weekend.weekend.avg)) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{count} transactions</p>
                  </div>
                ))}
                <p className="text-xs text-slate-500 pt-2 border-t border-slate-800">
                  {weekend.weekend.avg > weekend.weekday.avg
                    ? `You spend ${fmt(weekend.weekend.avg - weekend.weekday.avg)} more per transaction on weekends`
                    : `You spend ${fmt(weekend.weekday.avg - weekend.weekend.avg)} more per transaction on weekdays`}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Subscriptions */}
        {subs.length > 0 && (
          <div>
            <SectionTitle title="Detected subscriptions" sub="Recurring payments detected in your history" />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {subs.map(s => (
                <div key={s.merchant} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white font-medium">{s.merchant}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{s.category}</p>
                    </div>
                    <span className="bg-purple-500/20 text-purple-400 text-xs px-2 py-0.5 rounded-full">
                      recurring
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-white mt-3">{fmt(s.avg_amount)}<span className="text-slate-500 text-sm font-normal">/mo</span></p>
                  <p className="text-slate-500 text-xs mt-1">{s.months_seen} months · {fmt(s.total_spent)} total</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}