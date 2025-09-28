import React, { useState } from 'react'
import LiquidAuth from '../components/LiquidAuth'

interface User {
  did: string
  address: string
  publicKey?: string
  controller?: string
}

const LiquidAuthPage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null)
  const [loginHistory, setLoginHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Fetch login history from backend
  const fetchLoginHistory = async (did: string) => {
    if (!did) return

    setLoadingHistory(true)
    try {
      const response = await fetch(`http://localhost:3001/api/login-history/${encodeURIComponent(did)}`)
      if (response.ok) {
        const data = await response.json()
        setLoginHistory(data.loginHistory || [])
      } else {
        console.error('Failed to fetch login history')
        setLoginHistory([])
      }
    } catch (error) {
      console.error('Error fetching login history:', error)
      setLoginHistory([])
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleLogin = (userData: User) => {
    setUser(userData)
    // Fetch login history from backend
    fetchLoginHistory(userData.did)
  }

  const handleLogout = async () => {
    setUser(null)
    setLoginHistory([])

    // Store logout event in backend
    try {
      await fetch('http://localhost:3001/api/login-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          did: user?.did || 'unknown',
          event: 'Liquid Auth logout successful',
          timestamp: new Date().toISOString(),
          ipAddress: 'unknown',
          userAgent: navigator.userAgent,
        }),
      })
    } catch (error) {
      console.error('Failed to store logout history:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Liquid Auth Integration</h1>
          <p className="text-lg text-gray-600">Experience secure authentication with Algorand wallets and Passkeys</p>
        </div>

        <div className="w-full">
          {/* Liquid Auth Component */}
          <LiquidAuth onLogin={handleLogin} onLogout={handleLogout} />
        </div>
      </div>
    </div>
  )
}

export default LiquidAuthPage
