import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'

const Navbar: React.FC = () => {
  const { activeAddress } = useWallet()
  const location = useLocation()
  const [balance, setBalance] = useState<number>(0)
  const [loadingBalance, setLoadingBalance] = useState(false)

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

        console.log('Fetching balance for address:', activeAddress)
        console.log('Algorand client config:', algodConfig)

        const accountInfo = await algorand.account.getInformation(activeAddress)
        console.log('Account info:', accountInfo)
        console.log('Raw amount:', accountInfo.amount)
        console.log('Network:', algodConfig.server)
        console.log('Address on testnet explorer:', `https://testnet.algoexplorer.io/address/${activeAddress}`)

        setBalance(Number(accountInfo.amount))
      } catch (error) {
        console.error('Error fetching balance:', error)
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

          {/* Connect Wallet Button & Balance */}
          <div className="flex items-center space-x-4">
            {activeAddress ? (
              <div className="flex items-center space-x-4">
                {/* Balance Display */}
                <div className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="text-sm">
                    <span className="text-gray-600 font-medium">Balance:</span>
                    <span className="ml-1 font-bold text-gray-900">
                      {loadingBalance ? <span className="text-gray-400">Loading...</span> : `${(balance / 1000000).toFixed(2)} ALGO`}
                    </span>
                  </div>
                </div>

                {/* Address Display */}
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Connected:</span>
                  <span className="ml-1 font-mono text-xs">
                    {activeAddress.slice(0, 6)}...{activeAddress.slice(-4)}
                  </span>
                </div>
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
