import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Mail, 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  Settings,
  BarChart3,
  Lock,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  RefreshCw
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// API service for dashboard data
const DashboardAPI = {
  baseURL: 'http://localhost:5000/api/v1',
  
  async getDashboardData() {
    try {
      const response = await fetch(`${this.baseURL}/analytics/dashboard`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Transform API response to match expected structure
      return {
        summary: {
          total_emails: data.summary?.total_emails || 0,
          phishing_detected: data.summary?.phishing_detected || 0,
          legitimate_emails: data.summary?.legitimate_emails || 0,
          emails_quarantined: data.summary?.emails_quarantined || 0,
          detection_rate_percentage: data.summary?.detection_rate_percentage || 0,
          avg_confidence_score: data.summary?.avg_confidence_score || 0,
          avg_processing_time_ms: data.summary?.avg_processing_time_ms || 0
        },
        threat_levels: {
          low: data.threat_levels?.low || 0,
          medium: data.threat_levels?.medium || 0,
          high: data.threat_levels?.high || 0,
          critical: data.threat_levels?.critical || 0
        },
        daily_trends: data.daily_trends || [],
        recent_quarantine: data.recent_quarantine || []
      };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      return this.getFallbackData();
    }
  },
  
  getFallbackData() {
    // Fallback data if API fails
    return {
      summary: {
        total_emails: 1247,
        phishing_detected: 89,
        legitimate_emails: 1158,
        emails_quarantined: 76,
        detection_rate_percentage: 7.14,
        avg_confidence_score: 0.847,
        avg_processing_time_ms: 23.4
      },
      threat_levels: {
        low: 45,
        medium: 23,
        high: 15,
        critical: 6
      },
      daily_trends: [
        { date: '2024-03-01', total_emails: 45, phishing_emails: 3, legitimate_emails: 42 },
        { date: '2024-03-02', total_emails: 52, phishing_emails: 7, legitimate_emails: 45 },
        { date: '2024-03-03', total_emails: 38, phishing_emails: 2, legitimate_emails: 36 },
        { date: '2024-03-04', total_emails: 61, phishing_emails: 9, legitimate_emails: 52 },
        { date: '2024-03-05', total_emails: 43, phishing_emails: 4, legitimate_emails: 39 },
        { date: '2024-03-06', total_emails: 56, phishing_emails: 6, legitimate_emails: 50 },
        { date: '2024-03-07', total_emails: 48, phishing_emails: 5, legitimate_emails: 43 }
      ],
      recent_quarantine: [
        {
          id: 1,
          sender: 'security@paypaI.com',
          subject: 'Account Verification Required',
          threat_level: 'high',
          confidence_score: 0.94,
          quarantined_at: '2024-03-07T10:30:00'
        },
        {
          id: 2,
          sender: 'support@amazom.com',
          subject: 'Urgent: Payment Issue',
          threat_level: 'critical',
          confidence_score: 0.98,
          quarantined_at: '2024-03-07T09:15:00'
        }
      ]
    };
  }
};

const PhishGuardDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState({ 
    name: 'John Doe', 
    email: 'john@example.com', 
    subscription: 'Professional',
    avatar: 'JD'
  });

  // Fetch data on component mount and set up auto-refresh
  useEffect(() => {
    fetchDashboardData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      if (!loading && !error) {
        fetchDashboardData();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [loading, error]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await DashboardAPI.getDashboardData();
      setDashboardData(data);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard data fetch error:', err);
      
      // Use fallback data
      const fallbackData = DashboardAPI.getFallbackData();
      setDashboardData(fallbackData);
    } finally {
      setLoading(false);
    }
  };

  // Refresh data function
  const refreshData = () => {
    fetchDashboardData();
  };

  const StatCard = ({ icon: Icon, title, value, change, changeType, color }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {change && (
            <p className={`text-sm mt-1 flex items-center ${changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
              <TrendingUp className={`w-4 h-4 mr-1 ${changeType === 'negative' ? 'rotate-180' : ''}`} />
              {change}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  const ThreatLevelChart = ({ data }) => {
    const chartData = Object.entries(data).map(([level, count]) => ({
      name: level.charAt(0).toUpperCase() + level.slice(1),
      value: count,
      color: {
        low: '#10B981',
        medium: '#F59E0B', 
        high: '#EF4444',
        critical: '#DC2626'
      }[level]
    }));

    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            label={({ name, value }) => `${name}: ${value}`}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  const EmailTrendsChart = ({ data }) => (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Area
          type="monotone"
          dataKey="total_emails"
          stackId="1"
          stroke="#3B82F6"
          fill="#3B82F6"
          fillOpacity={0.3}
        />
        <Area
          type="monotone"
          dataKey="phishing_emails"
          stackId="1"
          stroke="#EF4444"
          fill="#EF4444"
          fillOpacity={0.8}
        />
      </AreaChart>
    </ResponsiveContainer>
  );

  const QuarantineTable = ({ data }) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-medium text-gray-700">Sender</th>
            <th className="text-left py-3 px-4 font-medium text-gray-700">Subject</th>
            <th className="text-left py-3 px-4 font-medium text-gray-700">Threat Level</th>
            <th className="text-left py-3 px-4 font-medium text-gray-700">Confidence</th>
            <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((email) => (
            <tr key={email.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-4 font-medium">{email.sender}</td>
              <td className="py-3 px-4 text-gray-600 truncate max-w-xs">{email.subject}</td>
              <td className="py-3 px-4">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  email.threat_level === 'critical' ? 'bg-red-100 text-red-800' :
                  email.threat_level === 'high' ? 'bg-orange-100 text-orange-800' :
                  email.threat_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {email.threat_level}
                </span>
              </td>
              <td className="py-3 px-4">{(email.confidence_score * 100).toFixed(1)}%</td>
              <td className="py-3 px-4">
                <button className="text-blue-600 hover:text-blue-800 mr-2">Release</button>
                <button className="text-red-600 hover:text-red-800">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const TrainingModule = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white p-6">
        <h2 className="text-2xl font-bold mb-2">Security Awareness Training</h2>
        <p className="text-blue-100 mb-4">Improve your phishing detection skills with interactive modules</p>
        <button className="bg-white text-blue-600 px-6 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors">
          Start Training
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { title: 'Email Basics', progress: 100, status: 'completed' },
          { title: 'Phishing Techniques', progress: 75, status: 'in_progress' },
          { title: 'Advanced Threats', progress: 0, status: 'locked' }
        ].map((module, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-lg mb-2">{module.title}</h3>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${module.progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mb-4">{module.progress}% Complete</p>
            <button 
              className={`w-full py-2 px-4 rounded-lg font-medium ${
                module.status === 'completed' ? 'bg-green-100 text-green-800' :
                module.status === 'in_progress' ? 'bg-blue-600 text-white hover:bg-blue-700' :
                'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              disabled={module.status === 'locked'}
            >
              {module.status === 'completed' ? 'Completed' :
               module.status === 'in_progress' ? 'Continue' : 'Locked'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const AdminPanel = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Users}
          title="Active Users"
          value="1,247"
          change="+12% from last month"
          changeType="positive"
          color="bg-blue-600"
        />
        <StatCard
          icon={Shield}
          title="System Accuracy"
          value="97.8%"
          change="+0.3% from last week"
          changeType="positive"
          color="bg-green-600"
        />
        <StatCard
          icon={AlertTriangle}
          title="False Positives"
          value="23"
          change="-15% from last week"
          changeType="positive"
          color="bg-orange-600"
        />
        <StatCard
          icon={Clock}
          title="Avg Response Time"
          value="23ms"
          change="-5ms from last week"
          changeType="positive"
          color="bg-purple-600"
        />
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold mb-4">System Health</h3>
        <div className="space-y-4">
          {[
            { service: 'API Server', status: 'healthy', uptime: '99.9%' },
            { service: 'ML Engine', status: 'healthy', uptime: '99.8%' },
            { service: 'Database', status: 'healthy', uptime: '100%' },
            { service: 'Redis Cache', status: 'warning', uptime: '98.5%' }
          ].map((service, index) => (
            <div key={index} className="flex items-center justify-between py-2">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-3 ${
                  service.status === 'healthy' ? 'bg-green-500' : 'bg-yellow-500'
                }`}></div>
                <span className="font-medium">{service.service}</span>
              </div>
              <span className="text-sm text-gray-600">{service.uptime} uptime</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-gray-600">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  // Error state with retry option
  if (error && !dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Unable to Load Dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={refreshData}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Shield className="w-8 h-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">PhishGuard</h1>
            </div>
            
            <nav className="hidden md:flex space-x-8">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
                { id: 'quarantine', label: 'Quarantine', icon: Lock },
                { id: 'training', label: 'Training', icon: Users },
                { id: 'admin', label: 'Admin', icon: Settings }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
            
            <div className="flex items-center space-x-3">
              {error && (
                <span className="text-sm text-red-600">Data may be outdated</span>
              )}
              <button 
                onClick={refreshData}
                className="p-2 rounded-lg hover:bg-gray-100"
                title="Refresh data"
                disabled={loading}
              >
                <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button className="p-2 rounded-lg hover:bg-gray-100">
                <Download className="w-5 h-5 text-gray-600" />
              </button>
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {user.avatar}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                icon={Mail}
                title="Total Emails"
                value={dashboardData.summary.total_emails.toLocaleString()}
                change="+8% from last week"
                changeType="positive"
                color="bg-blue-600"
              />
              <StatCard
                icon={Shield}
                title="Threats Blocked"
                value={dashboardData.summary.phishing_detected}
                change="+15% from last week"
                changeType="positive"
                color="bg-red-600"
              />
              <StatCard
                icon={CheckCircle}
                title="Detection Rate"
                value={`${dashboardData.summary.detection_rate_percentage.toFixed(1)}%`}
                change="+0.3% from last week"
                changeType="positive"
                color="bg-green-600"
              />
              <StatCard
                icon={Clock}
                title="Avg Process Time"
                value={`${dashboardData.summary.avg_processing_time_ms}ms`}
                change="-2ms from last week"
                changeType="positive"
                color="bg-purple-600"
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold mb-4">Email Trends</h3>
                <EmailTrendsChart data={dashboardData.daily_trends} />
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold mb-4">Threat Level Distribution</h3>
                <ThreatLevelChart data={dashboardData.threat_levels} />
              </div>
            </div>

            {/* Recent Quarantine */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Recent Quarantine</h3>
                <button className="text-blue-600 hover:text-blue-800 font-medium">View All</button>
              </div>
              <QuarantineTable data={dashboardData.recent_quarantine} />
            </div>
          </div>
        )}

        {activeTab === 'quarantine' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-semibold mb-6">Quarantine Management</h2>
            <QuarantineTable data={dashboardData.recent_quarantine} />
          </div>
        )}

        {activeTab === 'training' && <TrainingModule />}
        {activeTab === 'admin' && <AdminPanel />}
      </main>
    </div>
  );
};

export default PhishGuardDashboard;