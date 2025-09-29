import React, { useEffect, useState } from "react"
import { api } from "../api"
import { useAuth } from "../contexts/AuthContext"

const Dashboard = () => {
  const { user } = useAuth()
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await api.get("/dashboard") // ✅ relative path only
        setDashboardData(res.data)
      } catch (err) {
        console.error("❌ Failed to fetch dashboard data:", err.response?.data || err.message)
        setError("Failed to load dashboard data")
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  if (loading) {
    return <div className="text-center p-6">Loading dashboard...</div>
  }

  if (error) {
    return <div className="text-center text-red-500 p-6">{error}</div>
  }

  if (!dashboardData) {
    return <div className="text-center p-6">No data available</div>
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Welcome back, {user?.name || "User"} 👋</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="p-4 border rounded shadow">
          <h2 className="font-semibold text-lg">Total Reports</h2>
          <p className="text-2xl">{dashboardData.total_reports}</p>
        </div>

        <div className="p-4 border rounded shadow">
          <h2 className="font-semibold text-lg">Active Users</h2>
          <p className="text-2xl">{dashboardData.active_users}</p>
        </div>

        <div className="p-4 border rounded shadow">
          <h2 className="font-semibold text-lg">Last Scan</h2>
          <p>{dashboardData.last_scan || "N/A"}</p>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
