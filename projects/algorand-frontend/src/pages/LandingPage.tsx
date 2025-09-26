import React from 'react'
import { Link } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'

const LandingPage: React.FC = () => {
  const { activeAddress } = useWallet()

  const features = [
    {
      title: 'Cross-Border Microlending',
      description: 'Revolutionary microlending platform with real-time DID resolution, trust scoring, and Algorand smart contracts.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
          />
        </svg>
      ),
    },
    {
      title: 'Liquid Auth Integration',
      description: 'Secure authentication with Liquid Auth and GoPlausible DID resolution for decentralized identity management.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      ),
    },
    {
      title: 'Algorand Smart Contracts',
      description: 'Built on Algorand blockchain with Python smart contracts, real-time trust scoring, and transparent loan management.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      title: 'Real-Time Trust Scoring',
      description: 'AI-powered trust score calculation based on loan history, repayment patterns, and blockchain verification.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
    },
  ]

  const stats = [
    { label: 'Smart Contracts', value: '3 Deployed' },
    { label: 'Network', value: 'Algorand Testnet' },
    { label: 'DID Resolution', value: 'GoPlausible' },
    { label: 'Trust Score', value: 'Real-time' },
  ]

  const techStack = [
    { name: 'Algorand', description: 'Blockchain Network', color: 'bg-blue-500' },
    { name: 'Python', description: 'Smart Contracts', color: 'bg-yellow-500' },
    { name: 'React', description: 'Frontend', color: 'bg-cyan-500' },
    { name: 'Node.js', description: 'Backend API', color: 'bg-green-500' },
    { name: 'Liquid Auth', description: 'Authentication', color: 'bg-purple-500' },
    { name: 'GoPlausible', description: 'DID Resolution', color: 'bg-pink-500' },
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-blue-50 via-white to-teal-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-100 text-blue-800 text-sm font-medium mb-6">
              🚀 Hackathon MVP - Algorand Cross-Border Microlending
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Cross-Border
              <span className="block bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">Microlending Platform</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Revolutionary microlending platform built on Algorand blockchain with Liquid Auth, GoPlausible DID resolution, and real-time
              trust scoring. Experience the future of decentralized finance.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              {activeAddress ? (
                <Link
                  to="/microlending"
                  className="bg-gradient-to-r from-blue-600 to-teal-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:from-blue-700 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Launch Microlending Platform →
                </Link>
              ) : (
                <Link
                  to="/connect-wallet"
                  className="bg-gradient-to-r from-blue-600 to-teal-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:from-blue-700 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Connect Wallet →
                </Link>
              )}
              <Link
                to="/hackathon-demo"
                className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-lg font-semibold text-lg hover:border-blue-600 hover:text-blue-600 transition-all duration-200"
              >
                View Hackathon Demo
              </Link>
            </div>

            {/* Tech Stack Badges */}
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              {techStack.map((tech, index) => (
                <div key={index} className="flex items-center space-x-2 bg-white rounded-full px-4 py-2 shadow-sm border">
                  <div className={`w-3 h-3 rounded-full ${tech.color}`}></div>
                  <span className="text-sm font-medium text-gray-700">{tech.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-white border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl font-bold text-gray-900 mb-2">{stat.value}</div>
                  <div className="text-gray-600">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Platform Features</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Built on Algorand blockchain with cutting-edge technology for secure, fast, and transparent microlending
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-teal-500 rounded-lg flex items-center justify-center text-white mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Technical Architecture Section */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Technical Architecture</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Full-stack solution with Algorand smart contracts, real-time DID resolution, and AI-powered trust scoring
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">🔗 Smart Contracts</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Python-based Algorand contracts</li>
                <li>• Loan creation and management</li>
                <li>• Real-time trust score updates</li>
                <li>• Transparent repayment tracking</li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-2xl p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">🆔 DID Resolution</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• GoPlausible integration</li>
                <li>• Liquid Auth authentication</li>
                <li>• Decentralized identity management</li>
                <li>• Cross-border verification</li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">🤖 AI Trust Scoring</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Real-time score calculation</li>
                <li>• Loan history analysis</li>
                <li>• Repayment pattern recognition</li>
                <li>• Risk assessment automation</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-600 to-teal-600 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">Ready to Experience the Future of Microlending?</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join the revolution of cross-border microlending with Algorand blockchain, Liquid Auth, and AI-powered trust scoring.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {!activeAddress && (
              <Link
                to="/connect-wallet"
                className="inline-block bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Connect Wallet & Start
              </Link>
            )}
            <Link
              to="/hackathon-demo"
              className="inline-block border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white hover:text-blue-600 transition-all duration-200"
            >
              View Live Demo
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-teal-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">A</span>
                </div>
                <span className="text-xl font-bold">Cross-Border Microlending</span>
              </div>
              <p className="text-gray-400">
                Revolutionary microlending platform built on Algorand blockchain with Liquid Auth and GoPlausible DID resolution.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link to="/microlending" className="hover:text-white transition-colors">
                    Microlending Platform
                  </Link>
                </li>
                <li>
                  <Link to="/hackathon-demo" className="hover:text-white transition-colors">
                    Hackathon Demo
                  </Link>
                </li>
                <li>
                  <Link to="/connect-wallet" className="hover:text-white transition-colors">
                    Connect Wallet
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Technology</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <span className="text-blue-400">Algorand Blockchain</span>
                </li>
                <li>
                  <span className="text-green-400">Python Smart Contracts</span>
                </li>
                <li>
                  <span className="text-purple-400">Liquid Auth</span>
                </li>
                <li>
                  <span className="text-pink-400">GoPlausible DID</span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Hackathon MVP</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <span className="text-yellow-400">🚀 Real-time Trust Scoring</span>
                </li>
                <li>
                  <span className="text-cyan-400">🔗 Smart Contract Integration</span>
                </li>
                <li>
                  <span className="text-orange-400">🆔 DID Resolution</span>
                </li>
                <li>
                  <span className="text-red-400">🤖 AI-Powered Analytics</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Cross-Border Microlending MVP. Built on Algorand blockchain for hackathon demonstration.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LandingPage
