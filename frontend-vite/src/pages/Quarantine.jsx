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
        
        // ✅ Fixed: Remove /api/v1 prefix (it's already in api.js baseURL)
        const res = await api.get("/quarantine")
        
        console.log("✅ Quarantine data:", res.data)
        setEmails(res.data || [])
      } catch (err) {
        console.error("❌ Failed to fetch quarantine data:", err)
        setError(err.response?.data?.error || "Failed to load quarantine data")
      } finally {
        setLoading(false)
      }
    }
    fetchQuarantine()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* NO HEADER - It's in App.jsx */}
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
        {/* NO HEADER */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-red-800 font-semibold mb-2">Error Loading Quarantine</h3>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* NO HEADER - Global Header is in App.jsx */}

      {/* Page Title */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold text-gray-900">Quarantine</h1>
        <p className="text-gray-600 mt-1">
          Suspicious or flagged emails quarantined for review.
        </p>
      </div>

      {/* Content Section */}
      <div className="max-w-7xl mx-auto px-4 pb-10">
        <div className="bg-white rounded-lg shadow overflow-x-auto">
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
              {emails.length > 0 ? (
                emails.map((email, idx) => (
                  <tr key={idx} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-800">{email.sender || 'Unknown'}</td>
                    <td className="px-4 py-3 text-sm text-gray-800">{email.subject || 'No subject'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 text-xs rounded-full font-medium ${
                          email.threat_level === 'critical' ? 'bg-red-100 text-red-600' :
                          email.threat_level === 'high' ? 'bg-orange-100 text-orange-600' :
                          email.threat_level === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                          'bg-green-100 text-green-600'
                        }`}
                      >
                        {email.threat_level || 'unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {email.quarantined_at ? new Date(email.quarantined_at).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium mr-3">
                        Release
                      </button>
                      <button className="text-red-600 hover:text-red-800 text-sm font-medium">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="5"
                    className="px-4 py-8 text-center text-gray-500 text-sm"
                  >
                    <div className="flex flex-col items-center">
                      <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <p className="font-medium">No quarantined emails found</p>
                      <p className="text-xs mt-1">Suspicious emails will appear here</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}