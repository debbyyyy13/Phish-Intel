import React, { useState } from 'react';
import { 
  Download, 
  Chrome, 
  Mail, 
  Shield, 
  CheckCircle, 
  ExternalLink,
  ArrowRight,
  Settings,
  BarChart3,
  Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Extension() {
  const [activeTab, setActiveTab] = useState('overview');

  const features = [
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Real-time Detection",
      description: "Monitor incoming emails as they arrive with XGBoost-powered ML detection"
    },
    {
      icon: <Mail className="w-6 h-6" />,
      title: "Email Provider Integration",
      description: "Seamlessly works with Gmail, Outlook, Yahoo Mail and more"
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "AI-Powered Protection",
      description: "Advanced threat detection using trained XGBoost models"
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Dashboard Analytics",
      description: "View all detections and analytics in your PhishGuard dashboard"
    }
  ];

  const installSteps = [
    {
      step: 1,
      title: "Download the Extension",
      description: "Click the download button below to get the PhishGuard extension from the Chrome Web Store",
      action: "Download Now"
    },
    {
      step: 2,
      title: "Install & Enable",
      description: "Click 'Add to Chrome' and confirm the installation. The extension will be added to your browser",
      action: null
    },
    {
      step: 3,
      title: "Sign In",
      description: "Click the PhishGuard icon in your browser toolbar and sign in with your account credentials",
      action: null
    },
    {
      step: 4,
      title: "Grant Permissions",
      description: "Allow PhishGuard to access your email provider for real-time protection",
      action: null
    },
    {
      step: 5,
      title: "Start Protection",
      description: "You're all set! PhishGuard will now monitor your emails and alert you of threats",
      action: "View Dashboard"
    }
  ];

  const supportedProviders = [
    { name: "Gmail", icon: "🔴", supported: true },
    { name: "Outlook", icon: "🔵", supported: true },
    { name: "Yahoo Mail", icon: "🟣", supported: true },
    { name: "ProtonMail", icon: "🟢", supported: "Coming Soon" },
    { name: "Apple Mail", icon: "⚪", supported: "Coming Soon" }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="inline-flex items-center bg-white/20 rounded-full px-4 py-2 mb-6">
              <Chrome className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium">Available on Chrome Web Store</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              PhishGuard Browser Extension
            </h1>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Real-time phishing protection powered by XGBoost ML. Protect your inbox from threats as they arrive.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold hover:bg-blue-50 transition-colors flex items-center justify-center shadow-lg">
                <Download className="w-5 h-5 mr-2" />
                Download for Chrome
              </button>
              <button className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white/10 transition-colors flex items-center justify-center">
                <ExternalLink className="w-5 h-5 mr-2" />
                View on Web Store
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Powerful Features</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center text-blue-600 mb-4">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-600 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Installation Steps */}
      <div className="bg-white py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Easy Installation</h2>
          <div className="space-y-6">
            {installSteps.map((step) => (
              <div key={step.step} className="flex gap-6 items-start">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                    {step.step}
                  </div>
                </div>
                <div className="flex-1 bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-gray-600 mb-4">{step.description}</p>
                  {step.action && (
                    <button className="text-blue-600 font-medium hover:text-blue-700 flex items-center">
                      {step.action}
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Supported Email Providers */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Supported Email Providers</h2>
        <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6">
          {supportedProviders.map((provider, index) => (
            <div key={index} className="bg-white p-6 rounded-xl shadow-sm text-center">
              <div className="text-4xl mb-3">{provider.icon}</div>
              <h3 className="font-semibold mb-2">{provider.name}</h3>
              {provider.supported === true ? (
                <span className="text-green-600 text-sm flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Supported
                </span>
              ) : (
                <span className="text-orange-500 text-sm">{provider.supported}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Monitor Emails</h3>
              <p className="text-gray-300">
                Extension monitors incoming emails in real-time as they arrive in your inbox
              </p>
            </div>
            <div className="text-center">
              <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">AI Analysis</h3>
              <p className="text-gray-300">
                XGBoost ML model analyzes email content, links, and sender reputation instantly
              </p>
            </div>
            <div className="text-center">
              <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">View Analytics</h3>
              <p className="text-gray-300">
                All detections synced to your dashboard for detailed analytics and reporting
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Integration */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 md:p-12">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <h2 className="text-3xl font-bold mb-4">View Analytics in Dashboard</h2>
              <p className="text-gray-700 mb-6">
                All threats detected by the extension are automatically synced to your PhishGuard dashboard. 
                View detailed analytics, threat patterns, and protection statistics all in one place.
              </p>
              <Link 
                to="/dashboard"
                className="inline-flex items-center bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>
            <div className="flex-shrink-0">
              <div className="bg-white p-8 rounded-xl shadow-lg">
                <BarChart3 className="w-24 h-24 text-blue-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div className="border-b pb-6">
              <h3 className="text-lg font-semibold mb-2">Is the extension free?</h3>
              <p className="text-gray-600">
                Yes! The PhishGuard extension is completely free for all users with a PhishGuard account.
              </p>
            </div>
            <div className="border-b pb-6">
              <h3 className="text-lg font-semibold mb-2">Does it work offline?</h3>
              <p className="text-gray-600">
                The extension requires an internet connection to analyze emails and sync with your dashboard.
              </p>
            </div>
            <div className="border-b pb-6">
              <h3 className="text-lg font-semibold mb-2">How accurate is the detection?</h3>
              <p className="text-gray-600">
                Our XGBoost ML model has been trained on millions of emails and achieves 99%+ accuracy in phishing detection.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Is my email data private?</h3>
              <p className="text-gray-600">
                Yes. We only analyze email metadata and content for threat detection. No emails are stored on our servers.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Protect Your Inbox?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Download the PhishGuard extension now and start blocking phishing threats in real-time
          </p>
          <button className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold hover:bg-blue-50 transition-colors inline-flex items-center shadow-lg">
            <Download className="w-5 h-5 mr-2" />
            Download Extension
          </button>
        </div>
      </div>
    </div>
  );
}