import React, { useEffect, useState } from "react"
import { api } from "../api"

export default function Quarantine() {
  const [emails, setEmails] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchQuarantine() {
      try {
        setLoading(true)
        setError(null)
        
        // Try the quarantine endpoint
        const res = await api.get("/emails/quarantine")
        
        console.log("✅ Quarantine data:", res.data)
        setEmails(res.data.emails || res.data || [])
      } catch (err) {
        console.error("❌ Failed to fetch quarantine data:", err)
        
        // Check if it's a 404/422 (endpoint doesn't exist)
        if (err.response?.status === 404 || err.response?.status === 422) {
          setError("Quarantine endpoint not yet implemented. Please check your backend routes.")
        } else {
          setError(err.response?.data?.error || err.message || "Failed to load quarantine data")
        }
      } finally {
        setLoading(false)
      }
    }
    fetchQuarantine()
  }, [])

  const handleRelease = async (emailId) => {
    try {
      await api.post(`/emails/quarantine/${emailId}/release`)
      setEmails(emails.filter(e => e.id !== emailId))
    } catch (err) {
      console.error("Failed to release email:", err)
      alert("Failed to release email")
    }
  }

  const handleDelete = async (emailId) => {
    if (!confirm("Are you sure you want to delete this email?")) return
    
    try {
      await api.delete(`/emails/quarantine/${emailId}`)
      setEmails(emails.filter(e => e.id !== emailId))
    } catch (err) {
      console.error("Failed to delete email:", err)
      alert("Failed to delete email")
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
              <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 className="text-red-800 font-semibold mb-2">Error Loading Quarantine</h3>
                <p className="text-red-600 mb-4">{error}</p>
                <button
                  onClick={() => window.location.reload()}
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
            Suspicious or flagged emails quarantined for review.
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
                    <th className="px-4 py-3 text-sm font-semibold text-gray-700">Date</th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {emails.map((email, idx) => (
                    <tr key={email.id || idx} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-800">{email.sender || 'Unknown'}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{email.subject || 'No subject'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 text-xs rounded-full font-medium ${
                            email.threat_level === 'critical' || email.threat_level === 'high'
                              ? 'bg-red-100 text-red-600'
                              : email.threat_level === 'medium'
                              ? 'bg-yellow-100 text-yellow-600'
                              : 'bg-green-100 text-green-600'
                          }`}
                        >
                          {email.threat_level || 'unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {email.quarantined_at 
                          ? new Date(email.quarantined_at).toLocaleString() 
                          : email.created_at 
                          ? new Date(email.created_at).toLocaleString()
                          : 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        <button 
                          onClick={() => handleRelease(email.id)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium mr-3"
                        >
                          Release
                        </button>
                        <button 
                          onClick={() => handleDelete(email.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-4 py-16 text-center">
              <svg className="w-20 h-20 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-gray-700 font-medium text-lg">No quarantined emails found</p>
              <p className="text-gray-500 text-sm mt-2">Suspicious emails will appear here when detected</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}