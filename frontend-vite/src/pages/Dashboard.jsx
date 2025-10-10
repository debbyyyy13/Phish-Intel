import React, { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { 
  Shield, 
  Mail, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp,
  Activity
} from "lucide-react";

const Dashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        setLoading(true);
        setError(null);
        
        console.log("📊 Fetching dashboard data...");
        const res = await api.get("/dashboard");
        
        console.log("✅ Dashboard response:", res.data);
        setDashboardData(res.data);
      } catch (err) {
        console.error("❌ Failed to fetch dashboard data:", {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status
        });
        setError(err.response?.data?.error || err.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400 text-lg">Loading dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              <div>
                <h3 className="text-red-800 dark:text-red-400 font-semibold text-lg">Error Loading Dashboard</h3>
                <p className="text-red-600 dark:text-red-300 mt-1">{error}</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default data if API returns null/empty
  const data = dashboardData || {
    total_reports: 0,
    active_users: 0,
    last_scan: null,
    threats_detected: 0,
    safe_emails: 0
  };

  const stats = [
    {
      icon: <Mail className="w-8 h-8" />,
      label: "Total Reports",
      value: data.total_reports || 0,
      color: "blue",
      bgColor: "bg-blue-100 dark:bg-blue-900/20",
      iconColor: "text-blue-600 dark:text-blue-400"
    },
    {
      icon: <AlertTriangle className="w-8 h-8" />,
      label: "Threats Detected",
      value: data.threats_detected || 0,
      color: "red",
      bgColor: "bg-red-100 dark:bg-red-900/20",
      iconColor: "text-red-600 dark:text-red-400"
    },
    {
      icon: <CheckCircle className="w-8 h-8" />,
      label: "Safe Emails",
      value: data.safe_emails || 0,
      color: "green",
      bgColor: "bg-green-100 dark:bg-green-900/20",
      iconColor: "text-green-600 dark:text-green-400"
    },
    {
      icon: <Activity className="w-8 h-8" />,
      label: "Active Users",
      value: data.active_users || 0,
      color: "purple",
      bgColor: "bg-purple-100 dark:bg-purple-900/20",
      iconColor: "text-purple-600 dark:text-purple-400"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome back, {user?.name || "User"}! 👋
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Here's an overview of your phishing protection
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all p-6 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <div className={stat.iconColor}>{stat.icon}</div>
                </div>
                <TrendingUp className="w-5 h-5 text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Last Scan Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3 mb-4">
            <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Last Scan</h2>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            {data.last_scan ? new Date(data.last_scan).toLocaleString() : "No scans yet"}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-xl p-6 text-white">
            <h3 className="text-xl font-semibold mb-2">Scan an Email</h3>
            <p className="text-blue-100 mb-4">Submit suspicious emails for analysis</p>
            <button 
              onClick={() => window.location.href = '/submit'}
              className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
            >
              Submit Now
            </button>
          </div>

          <div className="bg-gradient-to-r from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700 rounded-xl p-6 text-white">
            <h3 className="text-xl font-semibold mb-2">View Quarantine</h3>
            <p className="text-purple-100 mb-4">Check quarantined threats</p>
            <button 
              onClick={() => window.location.href = '/quarantine'}
              className="px-4 py-2 bg-white text-purple-600 rounded-lg hover:bg-purple-50 transition-colors font-medium"
            >
              View Quarantine
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;