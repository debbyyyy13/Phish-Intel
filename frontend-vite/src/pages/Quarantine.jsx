import React, { useEffect, useState } from "react"
import Header from "../components/Header"
import client from "../api"

export default function Quarantine() {
  const [emails, setEmails] = useState([])

  useEffect(() => {
    async function fetchQuarantine() {
      try {
        const res = await client.get("/api/v1/quarantine")
        setEmails(res.data || [])
      } catch (err) {
        console.error("Failed to fetch quarantine data:", err)
      }
    }
    fetchQuarantine()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Global Header */}
      <Header />

      {/* Page Title */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold text-[#07143a]">Quarantine</h1>
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
                <th className="px-4 py-2 text-sm font-semibold text-gray-700">Sender</th>
                <th className="px-4 py-2 text-sm font-semibold text-gray-700">Subject</th>
                <th className="px-4 py-2 text-sm font-semibold text-gray-700">Date</th>
                <th className="px-4 py-2 text-sm font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {emails.length > 0 ? (
                emails.map((email, idx) => (
                  <tr key={idx} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-800">{email.sender}</td>
                    <td className="px-4 py-2 text-sm text-gray-800">{email.subject}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {new Date(email.date).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          email.status === "flagged"
                            ? "bg-red-100 text-red-600"
                            : "bg-green-100 text-green-600"
                        }`}
                      >
                        {email.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="4"
                    className="px-4 py-6 text-center text-gray-500 text-sm"
                  >
                    No quarantined emails found.
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
