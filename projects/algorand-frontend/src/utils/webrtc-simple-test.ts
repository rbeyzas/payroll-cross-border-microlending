/**
 * Simple WebRTC Test
 * Test the basic WebRTC functionality
 */

import { WebRTCFileTransfer } from './webrtc'

/**
 * Create a test file
 */
export function createTestFile(name: string = 'test-file.txt', size: number = 1024): File {
  const content = 'A'.repeat(size)
  const blob = new Blob([content], { type: 'text/plain' })
  return new File([blob], name, { type: 'text/plain' })
}

/**
 * Test WebRTC initialization
 */
export async function testWebRTCInitialization(): Promise<{
  success: boolean
  error?: string
}> {
  try {
    console.log('Testing WebRTC initialization...')

    // Test sender initialization
    const sender = new WebRTCFileTransfer()
    await sender.initializeAsSender()
    console.log('✅ Sender initialized')

    // Test receiver initialization
    const receiver = new WebRTCFileTransfer()
    await receiver.initializeAsReceiver()
    console.log('✅ Receiver initialized')

    // Test connection status
    console.log('Sender status:', sender.getConnectionStatus())
    console.log('Receiver status:', receiver.getConnectionStatus())

    // Test file creation
    const testFile = createTestFile('test.txt', 1024)
    console.log('✅ Test file created:', testFile.name, testFile.size)

    // Clean up
    sender.close()
    receiver.close()

    return { success: true }
  } catch (error) {
    console.error('❌ WebRTC initialization test failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Test WebRTC connection flow
 */
export async function testWebRTCConnection(): Promise<{
  success: boolean
  error?: string
}> {
  try {
    console.log('Testing WebRTC connection flow...')

    // Create sender and receiver
    const sender = new WebRTCFileTransfer()
    const receiver = new WebRTCFileTransfer()

    // Initialize both
    await sender.initializeAsSender()
    await receiver.initializeAsReceiver()

    // Create offer
    const offer = await sender.createOffer()
    console.log('✅ Offer created')

    // Handle offer and create answer
    const answer = await receiver.handleOffer(offer)
    console.log('✅ Answer created')

    // Handle answer
    await sender.handleAnswer(answer)
    console.log('✅ Answer handled')

    // Test connection status
    console.log('Sender status:', sender.getConnectionStatus())
    console.log('Receiver status:', receiver.getConnectionStatus())

    // Clean up
    sender.close()
    receiver.close()

    return { success: true }
  } catch (error) {
    console.error('❌ WebRTC connection test failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Run all tests
 */
export async function runWebRTCTests(): Promise<void> {
  console.log('🧪 Running WebRTC Tests...')

  // Test 1: Initialization
  console.log('\n1. Testing initialization...')
  const initResult = await testWebRTCInitialization()
  console.log('Initialization test:', initResult.success ? 'PASS' : 'FAIL')

  // Test 2: Connection flow
  console.log('\n2. Testing connection flow...')
  const connectionResult = await testWebRTCConnection()
  console.log('Connection test:', connectionResult.success ? 'PASS' : 'FAIL')

  // Summary
  console.log('\n=== Test Summary ===')
  console.log('Initialization:', initResult.success ? 'PASS' : 'FAIL')
  console.log('Connection flow:', connectionResult.success ? 'PASS' : 'FAIL')

  const allPassed = initResult.success && connectionResult.success
  console.log('\nOverall result:', allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED')
}

// Auto-run tests if this file is executed directly
if (typeof window !== 'undefined') {
  runWebRTCTests().catch(console.error)
}
