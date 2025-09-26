import React, { useState, useEffect } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import BorrowerView from '../components/BorrowerView'
import LenderView from '../components/LenderView'

export default function MicroloanPage() {
  const { activeAddress } = useWallet()
  const [currentView, setCurrentView] = useState<'borrower' | 'lender'>('borrower')
  const [liquidAuthUser, setLiquidAuthUser] = useState<any>(null)

  // Check authentication status
  useEffect(() => {
    const savedUser = localStorage.getItem('liquidAuthUser')
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser)
        setLiquidAuthUser(userData)
      } catch (error) {
        console.error('Error loading Liquid Auth user:', error)
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Tabs */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex space-x-8">
            <button
              onClick={() => setCurrentView('borrower')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                currentView === 'borrower'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <span className="mr-2">👤</span>
                Borrower Portal
              </div>
            </button>
            <button
              onClick={() => setCurrentView('lender')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                currentView === 'lender'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <span className="mr-2">💰</span>
                Lender Portal
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* View Content */}
      {currentView === 'borrower' && <BorrowerView />}
      {currentView === 'lender' && <LenderView />}
    </div>
  )
}
