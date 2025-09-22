import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import { WalletId } from '@txnlab/use-wallet-react'

const ConnectWalletPage: React.FC = () => {
  const { wallets, activeAddress, signTransactions } = useWallet()
  const navigate = useNavigate()

  const handleConnect = async (wallet: any) => {
    try {
      // In a real implementation, you would connect to the wallet
      console.log('Connecting to wallet:', wallet)
      navigate('/')
    } catch (error) {
      console.error('Connection failed:', error)
    }
  }

  const handleDisconnect = async () => {
    try {
      // In a real implementation, you would disconnect from the wallet
      console.log('Disconnecting wallet')
      navigate('/')
    } catch (error) {
      console.error('Disconnection failed:', error)
    }
  }

  if (activeAddress) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-4">Wallet Connected!</h2>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-2">Connected Address:</p>
            <p className="font-mono text-sm text-gray-800 break-all">{activeAddress}</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleDisconnect}
              className="w-full bg-red-500 text-white py-3 px-6 rounded-lg font-medium hover:bg-red-600 transition-colors duration-200"
            >
              Disconnect Wallet
            </button>

            <button
              onClick={() => navigate('/')}
              className="w-full bg-blue-500 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-600 transition-colors duration-200"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Connect Your Wallet</h1>
          <p className="text-gray-600">Choose a wallet provider to connect to PayrollLend</p>
        </div>

        <div className="space-y-4">
          {wallets?.map((wallet) => (
            <button
              key={wallet.id}
              onClick={() => handleConnect(wallet)}
              className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 group"
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors duration-200">
                  {wallet.id === WalletId.PERA && <div className="w-6 h-6 bg-blue-600 rounded"></div>}
                  {wallet.id === WalletId.DEFLY && <div className="w-6 h-6 bg-purple-600 rounded"></div>}
                  {wallet.id === WalletId.EXODUS && <div className="w-6 h-6 bg-green-600 rounded"></div>}
                  {!wallet.id && <div className="w-6 h-6 bg-gray-600 rounded"></div>}
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-800">{wallet.id || 'Wallet'}</p>
                  <p className="text-sm text-gray-500">
                    {wallet.id === WalletId.PERA && 'Mobile & Web Wallet'}
                    {wallet.id === WalletId.DEFLY && 'Mobile Wallet'}
                    {wallet.id === WalletId.EXODUS && 'Multi-chain Wallet'}
                    {!wallet.id && 'Wallet Provider'}
                  </p>
                </div>
              </div>
              <svg
                className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors duration-200"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Don't have a wallet?{' '}
            <a
              href="https://perawallet.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Download Pera Wallet
            </a>
          </p>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors duration-200"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConnectWalletPage
