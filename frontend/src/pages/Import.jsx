import { useState, useEffect } from 'react'
import api from '../api/axios'
import Navbar from '../components/Navbar'

export default function Import() {
  const [file, setFile]         = useState(null)
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState(null)
  const [error, setError]       = useState('')
  const [history, setHistory]   = useState([])
  const [dragging, setDragging] = useState(false)

  const fetchHistory = async () => {
    const res = await api.get('/imports/history')
    setHistory(res.data)
  }

  useEffect(() => { fetchHistory() }, [])

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await api.post('/imports/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setResult(res.data)
      fetchHistory()
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) setFile(dropped)
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">

        <div>
          <h1 className="text-2xl font-bold text-white">Import Statement</h1>
          <p className="text-slate-400 text-sm mt-1">Upload a CSV or PDF bank statement to auto-import transactions</p>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-input').click()}
          className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors
            ${dragging ? 'border-emerald-400 bg-emerald-400/5' : 'border-slate-700 hover:border-slate-500'}`}
        >
          <input
            id="file-input"
            type="file"
            accept=".csv,.pdf"
            className="hidden"
            onChange={e => setFile(e.target.files[0])}
          />
          <div className="text-4xl mb-3">📄</div>
          {file ? (
            <div>
              <p className="text-white font-medium">{file.name}</p>
              <p className="text-slate-400 text-sm mt-1">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          ) : (
            <div>
              <p className="text-slate-300 font-medium">Drop your statement here</p>
              <p className="text-slate-500 text-sm mt-1">or click to browse — CSV or PDF</p>
            </div>
          )}
        </div>

        {/* CSV format hint */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm text-slate-400">
          <p className="text-slate-300 font-medium mb-2">Expected CSV format</p>
          <code className="text-emerald-400 text-xs">Date, Amount, Merchant/Description</code>
          <p className="mt-1 text-xs">Column names are flexible — we auto-detect date, amount, and merchant columns.</p>
        </div>

        {error && (
          <div className="bg-red-400/10 border border-red-400/20 text-red-400 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className="bg-emerald-400/10 border border-emerald-400/20 rounded-xl p-5 space-y-3">
            <p className="text-emerald-400 font-semibold">Import complete</p>
            <div className="grid grid-cols-3 gap-4 text-center">
              {[
                { label: 'Total rows',  value: result.total,      color: 'text-white' },
                { label: 'Imported',    value: result.imported,   color: 'text-emerald-400' },
                { label: 'Duplicates',  value: result.duplicates, color: 'text-amber-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-slate-900 rounded-xl p-3">
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-slate-400 text-xs mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || loading}
          className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-medium py-3 rounded-xl transition-colors"
        >
          {loading ? 'Importing...' : 'Import transactions'}
        </button>

        {/* Import history */}
        {history.length > 0 && (
          <div>
            <h2 className="text-white font-semibold mb-3">Import history</h2>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    {['File', 'Type', 'Imported', 'Duplicates', 'Date'].map(h => (
                      <th key={h} className="text-left px-5 py-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map(h => (
                    <tr key={h.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="px-5 py-3 text-white truncate max-w-[150px]">{h.filename}</td>
                      <td className="px-5 py-3">
                        <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-xs uppercase">{h.file_type}</span>
                      </td>
                      <td className="px-5 py-3 text-emerald-400">{h.imported_rows}</td>
                      <td className="px-5 py-3 text-amber-400">{h.duplicate_rows}</td>
                      <td className="px-5 py-3 text-slate-400">{new Date(h.created_at).toLocaleDateString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}