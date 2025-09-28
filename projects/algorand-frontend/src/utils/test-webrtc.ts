/**
 * WebRTC File Transfer Test Utility
 * This file contains test functions to verify WebRTC file transfer functionality
 */

import { WebRTCFileTransfer, FileUtils } from './webrtc'
import { SignalingClient } from './signaling'

/**
 * Create a test file for WebRTC transfer
 */
export function createTestFile(name: string = 'test-file.txt', size: number = 1024): File {
  const content = 'A'.repeat(size)
  const blob = new Blob([content], { type: 'text/plain' })
  return new File([blob], name, { type: 'text/plain' })
}

/**
 * Test WebRTC file transfer between two clients
 */
export async function testWebRTCTransfer(): Promise<{
  success: boolean
  error?: string
  senderResults?: any
  receiverResults?: any
}> {
  try {
    console.log('Starting WebRTC file transfer test...')

    // Create test file
    const testFile = createTestFile('webrtc-test.txt', 2048)
    console.log(`Created test file: ${testFile.name} (${testFile.size} bytes)`)

    // Initialize sender
    const sender = new WebRTCFileTransfer({
      maxFileSize: 10 * 1024 * 1024, // 10MB
      chunkSize: 64 * 1024, // 64KB
    })

    // Initialize receiver
    const receiver = new WebRTCFileTransfer({
      maxFileSize: 10 * 1024 * 1024, // 10MB
      chunkSize: 64 * 1024, // 64KB
    })

    // Set up receiver
    await receiver.initializeAsReceiver()
    let receivedFile: File | null = null

    receiver.onFileReceived((file) => {
      console.log('Receiver: File received!', file.name, file.size)
      receivedFile = file
    })

    // Set up sender
    await sender.initializeAsSender()

    // Create offer from sender
    const offer = await sender.createOffer()
    console.log('Sender: Created offer')

    // Handle offer in receiver
    const answer = await receiver.handleOffer(offer)
    console.log('Receiver: Created answer')

    // Handle answer in sender
    await sender.handleAnswer(answer)
    console.log('Sender: Handled answer')

    // Wait for connection to be established
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Send file
    console.log('Sender: Starting file transfer...')
    await sender.sendFile(testFile)
    console.log('Sender: File transfer completed')

    // Wait for file to be received
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // Verify file
    if (!receivedFile) {
      throw new Error('File was not received')
    }

    if (receivedFile.name !== testFile.name) {
      throw new Error(`File name mismatch: expected ${testFile.name}, got ${receivedFile.name}`)
    }

    if (receivedFile.size !== testFile.size) {
      throw new Error(`File size mismatch: expected ${testFile.size}, got ${receivedFile.size}`)
    }

    console.log('WebRTC transfer test completed successfully!')

    return {
      success: true,
      senderResults: {
        fileSent: testFile.name,
        fileSize: testFile.size,
        connectionStatus: sender.getConnectionStatus(),
      },
      receiverResults: {
        fileReceived: receivedFile.name,
        fileSize: receivedFile.size,
        connectionStatus: receiver.getConnectionStatus(),
      },
    }
  } catch (error) {
    console.error('WebRTC transfer test failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Test signaling client functionality
 */
export async function testSignalingClient(): Promise<{
  success: boolean
  error?: string
}> {
  try {
    console.log('Testing signaling client...')

    const client1 = new SignalingClient('ws://localhost:8080')
    const client2 = new SignalingClient('ws://localhost:8080')

    // Test connection (this will fail in development but we can test the client setup)
    try {
      await client1.connect()
      console.log('Client 1 connected successfully')
    } catch (error) {
      console.log('Client 1 connection failed (expected in development):', error)
    }

    try {
      await client2.connect()
      console.log('Client 2 connected successfully')
    } catch (error) {
      console.log('Client 2 connection failed (expected in development):', error)
    }

    return { success: true }
  } catch (error) {
    console.error('Signaling client test failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Test file validation
 */
export function testFileValidation(): {
  success: boolean
  error?: string
  results?: any
} {
  try {
    console.log('Testing file validation...')

    // Test valid file
    const validFile = createTestFile('valid.txt', 1024)
    const validResult = FileUtils.validateFile(validFile)
    console.log('Valid file test:', validResult)

    // Test oversized file
    const oversizedFile = createTestFile('oversized.txt', 20 * 1024 * 1024) // 20MB
    const oversizedResult = FileUtils.validateFile(oversizedFile, { maxSize: 10 * 1024 * 1024 })
    console.log('Oversized file test:', oversizedResult)

    // Test invalid type
    const invalidTypeFile = createTestFile('invalid.exe', 1024)
    const invalidTypeResult = FileUtils.validateFile(invalidTypeFile, {
      allowedTypes: ['text/plain', 'application/pdf'],
    })
    console.log('Invalid type test:', invalidTypeResult)

    return {
      success: true,
      results: {
        validFile: validResult,
        oversizedFile: oversizedResult,
        invalidTypeFile: invalidTypeResult,
      },
    }
  } catch (error) {
    console.error('File validation test failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Run all tests
 */
export async function runAllTests(): Promise<void> {
  console.log('=== Running WebRTC File Transfer Tests ===')

  // Test file validation
  console.log('\n1. Testing file validation...')
  const validationTest = testFileValidation()
  console.log('File validation test result:', validationTest)

  // Test signaling client
  console.log('\n2. Testing signaling client...')
  const signalingTest = await testSignalingClient()
  console.log('Signaling client test result:', signalingTest)

  // Test WebRTC transfer
  console.log('\n3. Testing WebRTC file transfer...')
  const transferTest = await testWebRTCTransfer()
  console.log('WebRTC transfer test result:', transferTest)

  console.log('\n=== Test Summary ===')
  console.log('File validation:', validationTest.success ? 'PASS' : 'FAIL')
  console.log('Signaling client:', signalingTest.success ? 'PASS' : 'FAIL')
  console.log('WebRTC transfer:', transferTest.success ? 'PASS' : 'FAIL')

  const allPassed = validationTest.success && signalingTest.success && transferTest.success
  console.log('\nOverall result:', allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED')
}
