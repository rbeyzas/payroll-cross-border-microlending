import React, { useState, useEffect } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { PayrollAppClient } from '../contracts/PayrollApp'
import { AlgorandClient, algo } from '@algorandfoundation/algokit-utils'
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'

interface Employee {
  address: string
  amount: number
  paused: boolean
}

interface PayrollData {
  asaId: string
  cycleSecs: string
  employees: Employee[]
  totalFunded: number
}

const PayrollWizard: React.FC = () => {
  const { activeAddress, transactionSigner } = useWallet()
  const [currentStep, setCurrentStep] = useState(1)
  const [payrollData, setPayrollData] = useState<PayrollData>({
    asaId: '',
    cycleSecs: '',
    employees: [],
    totalFunded: 0,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [liquidAuthUser, setLiquidAuthUser] = useState<any>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Check authentication status
  useEffect(() => {
    // Check if user is authenticated via Liquid Auth
    const savedUser = localStorage.getItem('liquidAuthUser')
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser)
        setLiquidAuthUser(userData)
        setIsAuthenticated(true)
      } catch (error) {
        console.error('Error loading Liquid Auth user:', error)
      }
    }

    // Check if user is authenticated via wallet
    if (activeAddress) {
      setIsAuthenticated(true)
    }
  }, [activeAddress])

  const steps = [
    { number: 1, title: 'Create Payroll', description: 'Set up your payroll contract' },
    { number: 2, title: 'Add Employees', description: 'Add employees to your payroll' },
    { number: 3, title: 'Fund Payroll', description: 'Send funds to the contract' },
    { number: 4, title: 'Disburse Payments', description: 'Distribute payments to employees' },
  ]

  const handleCreatePayroll = async () => {
    if (!activeAddress) {
      setError('Please connect your wallet first')
      return
    }

    setLoading(true)
    setError('')

    try {
      console.log('Creating payroll with:', payrollData.asaId, payrollData.cycleSecs, activeAddress)

      // Use the same config method as working components
      const algodConfig = getAlgodConfigFromViteEnvironment()
      const algorand = AlgorandClient.fromConfig({ algodConfig })

      // Check if account has sufficient balance
      const accountInfo = await algorand.account.getInformation(activeAddress!)

      if (accountInfo.amount < 100000) {
        // Less than 0.1 ALGO
        setError(
          `Insufficient balance. You need at least 0.1 ALGO. Current balance: ${accountInfo.amount / 1000000} ALGO. Please get testnet ALGO from: https://testnet.algoexplorer.io/dispenser`,
        )
        return
      }

      // Set default signer
      algorand.setDefaultSigner(transactionSigner)

      // Create PayrollApp client using constructor
      const payrollClient = new PayrollAppClient({
        algorand,
        defaultSender: activeAddress!,
        appId: BigInt(746228510), // New deployed AppID
      })

      // Call createPayroll method
      const result = await payrollClient.send.createPayroll({
        args: [
          payrollData.asaId.toString(), // ASA ID (0 for ALGO)
          payrollData.cycleSecs.toString(), // Cycle seconds
          activeAddress, // Admin address
        ],
        sender: activeAddress!,
      })

      console.log('Transaction result:', result)
      console.log('Payroll created successfully!')

      console.log('Payroll created successfully!')
      setCurrentStep(2)
    } catch (err) {
      setError('Failed to create payroll contract')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddEmployee = () => {
    setCurrentStep(3)
  }

  const handleFundPayroll = async () => {
    setLoading(true)
    setError('')

    try {
      console.log('Funding payroll with amount:', payrollData.totalFunded)

      // Use the same config method as working components
      const algodConfig = getAlgodConfigFromViteEnvironment()
      const algorand = AlgorandClient.fromConfig({ algodConfig })

      // Set default signer
      algorand.setDefaultSigner(transactionSigner)

      // Create PayrollApp client using constructor
      const payrollClient = new PayrollAppClient({
        algorand,
        defaultSender: activeAddress!,
        appId: BigInt(746228510), // New deployed AppID
      })

      // Call fundApp method
      const result = await payrollClient.send.fundApp({
        args: [payrollData.totalFunded.toString()],
        sender: activeAddress!,
      })

      console.log('Funding result:', result)
      console.log('Payroll funded successfully!')

      setCurrentStep(4)
    } catch (err) {
      setError('Failed to fund payroll')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDisburse = async () => {
    if (!activeAddress || !transactionSigner) {
      setError('Please connect your wallet first')
      return
    }

    setLoading(true)
    setError('')

    try {
      console.log('Disbursing payments to employees')

      // Use the same config method as working components
      const algodConfig = getAlgodConfigFromViteEnvironment()
      const algorand = AlgorandClient.fromConfig({ algodConfig })

      // Set default signer
      algorand.setDefaultSigner(transactionSigner)

      // Create PayrollApp client using constructor
      const payrollClient = new PayrollAppClient({
        algorand,
        defaultSender: activeAddress!,
        appId: BigInt(746228510), // New deployed AppID
      })

      // Send individual payments to each employee
      console.log(`Starting to send payments to ${payrollData.employees.length} employees`)

      for (let i = 0; i < payrollData.employees.length; i++) {
        const employee = payrollData.employees[i]

        if (employee.paused) {
          console.log(`Skipping paused employee ${i + 1}: ${employee.address}`)
          continue
        }

        console.log(`Processing employee ${i + 1}/${payrollData.employees.length}: ${employee.address}`)
        console.log(`Amount to send: ${employee.amount} microALGO (${Number(employee.amount) / 1000000} ALGO)`)

        try {
          // Calculate total amount including minimum balance requirement
          // Algorand minimum balance is 100,000 microALGO (0.1 ALGO)
          const minBalance = 100000 // 0.1 ALGO in microALGO
          const totalAmount = Number(employee.amount) + minBalance

          console.log(`Total amount with min balance: ${totalAmount} microALGO (${totalAmount / 1000000} ALGO)`)

          // Send payment to each employee
          const paymentResult = await algorand.send.payment({
            signer: transactionSigner,
            sender: activeAddress,
            receiver: employee.address,
            amount: algo(totalAmount / 1000000), // Convert microALGO to ALGO
          })

          console.log(`✅ Payment sent to ${employee.address}:`, paymentResult.txIds[0])
          console.log(`Remaining employees: ${payrollData.employees.length - i - 1}`)

          // Small delay between payments
          console.log(`Waiting 2 seconds before next payment...`)
          await new Promise((resolve) => setTimeout(resolve, 2000))
        } catch (paymentError) {
          console.error(`❌ Failed to send payment to ${employee.address}:`, paymentError)
          console.error(`Error details:`, paymentError.message || paymentError)
          // Continue with other employees even if one fails
        }
      }

      console.log(`Finished processing all ${payrollData.employees.length} employees`)

      // Call disburse method to update contract state
      const result = await payrollClient.send.disburse({
        args: [],
        sender: activeAddress!,
      })

      console.log('Disbursement result:', result)
      console.log('Payments disbursed successfully!')

      alert('Payments disbursed successfully to all employees!')
    } catch (err) {
      setError('Failed to disburse payments')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const addEmployee = () => {
    const newEmployee: Employee = {
      address: '',
      amount: 0,
      paused: false,
    }
    setPayrollData((prev) => ({
      ...prev,
      employees: [...prev.employees, newEmployee],
    }))
  }

  const updateEmployee = (index: number, field: keyof Employee, value: string | number | boolean) => {
    setPayrollData((prev) => ({
      ...prev,
      employees: prev.employees.map((emp, i) => (i === index ? { ...emp, [field]: value } : emp)),
    }))
  }

  const removeEmployee = (index: number) => {
    setPayrollData((prev) => ({
      ...prev,
      employees: prev.employees.filter((_, i) => i !== index),
    }))
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-6">Please connect your wallet or login with Liquid Auth to create a payroll system.</p>
          <div className="space-y-3">
            <a
              href="/connect-wallet"
              className="block bg-gradient-to-r from-blue-600 to-teal-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-teal-700 transition-all duration-200"
            >
              Connect Wallet
            </a>
            <a
              href="/liquid-auth"
              className="block bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all duration-200"
            >
              Login with Liquid Auth
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Payroll Setup Wizard</h1>
          <p className="text-xl text-gray-600">Set up your blockchain-powered payroll system in 4 easy steps</p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-12">
          <div className="flex items-center space-x-8">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                    currentStep >= step.number ? 'bg-gradient-to-r from-blue-600 to-teal-600 text-white' : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {step.number}
                </div>
                <div className="ml-4">
                  <h3 className={`font-semibold ${currentStep >= step.number ? 'text-gray-900' : 'text-gray-500'}`}>{step.title}</h3>
                  <p className={`text-sm ${currentStep >= step.number ? 'text-gray-600' : 'text-gray-400'}`}>{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-16 h-1 mx-4 ${currentStep > step.number ? 'bg-gradient-to-r from-blue-600 to-teal-600' : 'bg-gray-200'}`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Step 1: Create Payroll */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Payroll Contract</h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ASA ID (0 for ALGO)</label>
                  <input
                    type="number"
                    value={payrollData.asaId}
                    onChange={(e) => setPayrollData((prev) => ({ ...prev, asaId: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pay Cycle (seconds)</label>
                  <input
                    type="number"
                    value={payrollData.cycleSecs}
                    onChange={(e) => setPayrollData((prev) => ({ ...prev, cycleSecs: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="2592000 (30 days)"
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Admin Address</h3>
                <p className="text-blue-800 font-mono text-sm">{activeAddress}</p>
              </div>

              <button
                onClick={handleCreatePayroll}
                disabled={loading || !payrollData.asaId || !payrollData.cycleSecs}
                className="w-full bg-gradient-to-r from-blue-600 to-teal-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:from-blue-700 hover:to-teal-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Payroll Contract'}
              </button>
            </div>
          )}

          {/* Step 2: Add Employees */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Add Employees</h2>
                <button onClick={addEmployee} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  Add Employee
                </button>
              </div>

              {payrollData.employees.map((employee, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-gray-900">Employee {index + 1}</h3>
                    <button onClick={() => removeEmployee(index)} className="text-red-600 hover:text-red-700 font-medium">
                      Remove
                    </button>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Employee Address</label>
                      <input
                        type="text"
                        value={employee.address}
                        onChange={(e) => updateEmployee(index, 'address', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter Algorand address"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Amount (microALGO)</label>
                      <input
                        type="number"
                        value={employee.amount}
                        onChange={(e) => updateEmployee(index, 'amount', parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="1000000"
                      />
                    </div>
                  </div>

                  <div className="flex items-center mt-4">
                    <input
                      type="checkbox"
                      checked={employee.paused}
                      onChange={(e) => updateEmployee(index, 'paused', e.target.checked)}
                      className="mr-2"
                    />
                    <label className="text-sm text-gray-700">Paused</label>
                  </div>
                </div>
              ))}

              {payrollData.employees.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500 mb-4">No employees added yet</p>
                  <button onClick={addEmployee} className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
                    Add First Employee
                  </button>
                </div>
              )}

              <button
                onClick={handleAddEmployee}
                disabled={payrollData.employees.length === 0}
                className="w-full bg-gradient-to-r from-blue-600 to-teal-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:from-blue-700 hover:to-teal-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue to Funding
              </button>
            </div>
          )}

          {/* Step 3: Fund Payroll */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Fund Payroll</h2>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Employee Summary</h3>
                <div className="space-y-2">
                  {payrollData.employees.map((employee, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        {employee.address.slice(0, 8)}...{employee.address.slice(-4)}
                      </span>
                      <span className="font-medium">{employee.amount.toLocaleString()} microALGO</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-200 mt-4 pt-4">
                  <div className="flex justify-between items-center font-semibold text-lg">
                    <span>Total Required:</span>
                    <span>{payrollData.employees.reduce((sum, emp) => sum + emp.amount, 0).toLocaleString()} microALGO</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fund Amount (microALGO)</label>
                <input
                  type="number"
                  value={payrollData.totalFunded}
                  onChange={(e) => setPayrollData((prev) => ({ ...prev, totalFunded: parseInt(e.target.value) || 0 }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter amount to fund"
                />
              </div>

              <button
                onClick={handleFundPayroll}
                disabled={loading || payrollData.totalFunded === 0}
                className="w-full bg-gradient-to-r from-blue-600 to-teal-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:from-blue-700 hover:to-teal-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Funding...' : 'Fund Payroll Contract'}
              </button>
            </div>
          )}

          {/* Step 4: Disburse Payments */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Disburse Payments</h2>

              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="font-semibold text-green-900 mb-2">Ready to Disburse!</h3>
                <p className="text-green-800">
                  Your payroll is funded and ready. Click the button below to distribute payments to all employees.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">Total Employees</h4>
                  <p className="text-2xl font-bold text-blue-800">{payrollData.employees.length}</p>
                </div>

                <div className="bg-teal-50 rounded-lg p-4">
                  <h4 className="font-semibold text-teal-900 mb-2">Total Amount</h4>
                  <p className="text-2xl font-bold text-teal-800">
                    {payrollData.employees.reduce((sum, emp) => sum + emp.amount, 0).toLocaleString()} microALGO
                  </p>
                </div>
              </div>

              <button
                onClick={handleDisburse}
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Disbursing...' : 'Disburse Payments to All Employees'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PayrollWizard
