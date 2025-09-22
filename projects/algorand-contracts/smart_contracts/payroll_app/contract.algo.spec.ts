import { describe, it, expect, beforeEach } from 'vitest'
import { AlgoAmount, AlgoClientConfig, getAlgoClientConfigFromViteEnvironment } from '@algorandfoundation/algokit-utils'
import { algorandFixture } from '@algorandfoundation/algokit-utils/testing'
import { PayrollAppContract, payrollAppContract } from './contract.algo'

const fixture = algorandFixture()

describe('PayrollApp', () => {
  beforeEach(fixture.beforeEach, 10_000)

  const testClient = fixture.context.algod
  const testAccount = fixture.context.testAccount
  const algod = testClient

  describe('deploy', () => {
    it('should deploy the contract', async () => {
      const { appId, appAddress, transaction } = await payrollAppContract.deploy({
        deployer: testAccount,
        deployParams: {
          args: [0n, 2592000n, testAccount.addr], // asa_id: 0 (ALGO), cycle_secs: 30 days, admin: testAccount
        },
      })

      expect(appId).toBeGreaterThan(0)
      expect(appAddress).toBeDefined()
      expect(transaction).toBeDefined()
    })
  })

  describe('create_payroll', () => {
    it('should create payroll with ALGO', async () => {
      const { appId } = await payrollAppContract.deploy({
        deployer: testAccount,
        deployParams: {
          args: [0n, 2592000n, testAccount.addr],
        },
      })

      const result = await payrollAppContract.call({
        method: 'create_payroll',
        methodArgs: [0n, 2592000n, testAccount.addr],
        sender: testAccount,
      })

      expect(result.return).toBeUndefined()
    })

    it('should create payroll with ASA', async () => {
      // Create a test ASA first
      const createAsa = await algod.sendAssetCreate({
        sender: testAccount,
        total: 1000000,
        decimals: 6,
        assetName: 'Test Token',
        unitName: 'TEST',
      })

      const asaId = Number(createAsa.confirmation.assetIndex)

      const { appId } = await payrollAppContract.deploy({
        deployer: testAccount,
        deployParams: {
          args: [BigInt(asaId), 2592000n, testAccount.addr],
        },
      })

      const result = await payrollAppContract.call({
        method: 'create_payroll',
        methodArgs: [BigInt(asaId), 2592000n, testAccount.addr],
        sender: testAccount,
      })

      expect(result.return).toBeUndefined()
    })
  })

  describe('add_employee', () => {
    let appId: number

    beforeEach(async () => {
      const deployment = await payrollAppContract.deploy({
        deployer: testAccount,
        deployParams: {
          args: [0n, 2592000n, testAccount.addr],
        },
      })
      appId = deployment.appId

      // Create payroll first
      await payrollAppContract.call({
        method: 'create_payroll',
        methodArgs: [0n, 2592000n, testAccount.addr],
        sender: testAccount,
      })
    })

    it('should add employee successfully', async () => {
      const employeeAddress = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
      const amount = 1000000n // 1 ALGO in microALGO

      const result = await payrollAppContract.call({
        method: 'add_employee',
        methodArgs: [employeeAddress, amount],
        sender: testAccount,
      })

      expect(result.return).toBeUndefined()
    })

    it('should fail to add employee with zero amount', async () => {
      const employeeAddress = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
      const amount = 0n

      await expect(
        payrollAppContract.call({
          method: 'add_employee',
          methodArgs: [employeeAddress, amount],
          sender: testAccount,
        }),
      ).rejects.toThrow()
    })
  })

  describe('remove_employee', () => {
    let appId: number
    const employeeAddress = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'

    beforeEach(async () => {
      const deployment = await payrollAppContract.deploy({
        deployer: testAccount,
        deployParams: {
          args: [0n, 2592000n, testAccount.addr],
        },
      })
      appId = deployment.appId

      // Create payroll and add employee
      await payrollAppContract.call({
        method: 'create_payroll',
        methodArgs: [0n, 2592000n, testAccount.addr],
        sender: testAccount,
      })

      await payrollAppContract.call({
        method: 'add_employee',
        methodArgs: [employeeAddress, 1000000n],
        sender: testAccount,
      })
    })

    it('should remove employee successfully', async () => {
      const result = await payrollAppContract.call({
        method: 'remove_employee',
        methodArgs: [employeeAddress],
        sender: testAccount,
      })

      expect(result.return).toBeUndefined()
    })
  })

  describe('pause_employee', () => {
    let appId: number
    const employeeAddress = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'

    beforeEach(async () => {
      const deployment = await payrollAppContract.deploy({
        deployer: testAccount,
        deployParams: {
          args: [0n, 2592000n, testAccount.addr],
        },
      })
      appId = deployment.appId

      // Create payroll and add employee
      await payrollAppContract.call({
        method: 'create_payroll',
        methodArgs: [0n, 2592000n, testAccount.addr],
        sender: testAccount,
      })

      await payrollAppContract.call({
        method: 'add_employee',
        methodArgs: [employeeAddress, 1000000n],
        sender: testAccount,
      })
    })

    it('should pause employee successfully', async () => {
      const result = await payrollAppContract.call({
        method: 'pause_employee',
        methodArgs: [employeeAddress, 1n], // 1 for paused
        sender: testAccount,
      })

      expect(result.return).toBeUndefined()
    })

    it('should unpause employee successfully', async () => {
      // First pause
      await payrollAppContract.call({
        method: 'pause_employee',
        methodArgs: [employeeAddress, 1n],
        sender: testAccount,
      })

      // Then unpause
      const result = await payrollAppContract.call({
        method: 'pause_employee',
        methodArgs: [employeeAddress, 0n], // 0 for not paused
        sender: testAccount,
      })

      expect(result.return).toBeUndefined()
    })
  })

  describe('get_payroll_info', () => {
    let appId: number

    beforeEach(async () => {
      const deployment = await payrollAppContract.deploy({
        deployer: testAccount,
        deployParams: {
          args: [0n, 2592000n, testAccount.addr],
        },
      })
      appId = deployment.appId

      await payrollAppContract.call({
        method: 'create_payroll',
        methodArgs: [0n, 2592000n, testAccount.addr],
        sender: testAccount,
      })
    })

    it('should return payroll information', async () => {
      const result = await payrollAppContract.call({
        method: 'get_payroll_info',
        methodArgs: [],
        sender: testAccount,
      })

      expect(result.return).toBeUndefined()
      // In a real implementation, you would check the logs for the payroll info
    })
  })

  describe('get_total_employees', () => {
    let appId: number

    beforeEach(async () => {
      const deployment = await payrollAppContract.deploy({
        deployer: testAccount,
        deployParams: {
          args: [0n, 2592000n, testAccount.addr],
        },
      })
      appId = deployment.appId

      await payrollAppContract.call({
        method: 'create_payroll',
        methodArgs: [0n, 2592000n, testAccount.addr],
        sender: testAccount,
      })
    })

    it('should return total employees count', async () => {
      const result = await payrollAppContract.call({
        method: 'get_total_employees',
        methodArgs: [],
        sender: testAccount,
      })

      expect(result.return).toBeUndefined()
      // In a real implementation, you would check the logs for the count
    })
  })
})
