/**
 * WebRTC File Transfer Test
 * This file contains a simple test to verify WebRTC functionality
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
 * Test WebRTC connection setup
 */
export async function testWebRTCSetup(): Promise<{
  success: boolean
  error?: string
  results?: any
}> {
  try {
    console.log('Testing WebRTC setup...')

    // Create sender
    const sender = new WebRTCFileTransfer({
      maxFileSize: 10 * 1024 * 1024, // 10MB
      chunkSize: 64 * 1024, // 64KB
    })

    // Create receiver
    const receiver = new WebRTCFileTransfer({
      maxFileSize: 10 * 1024 * 1024, // 10MB
      chunkSize: 64 * 1024, // 64KB
    })

    // Initialize sender
    await sender.initializeAsSender()
    console.log('✅ Sender initialized')

    // Initialize receiver
    await receiver.initializeAsReceiver()
    console.log('✅ Receiver initialized')

    // Create offer
    const offer = await sender.createOffer()
    console.log('✅ Offer created')

    // Handle offer and create answer
    const answer = await receiver.handleOffer(offer)
    console.log('✅ Answer created')

    // Handle answer
    await sender.handleAnswer(answer)
    console.log('✅ Answer handled')

    // Test file creation
    const testFile = createTestFile('webrtc-test.txt', 2048)
    console.log('✅ Test file created:', testFile.name, testFile.size)

    // Test file validation
    const validation = sender.validateFile?.(testFile)
    console.log('✅ File validation:', validation)

    return {
      success: true,
      results: {
        senderStatus: sender.getConnectionStatus(),
        receiverStatus: receiver.getConnectionStatus(),
        testFile: {
          name: testFile.name,
          size: testFile.size,
          type: testFile.type,
        },
      },
    }
  } catch (error) {
    console.error('❌ WebRTC setup test failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Run the test
 */
export async function runWebRTCTest(): Promise<void> {
  console.log('🧪 Running WebRTC Test...')

  const result = await testWebRTCSetup()

  if (result.success) {
    console.log('✅ WebRTC test passed!')
    console.log('Results:', result.results)
  } else {
    console.log('❌ WebRTC test failed:', result.error)
  }
}

// Auto-run test if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser environment
  runWebRTCTest().catch(console.error)
}
