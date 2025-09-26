import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'

interface LiquidAuthUser {
  did: string
  address: string
  publicKey?: string
  controller?: string
}

const Navbar: React.FC = () => {
  const { activeAddress, disconnect } = useWallet()
  const location = useLocation()
  const [balance, setBalance] = useState<number>(0)
  const [loadingBalance, setLoadingBalance] = useState(false)
  const [liquidAuthUser, setLiquidAuthUser] = useState<LiquidAuthUser | null>(null)
  const [showWalletMenu, setShowWalletMenu] = useState(false)
  const [showLiquidAuthMenu, setShowLiquidAuthMenu] = useState(false)

  // Determine if we're on the home page (dark theme) or other pages (light theme)
  const isHomePage = location.pathname === '/'

  // Handle wallet disconnect
  const handleWalletDisconnect = async () => {
    try {
      await disconnect()
      setBalance(0)
    } catch (error) {
      console.error('Failed to disconnect wallet:', error)
    }
  }

  // Handle Liquid Auth logout
  const handleLiquidAuthLogout = () => {
    localStorage.removeItem('liquidAuthUser')
    setLiquidAuthUser(null)
  }

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.dropdown-menu')) {
        setShowWalletMenu(false)
        setShowLiquidAuthMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Load Liquid Auth user from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('liquidAuthUser')
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser)
        setLiquidAuthUser(userData)
      } catch (error) {
        // Error loading Liquid Auth user
        localStorage.removeItem('liquidAuthUser')
      }
    }

    // Listen for storage changes (when user logs in/out in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'liquidAuthUser') {
        if (e.newValue) {
          try {
            const userData = JSON.parse(e.newValue)
            setLiquidAuthUser(userData)
          } catch (error) {
            // Error parsing Liquid Auth user data
          }
        } else {
          setLiquidAuthUser(null)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  // Fetch account balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (!activeAddress) {
        setBalance(0)
        return
      }

      setLoadingBalance(true)
      try {
        // Use the same config method as Transact component
        const algodConfig = getAlgodConfigFromViteEnvironment()
        const algorand = AlgorandClient.fromConfig({ algodConfig })

        const accountInfo = await algorand.account.getInformation(activeAddress)
        setBalance(Number(accountInfo.balance || 0))
      } catch (error) {
        // Error fetching balance
        setBalance(0)
      } finally {
        setLoadingBalance(false)
      }
    }

    fetchBalance()

    // Refresh balance every 30 seconds
    const interval = setInterval(fetchBalance, 30000)
    return () => clearInterval(interval)
  }, [activeAddress])

  return (
    <nav
      className={`${isHomePage ? 'bg-gray-900/95' : 'bg-white/95'} backdrop-blur-sm shadow-2xl border-b ${isHomePage ? 'border-gray-700' : 'border-gray-200'}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span
                className={`text-xl font-bold ${isHomePage ? 'text-white group-hover:text-green-400' : 'text-gray-900 group-hover:text-green-600'} transition-colors duration-300`}
              >
                Cross-Border Microlending
              </span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            {/* <Link
              to="/"
              className={`text-sm font-medium transition-colors duration-200 ${
                location.pathname === '/'
                  ? `${isHomePage ? 'text-blue-400 border-b-2 border-blue-400' : 'text-blue-600 border-b-2 border-blue-600'} pb-1`
                  : `${isHomePage ? 'text-gray-300 hover:text-blue-400' : 'text-gray-700 hover:text-blue-600'}`
              }`}
            >
              Home
            </Link> */}
            <Link
              to="/payroll"
              className={`text-sm font-medium transition-colors duration-200 ${
                location.pathname === '/payroll'
                  ? `${isHomePage ? 'text-blue-400 border-b-2 border-blue-400' : 'text-blue-600 border-b-2 border-blue-600'} pb-1`
                  : `${isHomePage ? 'text-gray-300 hover:text-blue-400' : 'text-gray-700 hover:text-blue-600'}`
              }`}
            >
              Payroll
            </Link>
            <Link
              to="/microlending"
              className={`text-sm font-medium transition-colors duration-200 ${
                location.pathname === '/microlending'
                  ? `${isHomePage ? 'text-blue-400 border-b-2 border-blue-400' : 'text-blue-600 border-b-2 border-blue-600'} pb-1`
                  : `${isHomePage ? 'text-gray-300 hover:text-blue-400' : 'text-gray-700 hover:text-blue-600'}`
              }`}
            >
              Microlending
            </Link>
            {/* <Link
              to="/analytics"
              className={`text-sm font-medium transition-colors duration-200 ${
                location.pathname === '/analytics'
                  ? `${isHomePage ? 'text-blue-400 border-b-2 border-blue-400' : 'text-blue-600 border-b-2 border-blue-600'} pb-1`
                  : `${isHomePage ? 'text-gray-300 hover:text-blue-400' : 'text-gray-700 hover:text-blue-600'}`
              }`}
            >
              Analytics
            </Link> */}
            <Link
              to="/liquid-auth"
              className={`text-sm font-medium transition-colors duration-200 ${
                location.pathname === '/liquid-auth'
                  ? `${isHomePage ? 'text-blue-400 border-b-2 border-blue-400' : 'text-blue-600 border-b-2 border-blue-600'} pb-1`
                  : `${isHomePage ? 'text-gray-300 hover:text-blue-400' : 'text-gray-700 hover:text-blue-600'}`
              }`}
            >
              Liquid Auth
            </Link>
            <Link
              to="/trustscore"
              className={`text-sm font-medium transition-colors duration-200 ${
                location.pathname === '/trustscore'
                  ? `${isHomePage ? 'text-purple-400 border-b-2 border-purple-400' : 'text-purple-600 border-b-2 border-purple-600'} pb-1`
                  : `${isHomePage ? 'text-gray-300 hover:text-purple-400' : 'text-gray-700 hover:text-purple-600'}`
              }`}
            >
              Trust Score
            </Link>
          </div>

          {/* Connect Wallet Button & Balance */}
          <div className="flex items-center space-x-4">
            {activeAddress ? (
              <div className="relative">
                {/* Wallet Info Button */}
                <button
                  onClick={() => setShowWalletMenu(!showWalletMenu)}
                  className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105 ${
                    isHomePage ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-900'
                  }`}
                >
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <div className="text-sm">
                    <div className="font-medium">{loadingBalance ? 'Loading...' : `${(balance / 1000000).toFixed(2)} ALGO`}</div>
                    <div className={`text-xs ${isHomePage ? 'text-gray-400' : 'text-gray-500'}`}>
                      {activeAddress.slice(0, 6)}...{activeAddress.slice(-4)}
                    </div>
                  </div>
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${showWalletMenu ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Wallet Dropdown Menu */}
                {showWalletMenu && (
                  <div
                    className={`dropdown-menu absolute right-0 mt-2 w-64 rounded-lg shadow-lg border z-50 ${
                      isHomePage ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="p-4">
                      <div className="mb-4">
                        <h3 className={`text-sm font-medium ${isHomePage ? 'text-gray-300' : 'text-gray-700'}`}>Wallet Connected</h3>
                        <p className={`text-xs ${isHomePage ? 'text-gray-400' : 'text-gray-500'} font-mono mt-1`}>{activeAddress}</p>
                      </div>

                      <div className="mb-4">
                        <div className={`text-sm ${isHomePage ? 'text-gray-300' : 'text-gray-600'}`}>
                          <span className="font-medium">Balance:</span>
                          <span className={`ml-2 font-bold ${isHomePage ? 'text-white' : 'text-gray-900'}`}>
                            {loadingBalance ? 'Loading...' : `${(balance / 1000000).toFixed(2)} ALGO`}
                          </span>
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(activeAddress)
                            setShowWalletMenu(false)
                          }}
                          className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors duration-200 ${
                            isHomePage ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          }`}
                        >
                          📋 Copy Address
                        </button>
                        <button
                          onClick={() => {
                            handleWalletDisconnect()
                            setShowWalletMenu(false)
                          }}
                          className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors duration-200 ${
                            isHomePage ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                        >
                          🚪 Disconnect
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* Liquid Auth User Display */}
            {liquidAuthUser ? (
              <div className="relative">
                {/* Liquid Auth Info Button */}
                <button
                  onClick={() => setShowLiquidAuthMenu(!showLiquidAuthMenu)}
                  className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105 ${
                    isHomePage
                      ? 'bg-blue-900/50 hover:bg-blue-800/50 text-white border border-blue-700'
                      : 'bg-blue-50 hover:bg-blue-100 text-gray-900 border border-blue-200'
                  }`}
                >
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <div className="text-sm">
                    <div className="font-medium">Liquid Auth</div>
                    <div className={`text-xs ${isHomePage ? 'text-blue-200' : 'text-blue-600'}`}>{liquidAuthUser.did.slice(0, 20)}...</div>
                  </div>
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${showLiquidAuthMenu ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Liquid Auth Dropdown Menu */}
                {showLiquidAuthMenu && (
                  <div
                    className={`dropdown-menu absolute right-0 mt-2 w-64 rounded-lg shadow-lg border z-50 ${
                      isHomePage ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="p-4">
                      <div className="mb-4">
                        <h3 className={`text-sm font-medium ${isHomePage ? 'text-gray-300' : 'text-gray-700'}`}>Liquid Auth Connected</h3>
                        <p className={`text-xs ${isHomePage ? 'text-gray-400' : 'text-gray-500'} font-mono mt-1 break-all`}>
                          {liquidAuthUser.did}
                        </p>
                      </div>

                      <div className="mb-4">
                        <div className={`text-sm ${isHomePage ? 'text-gray-300' : 'text-gray-600'}`}>
                          <span className="font-medium">Address:</span>
                          <span className={`ml-2 font-mono text-xs ${isHomePage ? 'text-gray-400' : 'text-gray-500'}`}>
                            {liquidAuthUser.address}
                          </span>
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(liquidAuthUser.did)
                            setShowLiquidAuthMenu(false)
                          }}
                          className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors duration-200 ${
                            isHomePage ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          }`}
                        >
                          📋 Copy DID
                        </button>
                        <button
                          onClick={() => {
                            handleLiquidAuthLogout()
                            setShowLiquidAuthMenu(false)
                          }}
                          className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors duration-200 ${
                            isHomePage ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                        >
                          🚪 Logout
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {!activeAddress && !liquidAuthUser ? (
              <Link
                to="/connect-wallet"
                className="bg-gradient-to-r from-blue-500 to-teal-500 text-white px-6 py-2 rounded-lg font-medium hover:from-blue-600 hover:to-teal-600 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Connect Wallet
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className="md:hidden">
        <div className={`px-2 pt-2 pb-3 space-y-1 sm:px-3 ${isHomePage ? 'bg-gray-800' : 'bg-gray-50'}`}>
          <Link
            to="/"
            className={`block px-3 py-2 text-base font-medium ${
              location.pathname === '/'
                ? `${isHomePage ? 'text-blue-400 bg-blue-900/50' : 'text-blue-600 bg-blue-50'}`
                : `${isHomePage ? 'text-gray-300 hover:text-blue-400 hover:bg-gray-700' : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100'}`
            }`}
          >
            Home
          </Link>
          <Link
            to="/payroll"
            className={`block px-3 py-2 text-base font-medium ${
              location.pathname === '/payroll'
                ? `${isHomePage ? 'text-blue-400 bg-blue-900/50' : 'text-blue-600 bg-blue-50'}`
                : `${isHomePage ? 'text-gray-300 hover:text-blue-400 hover:bg-gray-700' : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100'}`
            }`}
          >
            Payroll
          </Link>
          <Link
            to="/microlending"
            className={`block px-3 py-2 text-base font-medium ${
              location.pathname === '/microlending'
                ? `${isHomePage ? 'text-blue-400 bg-blue-900/50' : 'text-blue-600 bg-blue-50'}`
                : `${isHomePage ? 'text-gray-300 hover:text-blue-400 hover:bg-gray-700' : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100'}`
            }`}
          >
            Microlending
          </Link>
          <Link
            to="/analytics"
            className={`block px-3 py-2 text-base font-medium ${
              location.pathname === '/analytics'
                ? `${isHomePage ? 'text-blue-400 bg-blue-900/50' : 'text-blue-600 bg-blue-50'}`
                : `${isHomePage ? 'text-gray-300 hover:text-blue-400 hover:bg-gray-700' : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100'}`
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
