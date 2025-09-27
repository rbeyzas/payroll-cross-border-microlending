import React, { useState, useEffect } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import PayrollWizard from '../components/PayrollWizard'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { PayrollAppClient } from '../contracts/PayrollApp'
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'

interface Payroll {
  id: string
  name: string
  description: string
  asaId: string
  address: string
  employees: Employee[]
  totalAmount: number
  status: string
  createdAt: string
  lastDisbursement: string | null
}

interface Employee {
  id: string
  name: string
  address: string
  salary: number
  position: string
  addedAt: string
  status: string
}

const PayrollPage: React.FC = () => {
  const { activeAddress, transactionSigner } = useWallet()
  const [showWizard, setShowWizard] = useState(false)
  const [payrolls, setPayrolls] = useState<Payroll[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPayroll, _setSelectedPayroll] = useState<Payroll | null>(null)
  const [showEmployeeModal, setShowEmployeeModal] = useState(false)
  const [showAllEmployees, setShowAllEmployees] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [editingPayroll, setEditingPayroll] = useState<Payroll | null>(null)
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    address: '',
    salary: '',
    position: '',
  })

  // Fetch payrolls from backend
  const fetchPayrolls = async () => {
    if (!activeAddress) return

    try {
      setLoading(true)
      const response = await fetch(`http://localhost:3001/api/payrolls/${activeAddress}`)
      if (!response.ok) {
        throw new Error('Failed to fetch payrolls')
      }
      const data = await response.json()
      setPayrolls(data.payrolls || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch payrolls')
    } finally {
      setLoading(false)
    }
  }

  // Add employee to payroll
  const addEmployee = async (payrollId: string) => {
    if (!activeAddress || !transactionSigner) {
      setError('Please connect your wallet')
      return
    }

    // Find the payroll to use
    const payrollToUse = selectedPayroll || payrolls.find((p) => p.id === payrollId)
    if (!payrollToUse) {
      setError('Payroll not found')
      return
    }

    try {
      setLoading(true)
      setError('')

      // Convert salary to microALGO
      const salaryInMicroAlgo = Math.floor(parseFloat(newEmployee.salary) * 1000000)

      // Get Algorand client
      const algodConfig = getAlgodConfigFromViteEnvironment()
      const algorand = AlgorandClient.fromConfig({ algodConfig })
      algorand.setDefaultSigner(transactionSigner)

      // Create PayrollApp client
      const payrollClient = new PayrollAppClient({
        algorand,
        defaultSender: activeAddress,
        appId: BigInt(746228510), // Use the deployed payroll contract ID
      })

      // Call smart contract to add employee
      await payrollClient.send.addEmployee({
        args: [newEmployee.address, salaryInMicroAlgo.toString()],
        sender: activeAddress,
      })

      // Employee added to blockchain successfully

      // Also add to backend for UI management
      const response = await fetch(`http://localhost:3001/api/payrolls/${payrollId}/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEmployee),
      })

      if (!response.ok) {
        throw new Error('Failed to add employee to backend')
      }

      // Refresh payrolls
      await fetchPayrolls()
      setShowEmployeeModal(false)
      setNewEmployee({ name: '', address: '', salary: '', position: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add employee')
    } finally {
      setLoading(false)
    }
  }

  // Edit employee
  const editEmployee = async (payrollId: string, employeeId: string, updatedEmployee: Partial<Employee>) => {
    if (!activeAddress || !transactionSigner) {
      setError('Please connect your wallet')
      return
    }

    try {
      setLoading(true)
      setError('')

      // Find the payroll and employee
      const payroll = payrolls.find((p) => p.id === payrollId)
      const employee = payroll?.employees.find((emp) => emp.id === employeeId)

      if (!payroll || !employee) {
        setError('Employee not found')
        return
      }

      // If salary changed, update on blockchain
      if (updatedEmployee.salary && updatedEmployee.salary !== employee.salary) {
        const salaryInMicroAlgo = Math.floor(updatedEmployee.salary * 1000000)

        // Get Algorand client
        const algodConfig = getAlgodConfigFromViteEnvironment()
        const algorand = AlgorandClient.fromConfig({ algodConfig })
        algorand.setDefaultSigner(transactionSigner)

        // Create PayrollApp client
        const payrollClient = new PayrollAppClient({
          algorand,
          defaultSender: activeAddress,
          appId: BigInt(746228510), // Use the deployed payroll contract ID
        })

        // Remove old employee and add with new salary
        await payrollClient.send.removeEmployee({
          args: [employee.address],
          sender: activeAddress,
        })

        await payrollClient.send.addEmployee({
          args: [employee.address, salaryInMicroAlgo.toString()],
          sender: activeAddress,
        })
      }

      // Update in backend
      const response = await fetch(`http://localhost:3001/api/payrolls/${payrollId}/employees/${employeeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedEmployee),
      })

      if (!response.ok) {
        throw new Error('Failed to update employee in backend')
      }

      // Refresh payrolls
      await fetchPayrolls()
      setEditingEmployee(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update employee')
    } finally {
      setLoading(false)
    }
  }

  // Edit payroll
  const editPayroll = async (payrollId: string, updatedPayroll: Partial<Payroll>) => {
    if (!activeAddress || !transactionSigner) {
      setError('Please connect your wallet')
      return
    }

    try {
      setLoading(true)
      setError('')

      // Update in backend
      const response = await fetch(`http://localhost:3001/api/payrolls/${payrollId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPayroll),
      })

      if (!response.ok) {
        throw new Error('Failed to update payroll in backend')
      }

      // Refresh payrolls
      await fetchPayrolls()
      setEditingPayroll(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update payroll')
    } finally {
      setLoading(false)
    }
  }

  // Remove employee from payroll
  const removeEmployee = async (payrollId: string, employeeId: string) => {
    if (!activeAddress || !transactionSigner || !selectedPayroll) {
      setError('Please connect your wallet and select a payroll')
      return
    }

    try {
      setLoading(true)
      setError('')

      // Find employee to get address
      const employee = selectedPayroll.employees.find((emp) => emp.id === employeeId)
      if (!employee) {
        throw new Error('Employee not found')
      }

      // Get Algorand client
      const algodConfig = getAlgodConfigFromViteEnvironment()
      const algorand = AlgorandClient.fromConfig({ algodConfig })
      algorand.setDefaultSigner(transactionSigner)

      // Create PayrollApp client
      const payrollClient = new PayrollAppClient({
        algorand,
        defaultSender: activeAddress,
        appId: BigInt(746228510), // Use the deployed payroll contract ID
      })

      // Call smart contract to remove employee
      await payrollClient.send.removeEmployee({
        args: [employee.address],
        sender: activeAddress,
      })

      // Employee removed from blockchain successfully

      // Also remove from backend
      const response = await fetch(`http://localhost:3001/api/payrolls/${payrollId}/employees/${employeeId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to remove employee from backend')
      }

      // Refresh payrolls
      await fetchPayrolls()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove employee')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayrolls()
  }, [activeAddress])

  if (showWizard) {
    return <PayrollWizard />
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Payroll Management</h1>
            <p className="text-gray-600 mt-2">Manage your blockchain-powered payroll systems</p>
          </div>
          <button
            onClick={() => setShowWizard(true)}
            className="bg-gradient-to-r from-blue-600 to-teal-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Create New Payroll
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Payrolls</p>
                <p className="text-2xl font-semibold text-gray-900">{loading ? '...' : payrolls.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Employees</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {loading ? '...' : payrolls.reduce((sum, payroll) => sum + (payroll.employees?.length || 0), 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Amount</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {loading ? '...' : `${(payrolls.reduce((sum, payroll) => sum + payroll.totalAmount, 0) / 1000000).toFixed(2)} ALGO`}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Payrolls</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {loading ? '...' : payrolls.filter((payroll) => payroll.status === 'active').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payroll List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Your Payrolls</h2>
          </div>

          {loading ? (
            <div className="p-6 text-center">
              <div className="inline-flex items-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="text-gray-600">Loading payrolls...</span>
              </div>
            </div>
          ) : payrolls.length === 0 ? (
            <div className="p-6 text-center">
              <div className="text-gray-500 mb-4">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No payrolls yet</h3>
              <p className="text-gray-600 mb-4">Get started by creating your first payroll system</p>
              <button
                onClick={() => setShowWizard(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Payroll
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {payrolls.map((payroll) => (
                <div key={payroll.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-teal-500 rounded-lg flex items-center justify-center">
                          <span className="text-white font-bold text-lg">P</span>
                        </div>

                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{payroll.name}</h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span>ASA ID: {payroll.asaId}</span>
                            <span>•</span>
                            <span>{payroll.employees?.length || 0} employees</span>
                            <span>•</span>
                            <span>{(payroll.totalAmount / 1000000).toFixed(2)} ALGO</span>
                          </div>
                          {payroll.description && <p className="text-sm text-gray-500 mt-1">{payroll.description}</p>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Last disbursement</p>
                        <p className="font-medium text-gray-900">{payroll.lastDisbursement || 'Never'}</p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            payroll.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {payroll.status}
                        </span>
                      </div>

                      <div className="flex space-x-2">
                        <button onClick={() => setShowAllEmployees(true)} className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                          Manage
                        </button>
                        <button className="text-green-600 hover:text-green-700 font-medium text-sm">Disburse</button>
                        <button
                          onClick={() => setEditingPayroll(payroll)}
                          className="text-gray-600 hover:text-gray-700 font-medium text-sm"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 ml-3">Create Payroll</h3>
            </div>
            <p className="text-gray-600 mb-4">Set up a new payroll system for your team</p>
            <button
              onClick={() => setShowWizard(true)}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Start Setup
            </button>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 ml-3">Manage Employees</h3>
            </div>
            <p className="text-gray-600 mb-4">Add, remove, or update employee information</p>
            <button
              onClick={() => setShowAllEmployees(true)}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
            >
              Manage
            </button>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 ml-3">Add Employee</h3>
            </div>
            <p className="text-gray-600 mb-4">Add a new employee to your payroll</p>
            <button
              onClick={() => setShowEmployeeModal(true)}
              className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors"
            >
              Add Employee
            </button>
          </div>
        </div>

        {/* Employee Management Modal */}
        {showEmployeeModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Add New Employee</h3>
                  <button onClick={() => setShowEmployeeModal(false)} className="text-gray-400 hover:text-gray-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Add Employee Form */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Add New Employee</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <input
                        type="text"
                        value={newEmployee.name}
                        onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Employee name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                      <input
                        type="text"
                        value={newEmployee.address}
                        onChange={(e) => setNewEmployee({ ...newEmployee, address: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Algorand address"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Salary (ALGO)</label>
                      <input
                        type="number"
                        value={newEmployee.salary}
                        onChange={(e) => setNewEmployee({ ...newEmployee, salary: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="1000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                      <input
                        type="text"
                        value={newEmployee.position}
                        onChange={(e) => setNewEmployee({ ...newEmployee, position: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Software Engineer"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (payrolls.length > 0) {
                        addEmployee(payrolls[0].id)
                      }
                    }}
                    disabled={!newEmployee.name || !newEmployee.address || !newEmployee.salary}
                    className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    Add Employee
                  </button>
                </div>

                {/* Employee List */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">
                    Current Employees ({payrolls.reduce((total, payroll) => total + (payroll.employees?.length || 0), 0)})
                  </h4>
                  {payrolls.some((payroll) => payroll.employees && payroll.employees.length > 0) ? (
                    <div className="space-y-3">
                      {payrolls
                        .flatMap((payroll) => payroll.employees || [])
                        .map((employee) => (
                          <div
                            key={employee.id}
                            className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
                          >
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                  <span className="text-green-600 font-medium text-sm">{employee.name.charAt(0).toUpperCase()}</span>
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{employee.name}</p>
                                  <p className="text-sm text-gray-600">{employee.position}</p>
                                  <p className="text-xs text-gray-500 font-mono">{employee.address}</p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4">
                              <div className="text-right">
                                <p className="font-medium text-gray-900">{(employee.salary / 1000000).toFixed(2)} ALGO</p>
                                <p className="text-xs text-gray-500">Monthly</p>
                              </div>
                              <button
                                onClick={() => {
                                  const payroll = payrolls.find((p) => p.employees?.some((emp) => emp.id === employee.id))
                                  if (payroll) {
                                    removeEmployee(payroll.id, employee.id)
                                  }
                                }}
                                className="text-red-600 hover:text-red-700 font-medium text-sm"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      <p>No employees added yet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Employee Management Modal */}
        {showEmployeeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Manage Employees</h3>
                <button onClick={() => setShowEmployeeModal(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee Name</label>
                  <input
                    type="text"
                    value={newEmployee.name}
                    onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter employee name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Algorand Address</label>
                  <input
                    type="text"
                    value={newEmployee.address}
                    onChange={(e) => setNewEmployee({ ...newEmployee, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter Algorand address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Salary (ALGO)</label>
                  <input
                    type="number"
                    value={newEmployee.salary}
                    onChange={(e) => setNewEmployee({ ...newEmployee, salary: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter salary in ALGO"
                    step="0.01"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                  <input
                    type="text"
                    value={newEmployee.position}
                    onChange={(e) => setNewEmployee({ ...newEmployee, position: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter position"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => setShowEmployeeModal(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (selectedPayroll) {
                        addEmployee(selectedPayroll.id)
                      } else if (payrolls.length > 0) {
                        // If no payroll selected but payrolls exist, use the first one
                        addEmployee(payrolls[0].id)
                      } else {
                        setError('Please create a payroll first')
                      }
                    }}
                    disabled={!newEmployee.name || !newEmployee.address || !newEmployee.salary || loading}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Adding...' : 'Add Employee'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* All Employees Modal */}
        {showAllEmployees && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-semibold text-gray-900">All Employees</h3>
                <button onClick={() => setShowAllEmployees(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {payrolls.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <p className="text-gray-500 text-lg">No payrolls found</p>
                  <p className="text-gray-400 text-sm mt-2">Create a payroll first to add employees</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {payrolls.map((payroll) => (
                    <div key={payroll.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-medium text-gray-900">{payroll.name}</h4>
                        <span className="text-sm text-gray-500">
                          {payroll.employees.length} employee{payroll.employees.length !== 1 ? 's' : ''}
                        </span>
                      </div>

                      {payroll.employees.length === 0 ? (
                        <div className="text-center py-6 text-gray-500">
                          <p>No employees in this payroll</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {payroll.employees.map((employee) => (
                            <div key={employee.id} className="bg-gray-50 rounded-lg p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h5 className="font-medium text-gray-900">{employee.name}</h5>
                                  <p className="text-sm text-gray-600">{employee.position}</p>
                                  <p className="text-xs text-gray-500 mt-1 font-mono">
                                    {employee.address.slice(0, 8)}...{employee.address.slice(-8)}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium text-gray-900">{(employee.salary / 1000000).toFixed(2)} ALGO</p>
                                  <p className="text-xs text-gray-500">Monthly</p>
                                </div>
                              </div>
                              <div className="mt-3 flex items-center justify-between">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    employee.status === 'active'
                                      ? 'bg-green-100 text-green-800'
                                      : employee.status === 'paused'
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : 'bg-gray-100 text-gray-800'
                                  }`}
                                >
                                  {employee.status}
                                </span>
                                <span className="text-xs text-gray-500">Added {new Date(employee.addedAt).toLocaleDateString()}</span>
                              </div>
                              <div className="mt-3 flex space-x-2">
                                <button
                                  onClick={() => setEditingEmployee(employee)}
                                  className="flex-1 bg-blue-600 text-white py-1 px-2 rounded text-xs hover:bg-blue-700 transition-colors"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm(`Are you sure you want to remove ${employee.name}?`)) {
                                      removeEmployee(payroll.id, employee.id)
                                    }
                                  }}
                                  className="flex-1 bg-red-600 text-white py-1 px-2 rounded text-xs hover:bg-red-700 transition-colors"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Edit Employee Modal */}
        {editingEmployee && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Edit Employee</h3>
                <button onClick={() => setEditingEmployee(null)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee Name</label>
                  <input
                    type="text"
                    value={editingEmployee.name}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter employee name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                  <input
                    type="text"
                    value={editingEmployee.position}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, position: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter position"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Salary (ALGO)</label>
                  <input
                    type="number"
                    value={(editingEmployee.salary / 1000000).toFixed(2)}
                    onChange={(e) =>
                      setEditingEmployee({
                        ...editingEmployee,
                        salary: Math.floor(parseFloat(e.target.value) * 1000000),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter salary in ALGO"
                    step="0.01"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={editingEmployee.status}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Algorand Address</label>
                  <input
                    type="text"
                    value={editingEmployee.address}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
                    placeholder="Address cannot be changed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Address cannot be changed for security reasons</p>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => setEditingEmployee(null)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const payroll = payrolls.find((p) => p.employees.some((emp) => emp.id === editingEmployee.id))
                      if (payroll) {
                        editEmployee(payroll.id, editingEmployee.id, editingEmployee)
                      }
                    }}
                    disabled={!editingEmployee.name || !editingEmployee.position || loading}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Updating...' : 'Update Employee'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Payroll Modal */}
        {editingPayroll && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Edit Payroll</h3>
                <button onClick={() => setEditingPayroll(null)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payroll Name</label>
                  <input
                    type="text"
                    value={editingPayroll.name}
                    onChange={(e) => setEditingPayroll({ ...editingPayroll, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter payroll name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={editingPayroll.description || ''}
                    onChange={(e) => setEditingPayroll({ ...editingPayroll, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter payroll description"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={editingPayroll.status}
                    onChange={(e) => setEditingPayroll({ ...editingPayroll, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ASA ID</label>
                  <input
                    type="number"
                    value={editingPayroll.asaId || 0}
                    onChange={(e) => setEditingPayroll({ ...editingPayroll, asaId: (parseInt(e.target.value) || 0).toString() })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter ASA ID"
                    min="0"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => setEditingPayroll(null)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => editPayroll(editingPayroll.id, editingPayroll)}
                    disabled={!editingPayroll.name || loading}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Updating...' : 'Update Payroll'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default PayrollPage
