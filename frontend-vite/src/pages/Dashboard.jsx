import React, { useEffect, useState } from "react"
import { api } from "../api"
import { useAuth } from "../contexts/AuthContext"
import { 
  Shield, 
  Mail, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp,
  Activity,
  Clock,
  BarChart3
} from "lucide-react"
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

const Dashboard = () => {
  const { user } = useAuth()
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await api.get("/dashboard")
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
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Activity className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">No data available</p>
      </div>
    )
  }

  // Mock data for visualizations
  const weeklyTrends = [
    { day: 'Mon', scanned: 45, threats: 8, safe: 37 },
    { day: 'Tue', scanned: 52, threats: 12, safe: 40 },
    { day: 'Wed', scanned: 38, threats: 5, safe: 33 },
    { day: 'Thu', scanned: 61, threats: 15, safe: 46 },
    { day: 'Fri', scanned: 48, threats: 9, safe: 39 },
    { day: 'Sat', scanned: 22, threats: 3, safe: 19 },
    { day: 'Sun', scanned: 18, threats: 2, safe: 16 }
  ]

  const threatDistribution = [
    { name: 'Phishing', value: 45, color: '#ef4444' },
    { name: 'Spam', value: 30, color: '#f59e0b' },
    { name: 'Malware', value: 15, color: '#8b5cf6' },
    { name: 'Safe', value: 10, color: '#10b981' }
  ]

  const detectionAccuracy = [
    { month: 'Jan', accuracy: 96 },
    { month: 'Feb', accuracy: 97 },
    { month: 'Mar', accuracy: 98 },
    { month: 'Apr', accuracy: 97 },
    { month: 'May', accuracy: 99 },
    { month: 'Jun', accuracy: 99 }
  ]

  const stats = [
    {
      title: "Total Scans",
      value: dashboardData.total_reports || "0",
      icon: <Mail className="w-6 h-6" />,
      color: "bg-blue-500",
      trend: "+12%"
    },
    {
      title: "Threats Blocked",
      value: dashboardData.threats_blocked || dashboardData.threats_detected || "0",
      icon: <Shield className="w-6 h-6" />,
      color: "bg-red-500",
      trend: "-8%"
    },
    {
      title: "Safe Emails",
      value: dashboardData.safe_emails || "0",
      icon: <CheckCircle className="w-6 h-6" />,
      color: "bg-green-500",
      trend: "+15%"
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.name || "User"} 👋
          </h1>
          <p className="text-gray-600 mt-2">
            Here's what's happening with your email security today
          </p>
        </div>

        {/* Stats Grid - 3 cards instead of 4 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.color} text-white p-3 rounded-lg`}>
                  {stat.icon}
                </div>
                <span className="text-sm font-semibold text-green-600">{stat.trend}</span>
              </div>
              <h3 className="text-gray-600 text-sm font-medium mb-1">{stat.title}</h3>
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Weekly Activity Chart */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Weekly Activity</h2>
              <BarChart3 className="w-5 h-5 text-gray-400" />
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Legend />
                <Bar dataKey="threats" fill="#ef4444" name="Threats" radius={[8, 8, 0, 0]} />
                <Bar dataKey="safe" fill="#10b981" name="Safe" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Threat Distribution */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Threat Distribution</h2>
              <AlertTriangle className="w-5 h-5 text-gray-400" />
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={threatDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {threatDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Detection Accuracy Trend */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Detection Accuracy</h2>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={detectionAccuracy}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" domain={[90, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  formatter={(value) => `${value}%`}
                />
                <Line 
                  type="monotone" 
                  dataKey="accuracy" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
              <Clock className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="bg-red-100 p-2 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Phishing Blocked</p>
                  <p className="text-xs text-gray-500">2 minutes ago</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Email Verified Safe</p>
                  <p className="text-xs text-gray-500">15 minutes ago</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Shield className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Model Retrained</p>
                  <p className="text-xs text-gray-500">1 hour ago</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-yellow-100 p-2 rounded-lg">
                  <Mail className="w-4 h-4 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Spam Detected</p>
                  <p className="text-xs text-gray-500">2 hours ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">System Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <Activity className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">ML Model Status</p>
                <p className="font-semibold text-green-600">Active</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Last Scan</p>
                <p className="font-semibold text-gray-900">
                  {dashboardData.last_scan 
                    ? new Date(dashboardData.last_scan).toLocaleString()
                    : "N/A"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-purple-100 p-3 rounded-lg">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Protection Level</p>
                <p className="font-semibold text-purple-600">Maximum</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard