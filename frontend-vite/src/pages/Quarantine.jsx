import React, { useEffect, useState } from "react"
import { api } from "../api"
import { AlertTriangle, CheckCircle, Trash2, Unlock } from "lucide-react"

export default function Quarantine() {
  const [emails, setEmails] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchQuarantine()
  }, [])

  async function fetchQuarantine() {
    try {
      setLoading(true)
      setError(null)
      
      // Log the full URL being called
      console.log("🔍 Calling quarantine endpoint...")
      const res = await api.get("/quarantine")
      
      console.log("✅ Quarantine data:", res.data)
      console.log("✅ Response status:", res.status)
      setEmails(res.data || [])
    } catch (err) {
      console.error("❌ Failed to fetch quarantine data:", err)
      console.error("❌ Error response:", err.response)
      console.error("❌ Error status:", err.response?.status)
      console.error("❌ Error data:", err.response?.data)
      setError(err.response?.data?.error || err.message || "Failed to load quarantine data")
    } finally {
      setLoading(false)
    }
  }

  const handleRelease = async (emailId) => {
    try {
      const res = await api.post(`/quarantine/${emailId}/release`)
      
      // Show success message
      alert(res.data.message || "Email released successfully")
      
      // Remove from list
      setEmails(emails.filter(e => e.id !== emailId))
    } catch (err) {
      console.error("Failed to release email:", err)
      alert(err.response?.data?.error || "Failed to release email")
    }
  }

  const handleDelete = async (emailId) => {
    if (!confirm("Are you sure you want to permanently delete this email?")) return
    
    try {
      const res = await api.delete(`/quarantine/${emailId}`)
      
      // Show success message
      alert(res.data.message || "Email deleted successfully")
      
      // Remove from list
      setEmails(emails.filter(e => e.id !== emailId))
    } catch (err) {
      console.error("Failed to delete email:", err)
      alert(err.response?.data?.error || "Failed to delete email")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading quarantine...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-red-800 font-semibold mb-2">Error Loading Quarantine</h3>
                <p className="text-red-600 mb-4">{error}</p>
                <button
                  onClick={fetchQuarantine}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Quarantine</h1>
          <p className="text-gray-600 mt-1">
            Suspicious or flagged emails quarantined for review ({emails.length} total)
          </p>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {emails.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-700">Sender</th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-700">Subject</th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-700">Threat Level</th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-700">Confidence</th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-700">Reason</th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-700">Date</th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {emails.map((email) => (
                    <tr key={email.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-800 font-medium">{email.sender || 'Unknown'}</div>
                        {email.recipient && (
                          <div className="text-xs text-gray-500">To: {email.recipient}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-800">{email.subject || 'No subject'}</div>
                        {email.body && (
                          <div className="text-xs text-gray-500 mt-1 truncate max-w-xs">{email.body}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 text-xs rounded-full font-medium inline-flex items-center gap-1 ${
                            email.threat_level === 'critical' || email.threat_level === 'high'
                              ? 'bg-red-100 text-red-700'
                              : email.threat_level === 'medium'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-orange-100 text-orange-700'
                          }`}
                        >
                          <AlertTriangle className="w-3 h-3" />
                          {email.threat_level || 'unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700 font-medium">
                          {email.confidence_score 
                            ? `${(email.confidence_score * 100).toFixed(1)}%`
                            : 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-600">
                          {email.reason || 'Suspicious content'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {email.quarantined_at 
                          ? new Date(email.quarantined_at).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleRelease(email.id)}
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
                            title="Release from quarantine"
                          >
                            <Unlock className="w-4 h-4" />
                            Release
                          </button>
                          <button 
                            onClick={() => handleDelete(email.id)}
                            className="inline-flex items-center gap-1 text-red-600 hover:text-red-800 text-sm font-medium transition-colors"
                            title="Permanently delete"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-4 py-16 text-center">
              <div className="flex flex-col items-center">
                <div className="bg-green-100 p-4 rounded-full mb-4">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
                <p className="text-gray-700 font-medium text-lg">No quarantined emails found</p>
                <p className="text-gray-500 text-sm mt-2">Suspicious emails will appear here when detected</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}