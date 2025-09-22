import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'

const Navbar: React.FC = () => {
  const { activeAddress } = useWallet()
  const location = useLocation()

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-teal-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span className="text-xl font-bold text-gray-800">PayrollLend</span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              to="/"
              className={`text-sm font-medium transition-colors duration-200 ${
                location.pathname === '/' ? 'text-blue-600 border-b-2 border-blue-600 pb-1' : 'text-gray-700 hover:text-blue-600'
              }`}
            >
              Home
            </Link>
            <Link
              to="/payroll"
              className={`text-sm font-medium transition-colors duration-200 ${
                location.pathname === '/payroll' ? 'text-blue-600 border-b-2 border-blue-600 pb-1' : 'text-gray-700 hover:text-blue-600'
              }`}
            >
              Payroll
            </Link>
            <Link
              to="/microlending"
              className={`text-sm font-medium transition-colors duration-200 ${
                location.pathname === '/microlending'
                  ? 'text-blue-600 border-b-2 border-blue-600 pb-1'
                  : 'text-gray-700 hover:text-blue-600'
              }`}
            >
              Microlending
            </Link>
            <Link
              to="/analytics"
              className={`text-sm font-medium transition-colors duration-200 ${
                location.pathname === '/analytics' ? 'text-blue-600 border-b-2 border-blue-600 pb-1' : 'text-gray-700 hover:text-blue-600'
              }`}
            >
              Analytics
            </Link>
          </div>

          {/* Connect Wallet Button */}
          <div className="flex items-center space-x-4">
            {activeAddress ? (
              <div className="flex items-center space-x-3">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Connected:</span>
                  <span className="ml-1 font-mono text-xs">
                    {activeAddress.slice(0, 6)}...{activeAddress.slice(-4)}
                  </span>
                </div>
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>
            ) : (
              <Link
                to="/connect-wallet"
                className="bg-gradient-to-r from-blue-500 to-teal-500 text-white px-6 py-2 rounded-lg font-medium hover:from-blue-600 hover:to-teal-600 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Connect Wallet
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className="md:hidden">
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-50">
          <Link
            to="/"
            className={`block px-3 py-2 text-base font-medium ${
              location.pathname === '/' ? 'text-blue-600 bg-blue-50' : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100'
            }`}
          >
            Home
          </Link>
          <Link
            to="/payroll"
            className={`block px-3 py-2 text-base font-medium ${
              location.pathname === '/payroll' ? 'text-blue-600 bg-blue-50' : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100'
            }`}
          >
            Payroll
          </Link>
          <Link
            to="/microlending"
            className={`block px-3 py-2 text-base font-medium ${
              location.pathname === '/microlending' ? 'text-blue-600 bg-blue-50' : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100'
            }`}
          >
            Microlending
          </Link>
          <Link
            to="/analytics"
            className={`block px-3 py-2 text-base font-medium ${
              location.pathname === '/analytics' ? 'text-blue-600 bg-blue-50' : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100'
            }`}
          >
            Analytics
          </Link>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
