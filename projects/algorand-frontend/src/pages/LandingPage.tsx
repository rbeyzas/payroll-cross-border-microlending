import React from 'react'
import { Link } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'

const LandingPage: React.FC = () => {
  const { activeAddress } = useWallet()

  const features = [
    {
      title: 'Liquid Auth Integration',
      description: 'Secure authentication with Liquid Auth and GoPlausible DID resolution for decentralized identity management.',
      icon: '🔐',
      gradient: 'from-purple-500 to-pink-500',
    },
    {
      title: 'Algorand Smart Contracts',
      description: 'Built on Algorand blockchain with Python smart contracts, real-time trust scoring, and transparent loan management.',
      icon: '⚡',
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'Real-Time Trust Scoring',
      description: 'AI-powered trust score calculation based on loan history, repayment patterns, and blockchain verification.',
      icon: '🤖',
      gradient: 'from-yellow-500 to-orange-500',
    },
  ]

  const stats = [
    { label: 'Smart Contracts', value: '3 Deployed', icon: '🔗' },
    { label: 'Network', value: 'Algorand Testnet', icon: '🌐' },
    { label: 'DID Resolution', value: 'GoPlausible', icon: '🆔' },
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
    <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-blue-500/10"></div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-6xl md:text-8xl font-bold mb-8">
              <span className="block text-white">Cross-Border</span>
              <span className="block bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 bg-clip-text text-transparent animate-pulse">
                Platform
              </span>
              <span className="block text-4xl md:text-5xl text-gray-300 mt-4">Platform</span>
            </h1>

            <p className="text-xl text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed">
              Revolutionary cross-border platform built on Algorand blockchain with Liquid Auth, GoPlausible DID resolution, and real-time
              authentication. Experience the future of decentralized applications.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
              {activeAddress ? (
                <Link
                  to="/payroll"
                  className="group relative bg-gradient-to-r from-green-500 to-blue-500 text-white px-10 py-5 rounded-2xl font-bold text-xl hover:from-green-400 hover:to-blue-400 transition-all duration-300 shadow-2xl hover:shadow-green-500/25 transform hover:scale-105"
                >
                  <span className="relative z-10">Launch Platform →</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-blue-400 rounded-2xl blur opacity-0 group-hover:opacity-75 transition-opacity duration-300"></div>
                </Link>
              ) : (
                <Link
                  to="/connect-wallet"
                  className="group relative bg-gradient-to-r from-green-500 to-blue-500 text-white px-10 py-5 rounded-2xl font-bold text-xl hover:from-green-400 hover:to-blue-400 transition-all duration-300 shadow-2xl hover:shadow-green-500/25 transform hover:scale-105"
                >
                  <span className="relative z-10">Connect Wallet →</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-blue-400 rounded-2xl blur opacity-0 group-hover:opacity-75 transition-opacity duration-300"></div>
                </Link>
              )}
            </div>

            {/* Tech Stack Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 max-w-5xl mx-auto">
              {techStack.map((tech, index) => (
                <div
                  key={index}
                  className="group relative bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700 hover:border-green-400/50 transition-all duration-300 hover:bg-gray-800/70"
                >
                  <div
                    className={`w-4 h-4 rounded-full ${tech.color} mb-2 mx-auto group-hover:scale-110 transition-transform duration-300`}
                  ></div>
                  <div className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors duration-300">{tech.name}</div>
                  <div className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors duration-300">{tech.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="relative z-10 bg-gray-800/30 backdrop-blur-sm border-t border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center group">
                <div className="text-4xl mb-2 group-hover:scale-110 transition-transform duration-300">{stat.icon}</div>
                <div className="text-3xl font-bold text-white mb-2 group-hover:text-green-400 transition-colors duration-300">
                  {stat.value}
                </div>
                <div className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="relative z-10 py-20 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-white mb-6">Platform Features</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Built on Algorand blockchain with cutting-edge technology for secure, fast, and transparent cross-border applications
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group relative bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700 hover:border-green-400/50 transition-all duration-300 hover:bg-gray-800/70 hover:shadow-2xl hover:shadow-green-500/10"
              >
                <div
                  className={`w-16 h-16 bg-gradient-to-r ${feature.gradient} rounded-xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform duration-300`}
                >
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-4 group-hover:text-green-400 transition-colors duration-300">
                  {feature.title}
                </h3>
                <p className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Technical Architecture Section */}
      <div className="relative z-10 py-20 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-white mb-6">Technical Architecture</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Full-stack solution with Algorand smart contracts, real-time DID resolution, and AI-powered trust scoring
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="group relative bg-gradient-to-br from-blue-900/50 to-blue-800/30 backdrop-blur-sm rounded-2xl p-8 border border-blue-700/50 hover:border-blue-400/50 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/20">
              <h3 className="text-2xl font-bold text-white mb-6 group-hover:text-blue-400 transition-colors duration-300">
                🔗 Smart Contracts
              </h3>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-center space-x-3">
                  <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                  <span>Python-based Algorand contracts</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                  <span>Loan creation and management</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                  <span>Real-time trust score updates</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                  <span>Transparent repayment tracking</span>
                </li>
              </ul>
            </div>

            <div className="group relative bg-gradient-to-br from-teal-900/50 to-teal-800/30 backdrop-blur-sm rounded-2xl p-8 border border-teal-700/50 hover:border-teal-400/50 transition-all duration-300 hover:shadow-2xl hover:shadow-teal-500/20">
              <h3 className="text-2xl font-bold text-white mb-6 group-hover:text-teal-400 transition-colors duration-300">
                🆔 DID Resolution
              </h3>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-center space-x-3">
                  <span className="w-2 h-2 bg-teal-400 rounded-full"></span>
                  <span>GoPlausible integration</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span className="w-2 h-2 bg-teal-400 rounded-full"></span>
                  <span>Liquid Auth authentication</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span className="w-2 h-2 bg-teal-400 rounded-full"></span>
                  <span>Decentralized identity management</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span className="w-2 h-2 bg-teal-400 rounded-full"></span>
                  <span>Cross-border verification</span>
                </li>
              </ul>
            </div>

            <div className="group relative bg-gradient-to-br from-purple-900/50 to-purple-800/30 backdrop-blur-sm rounded-2xl p-8 border border-purple-700/50 hover:border-purple-400/50 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20">
              <h3 className="text-2xl font-bold text-white mb-6 group-hover:text-purple-400 transition-colors duration-300">
                🤖 AI Trust Scoring
              </h3>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-center space-x-3">
                  <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                  <span>Real-time score calculation</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                  <span>Loan history analysis</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                  <span>Repayment pattern recognition</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                  <span>Risk assessment automation</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative z-10 bg-gradient-to-r from-green-600 to-blue-600 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-5xl font-bold text-white mb-6">Ready to Experience the Future of Cross-Border Applications?</h2>
          <p className="text-xl text-green-100 mb-8 max-w-3xl mx-auto">
            Join the revolution of cross-border applications with Algorand blockchain, Liquid Auth, and decentralized identity management.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            {!activeAddress && (
              <Link
                to="/connect-wallet"
                className="group relative bg-white text-green-600 px-10 py-5 rounded-2xl font-bold text-xl hover:bg-gray-100 transition-all duration-300 shadow-2xl hover:shadow-white/25 transform hover:scale-105"
              >
                <span className="relative z-10">Connect Wallet & Start</span>
                <div className="absolute inset-0 bg-gray-100 rounded-2xl blur opacity-0 group-hover:opacity-75 transition-opacity duration-300"></div>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">A</span>
                </div>
                <span className="text-xl font-bold">Cross-Border Platform</span>
              </div>
              <p className="text-gray-400">
                Revolutionary cross-border platform built on Algorand blockchain with Liquid Auth and GoPlausible DID resolution.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-white">Platform</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link to="/connect-wallet" className="hover:text-green-400 transition-colors">
                    Connect Wallet
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-white">Technology</h4>
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
              <h4 className="font-semibold mb-4 text-white">Hackathon MVP</h4>
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
            <p>&copy; 2024 Cross-Border Platform MVP. Built on Algorand blockchain for hackathon demonstration.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LandingPage
