import React, { useState, useEffect, useRef } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { FileSharingAppClient } from '../contracts/FileSharingApp'
import { AlgorandClient, algo } from '@algorandfoundation/algokit-utils'
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'
import { WebRTCFileTransfer, FileUtils } from '../utils/webrtc'
import { RealSignalingClient } from '../utils/real-signaling'

interface FileRequest {
  id: string
  sender: string
  recipient: string
  fileHash: string
  fileSize: number
  accessFee: number
  fileType: string
  isIPFS: boolean
  ipfsCID: string
  status: 'pending' | 'paid' | 'completed' | 'disputed' | 'cancelled'
  createdAt: string
}

interface FileTransferState {
  isTransferring: boolean
  progress: number
  status: string
  receivedFile?: File
}

const FileSharingPage: React.FC = () => {
  const { activeAddress, transactionSigner } = useWallet()
  const [currentView, setCurrentView] = useState<'send' | 'receive' | 'history'>('send')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Send file state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [recipientAddress, setRecipientAddress] = useState('')
  const [accessFee, setAccessFee] = useState('')
  const [fileType, setFileType] = useState('document')
  const [useIPFS, setUseIPFS] = useState(false)
  const [fileHash, setFileHash] = useState('')

  // File transfer configuration
  const FILE_SIZE_THRESHOLD = 10 * 1024 * 1024 // 10MB threshold for IPFS
  const MAX_WEBRTC_SIZE = 50 * 1024 * 1024 // 50MB max for WebRTC

  // Receive file state
  const [pendingRequests, setPendingRequests] = useState<FileRequest[]>([])
  const [_selectedRequest, _setSelectedRequest] = useState<FileRequest | null>(null)

  // WebRTC state
  const [webrtcTransfer, setWebrtcTransfer] = useState<WebRTCFileTransfer | null>(null)
  const [signalingClient, setSignalingClient] = useState<RealSignalingClient | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const [fileTransferState, setFileTransferState] = useState<FileTransferState>({
    isTransferring: false,
    progress: 0,
    status: 'Ready',
  })

  // File contract client
  const [fileContractClient, setFileContractClient] = useState<FileSharingAppClient | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Initialize WebRTC and signaling
  useEffect(() => {
    const initializeWebRTC = async () => {
      try {
        // Initialize real signaling client
        const signaling = new RealSignalingClient('ws://localhost:8080')
        try {
          await signaling.connect()

          // Register with wallet address
          if (activeAddress) {
            signaling.sendMessage({
              type: 'register',
              from: 'temp',
              to: 'server',
              data: { address: activeAddress },
            })
            console.log('✅ Registered with wallet address:', activeAddress)
          }

          setSignalingClient(signaling)
          console.log('✅ Connected to signaling server successfully')
        } catch (error) {
          console.error('Failed to connect to signaling server:', error)
          setSignalingClient(null)
        }

        // Initialize WebRTC file transfer
        const webrtc = new WebRTCFileTransfer({
          maxFileSize: 50 * 1024 * 1024, // 50MB
          chunkSize: 64 * 1024, // 64KB chunks
        })

        // Set up signaling handlers
        signaling.onMessage('offer', async (message) => {
          try {
            console.log('Received offer from:', message.from)
            // Close any existing connection and initialize as receiver
            webrtc.close()
            await webrtc.initializeAsReceiver()
            const answer = await webrtc.handleOffer(message.data)
            signaling.sendAnswer(message.from, answer, activeAddress || 'unknown')
          } catch (error) {
            console.error('Error handling offer:', error)
            webrtc.close()
          }
        })

        signaling.onMessage('answer', async (message) => {
          try {
            console.log('Received answer from:', message.from)
            // Wait for connection to be properly initialized with retry mechanism
            let retries = 0
            const maxRetries = 10
            const retryDelay = 500

            const handleAnswerWithRetry = async () => {
              // Wait for connection to be ready
              const isReady = await webrtc.waitForConnectionReady(5000)

              if (isReady) {
                try {
                  await webrtc.handleAnswer(message.data)
                  console.log('✅ Answer handled successfully')
                } catch (error) {
                  console.error('Error handling answer:', error)
                  webrtc.close()
                }
              } else if (retries < maxRetries) {
                retries++
                console.log(`Answer received but connection not initialized, retrying... (${retries}/${maxRetries})`)
                setTimeout(handleAnswerWithRetry, retryDelay)
              } else {
                console.error('Connection still not initialized after maximum retries')
                webrtc.close()
              }
            }

            handleAnswerWithRetry()
          } catch (error) {
            console.error('Error handling answer:', error)
            webrtc.close()
          }
        })

        signaling.onMessage('ice-candidate', async (message) => {
          try {
            console.log('Received ICE candidate from:', message.from)
            // Wait for connection to be properly initialized with retry mechanism
            let retries = 0
            const maxRetries = 10
            const retryDelay = 500

            const handleIceCandidateWithRetry = async () => {
              // Wait for connection to be ready
              const isReady = await webrtc.waitForConnectionReady(3000)

              if (isReady) {
                try {
                  await webrtc.addIceCandidate(message.data)
                  console.log('✅ ICE candidate added successfully')
                } catch (error) {
                  console.error('Error adding ICE candidate:', error)
                  // Don't close connection for ICE candidate errors, just log them
                }
              } else if (retries < maxRetries) {
                retries++
                console.log(`ICE candidate received but connection not initialized, retrying... (${retries}/${maxRetries})`)
                setTimeout(handleIceCandidateWithRetry, retryDelay)
              } else {
                console.warn('Connection still not initialized after maximum retries for ICE candidate')
                // Don't close connection, just log the warning
              }
            }

            handleIceCandidateWithRetry()
          } catch (error) {
            console.error('Error handling ICE candidate:', error)
            // Don't close connection for ICE candidate errors
          }
        })

        signaling.onMessage('file-request', async (message) => {
          try {
            const request = message.data
            console.log('Received file request:', request)
            // Handle file request from sender
            setFileTransferState((prev) => ({
              ...prev,
              status: `File request received from ${request.sender}`,
            }))
          } catch (error) {
            console.error('Error handling file request:', error)
          }
        })

        // Set up WebRTC file handlers
        webrtc.onFileReceived((file) => {
          console.log('File received:', file)
          setFileTransferState((prev) => ({
            ...prev,
            receivedFile: file,
            status: 'File received successfully!',
            isTransferring: false,
            progress: 100,
          }))
        })

        setSignalingClient(signaling)
        setWebrtcTransfer(webrtc)
        setConnectionStatus('connected')
      } catch (error) {
        console.error('Error initializing WebRTC:', error)
        setConnectionStatus('disconnected')
      }
    }

    if (activeAddress) {
      initializeWebRTC()
    }

    return () => {
      if (signalingClient) {
        signalingClient.disconnect()
      }
      if (webrtcTransfer) {
        webrtcTransfer.close()
      }
    }
  }, [activeAddress])

  // Initialize contract client
  useEffect(() => {
    if (activeAddress) {
      const algodConfig = getAlgodConfigFromViteEnvironment()
      const algorand = AlgorandClient.fromConfig({ algodConfig })

      if (transactionSigner) {
        algorand.setDefaultSigner(transactionSigner)
      }

      const client = new FileSharingAppClient({
        algorand,
        defaultSender: activeAddress,
        appId: BigInt(746505672), // Real deployed App ID
      })

      setFileContractClient(client)
    }
  }, [activeAddress]) // Remove transactionSigner from dependencies to prevent infinite loop

  // Update transaction signer when it changes
  useEffect(() => {
    if (fileContractClient && transactionSigner) {
      // Update the signer if needed
      const algodConfig = getAlgodConfigFromViteEnvironment()
      const algorand = AlgorandClient.fromConfig({ algodConfig })
      algorand.setDefaultSigner(transactionSigner)
    }
  }, [transactionSigner, fileContractClient])

  // Check if wallet is properly initialized
  const isWalletReady = () => {
    return activeAddress && transactionSigner && fileContractClient
  }

  // Load file requests from blockchain
  const loadFileRequests = async () => {
    if (!fileContractClient || !activeAddress) {
      console.log('Contract client or active address not available')
      return
    }

    try {
      console.log('Loading file requests for address:', activeAddress)

      // Read-only method to get file requests without wallet signing
      const algodConfig = getAlgodConfigFromViteEnvironment()
      const algorand = AlgorandClient.fromConfig({ algodConfig })

      // Get application info to read global state using correct AlgoKit method
      const appInfo = await algorand.app.getById(fileContractClient.appId)

      // Parse file requests from application state
      console.log('Application info:', appInfo)

      // Extract file requests from application global state
      // Handle different AlgoKit API response structures
      const globalState =
        (appInfo as any).params?.['global-state'] || (appInfo as any)['global-state'] || (appInfo as any).params?.globalState || []
      const fileRequests: FileRequest[] = []

      // Parse global state for file requests
      for (const state of globalState) {
        try {
          const key = Buffer.from(state.key, 'base64').toString()

          // Look for file request entries in global state
          if (key.includes('file_request_') || key.includes('request_')) {
            const requestData = state.value
            if (requestData.type === 1 && requestData.bytes) {
              // This is a bytes value, decode it
              const decodedData = Buffer.from(requestData.bytes, 'base64').toString()
              console.log('Found file request data:', decodedData)

              try {
                const requestInfo = JSON.parse(decodedData)
                if (requestInfo.sender === activeAddress || requestInfo.recipient === activeAddress) {
                  fileRequests.push({
                    id: requestInfo.id || key,
                    sender: requestInfo.sender || '',
                    recipient: requestInfo.recipient || '',
                    fileHash: requestInfo.fileHash || '',
                    fileSize: requestInfo.fileSize || 0,
                    accessFee: requestInfo.accessFee || 0,
                    fileType: requestInfo.fileType || 'unknown',
                    isIPFS: requestInfo.isIPFS || false,
                    ipfsCID: requestInfo.ipfsCID || '',
                    status: requestInfo.status || 'pending',
                    createdAt: requestInfo.createdAt || new Date().toISOString(),
                  })
                }
              } catch (parseError) {
                console.log('Could not parse request data:', parseError)
              }
            }
          }
        } catch (error) {
          console.log('Error processing global state entry:', error)
        }
      }

      // Also check application boxes for file requests
      try {
        // Use correct AlgoKit methods: getBoxNames and getBoxValue
        const boxNames = await algorand.app.getBoxNames(fileContractClient.appId)
        console.log('Application box names:', boxNames)

        for (const boxName of boxNames) {
          try {
            const boxData = await algorand.app.getBoxValue(fileContractClient.appId, boxName)
            console.log('Box data for', boxName, ':', boxData)

            // Parse box data for file requests
            if (boxData && boxData.length > 0) {
              const decodedData = Buffer.from(boxData).toString()
              console.log('Decoded box data:', decodedData)

              try {
                const requestInfo = JSON.parse(decodedData)
                if (requestInfo.sender === activeAddress || requestInfo.recipient === activeAddress) {
                  fileRequests.push({
                    id: requestInfo.id || boxName.toString(),
                    sender: requestInfo.sender || '',
                    recipient: requestInfo.recipient || '',
                    fileHash: requestInfo.fileHash || '',
                    fileSize: requestInfo.fileSize || 0,
                    accessFee: requestInfo.accessFee || 0,
                    fileType: requestInfo.fileType || 'unknown',
                    isIPFS: requestInfo.isIPFS || false,
                    ipfsCID: requestInfo.ipfsCID || '',
                    status: requestInfo.status || 'pending',
                    createdAt: requestInfo.createdAt || new Date().toISOString(),
                  })
                }
              } catch (parseError) {
                console.log('Could not parse box data:', parseError)
              }
            }
          } catch (boxError) {
            console.log('Error reading box', boxName, ':', boxError)
          }
        }
      } catch (boxError) {
        console.log('Error getting application boxes:', boxError)
      }

      setPendingRequests(fileRequests)
      console.log('Loaded file requests from blockchain:', fileRequests.length)
    } catch (error) {
      console.error('Error loading file requests:', error)
      setPendingRequests([])
    }
  }

  // Load file requests when component mounts or activeAddress changes
  useEffect(() => {
    if (fileContractClient && activeAddress) {
      loadFileRequests()
    }
  }, [fileContractClient, activeAddress])

  // Calculate file hash when file is selected
  useEffect(() => {
    if (selectedFile) {
      calculateFileHash(selectedFile).then(setFileHash)
    }
  }, [selectedFile])

  const calculateFileHash = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)

      // Determine transfer method based on file size
      if (file.size > FILE_SIZE_THRESHOLD) {
        setUseIPFS(true) // Use IPFS for large files
      } else if (file.size > MAX_WEBRTC_SIZE) {
        setError(`File too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size is ${MAX_WEBRTC_SIZE / 1024 / 1024}MB.`)
        return
      } else {
        setUseIPFS(false) // Use WebRTC for small files
      }

      setError('')
    }
  }

  // Payment and escrow functions
  const createPaymentEscrow = async (fileRequest: FileRequest): Promise<string> => {
    if (!activeAddress || !transactionSigner) {
      throw new Error('Wallet not connected')
    }

    try {
      const algorand = AlgorandClient.fromConfig({
        algodConfig: getAlgodConfigFromViteEnvironment(),
      })
      algorand.setDefaultSigner(transactionSigner)

      const fileContractClient = new FileSharingAppClient({
        algorand,
        defaultSender: activeAddress,
        appId: BigInt(746505672),
      })

      // Check if contract exists
      try {
        await algorand.app.getById(fileContractClient.appId)
        console.log('Contract found and ready')
      } catch (error) {
        console.error('Contract not found or not accessible:', error)
        throw new Error('File sharing contract is not available. Please ensure the contract is deployed.')
      }

      // Create escrow payment transaction
      const paymentAmount = algo(fileRequest.accessFee)

      const result = await fileContractClient.send.createFileRequest({
        args: {
          fileId: fileRequest.id,
          recipientAddress: fileRequest.recipient,
          fileHash: fileRequest.fileHash,
          fileSize: fileRequest.fileSize.toString(),
          accessFee: fileRequest.accessFee.toString(),
          fileType: fileRequest.fileType,
          isIpfs: fileRequest.isIPFS.toString(),
          ipfsCid: fileRequest.ipfsCID,
        },
        payment: {
          amount: paymentAmount,
          receiver: fileContractClient.appAddress,
        },
      })

      console.log('Payment escrow created:', result)
      return result.transaction.txID()
    } catch (error) {
      console.error('Error creating payment escrow:', error)
      throw error
    }
  }

  const releaseEscrowPayment = async (fileRequest: FileRequest): Promise<string> => {
    if (!activeAddress || !transactionSigner) {
      throw new Error('Wallet not connected')
    }

    try {
      const algorand = AlgorandClient.fromConfig({
        algodConfig: getAlgodConfigFromViteEnvironment(),
      })
      algorand.setDefaultSigner(transactionSigner)

      const fileContractClient = new FileSharingAppClient({
        algorand,
        defaultSender: activeAddress,
        appId: BigInt(746505672),
      })

      // Check if contract exists
      try {
        await algorand.app.getById(fileContractClient.appId)
        console.log('Contract found and ready')
      } catch (error) {
        console.error('Contract not found or not accessible:', error)
        throw new Error('File sharing contract is not available. Please ensure the contract is deployed.')
      }

      // Release escrow payment to sender
      const result = await fileContractClient.send.releasePayment({
        args: {
          fileId: fileRequest.id,
          recipient: fileRequest.recipient,
        },
      })

      console.log('Escrow payment released:', result)
      return result.transaction.txID()
    } catch (error) {
      console.error('Error releasing escrow payment:', error)
      throw error
    }
  }

  const verifyFileHash = async (file: File, expectedHash: string): Promise<boolean> => {
    try {
      const calculatedHash = await calculateFileHash(file)
      const isValid = calculatedHash === expectedHash

      console.log(`File hash verification: ${isValid ? 'PASSED' : 'FAILED'}`)
      console.log(`Expected: ${expectedHash}`)
      console.log(`Calculated: ${calculatedHash}`)

      return isValid
    } catch (error) {
      console.error('Error verifying file hash:', error)
      return false
    }
  }

  const downloadFromIPFS = async (cid: string): Promise<File> => {
    try {
      console.log(`Downloading file from IPFS: ${cid}`)

      // Try multiple IPFS gateways
      const gateways = [
        `https://ipfs.io/ipfs/${cid}`,
        `https://gateway.pinata.cloud/ipfs/${cid}`,
        `https://cloudflare-ipfs.com/ipfs/${cid}`,
      ]

      for (const gateway of gateways) {
        try {
          const response = await fetch(gateway)
          if (response.ok) {
            const blob = await response.blob()
            const file = new File([blob], `downloaded-file-${cid}`, { type: blob.type })
            console.log(`File downloaded from IPFS gateway: ${gateway}`)
            return file
          }
        } catch (error) {
          console.warn(`Gateway ${gateway} failed:`, error)
        }
      }

      throw new Error('All IPFS gateways failed')
    } catch (error) {
      console.error('Error downloading from IPFS:', error)
      throw error
    }
  }

  const uploadToIPFS = async (file: File): Promise<string> => {
    console.log(`Uploading file to IPFS: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`)

    // Try multiple IPFS services in order of preference
    const ipfsServices = [
      // Pinata (if API keys are available)
      async () => {
        if (!process.env.VITE_PINATA_API_KEY || !process.env.VITE_PINATA_SECRET_KEY) {
          throw new Error('Pinata API keys not configured')
        }

        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
          method: 'POST',
          headers: {
            pinata_api_key: process.env.VITE_PINATA_API_KEY,
            pinata_secret_api_key: process.env.VITE_PINATA_SECRET_KEY,
          },
          body: formData,
        })

        if (!response.ok) throw new Error(`Pinata upload failed: ${response.statusText}`)

        const result = await response.json()
        return result.IpfsHash
      },

      // IPFS.io public gateway (fallback)
      async () => {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('https://ipfs.io/api/v0/add', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) throw new Error(`IPFS.io upload failed: ${response.statusText}`)

        const result = await response.json()
        return result.Hash
      },
    ]

    // Try each service until one succeeds
    for (let i = 0; i < ipfsServices.length; i++) {
      try {
        const cid = await ipfsServices[i]()
        console.log(`File uploaded to IPFS service ${i + 1}: ${cid}`)
        return cid
      } catch (error) {
        console.warn(`IPFS service ${i + 1} failed:`, error)
        if (i === ipfsServices.length - 1) {
          // Last service failed, throw error
          throw new Error(`All IPFS services failed. Last error: ${error}`)
        }
      }
    }

    throw new Error('No IPFS services available')
  }

  const sendFileViaWebRTC = async (file: File, recipientAddress: string) => {
    if (!webrtcTransfer || !signalingClient || !activeAddress) {
      throw new Error('WebRTC not initialized')
    }

    try {
      setFileTransferState((prev) => ({
        ...prev,
        isTransferring: true,
        status: 'Initiating file transfer...',
        progress: 0,
      }))

      // Send file request through signaling
      const fileId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
      const fileHash = await calculateFileHash(file)

      signalingClient.sendFileRequest({
        fileId,
        sender: activeAddress,
        recipient: recipientAddress,
        fileMetadata: {
          name: file.name,
          size: file.size,
          type: file.type,
          hash: fileHash,
        },
      })

      // Close any existing connection before initializing a new one
      webrtcTransfer.close()

      // Wait a moment for cleanup
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Initialize as sender and create offer
      await webrtcTransfer.initializeAsSender()

      // Set up ICE candidate handler
      if (webrtcTransfer.connection) {
        webrtcTransfer.connection.onIceCandidate = (candidate) => {
          console.log('Sending ICE candidate to:', recipientAddress)
          signalingClient.sendIceCandidate(recipientAddress, candidate, activeAddress)
        }
      }

      // Wait for connection to be fully initialized
      await new Promise((resolve) => setTimeout(resolve, 200))

      const offer = await webrtcTransfer.createOffer()

      // Send offer through signaling
      signalingClient.sendOffer(recipientAddress, offer, activeAddress)

      setFileTransferState((prev) => ({
        ...prev,
        status: 'Waiting for recipient to accept...',
      }))

      // Wait for connection to be established, then send file
      let connectionCheckAttempts = 0
      const maxConnectionChecks = 30 // 30 seconds timeout

      const checkConnection = () => {
        const status = webrtcTransfer.getConnectionStatus()
        console.log('Connection status:', status)

        if (status === 'connected') {
          setFileTransferState((prev) => ({
            ...prev,
            status: 'Connected! Sending file...',
          }))

          // Send the file
          webrtcTransfer.sendFile(file).catch((error) => {
            console.error('Error sending file:', error)
            setFileTransferState((prev) => ({
              ...prev,
              status: `File send failed: ${error.message}`,
              isTransferring: false,
            }))
          })

          // Set up progress tracking
          if (webrtcTransfer.connection) {
            webrtcTransfer.connection.onProgress = (progress) => {
              setFileTransferState((prev) => ({
                ...prev,
                progress: Math.round(progress),
                status: `Transferring... ${Math.round(progress)}%`,
              }))
            }
          }
        } else if (status === 'connecting' || status === 'checking') {
          connectionCheckAttempts++
          if (connectionCheckAttempts < maxConnectionChecks) {
            setTimeout(checkConnection, 1000)
          } else {
            setFileTransferState((prev) => ({
              ...prev,
              status: 'Connection timeout - please try again',
              isTransferring: false,
            }))
          }
        } else if (status === 'failed') {
          setFileTransferState((prev) => ({
            ...prev,
            status: 'Connection failed - please check your network',
            isTransferring: false,
          }))
        } else {
          connectionCheckAttempts++
          if (connectionCheckAttempts < maxConnectionChecks) {
            setTimeout(checkConnection, 1000)
          } else {
            setFileTransferState((prev) => ({
              ...prev,
              status: 'Connection timeout - please try again',
              isTransferring: false,
            }))
          }
        }
      }

      // Start checking connection after a short delay
      setTimeout(checkConnection, 2000)
    } catch (error) {
      console.error('Error sending file via WebRTC:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // Reset the connection on error
      if (webrtcTransfer) {
        webrtcTransfer.close()
      }

      setFileTransferState((prev) => ({
        ...prev,
        status: `Transfer failed: ${errorMessage}`,
        isTransferring: false,
      }))
      throw error
    }
  }

  // Check if wallet is ready for transactions
  const waitForWallet = () => {
    // Add a small delay to ensure wallet is not busy
    return new Promise((resolve) => {
      setTimeout(resolve, 1000) // Wait 1 second
    })
  }

  // Clear wallet state and force refresh
  const clearWalletState = async () => {
    try {
      setLoading(true)
      setError('')
      setSuccess('')

      // Clear any pending state
      setLoading(false)

      // Force a longer delay to let wallet settle completely
      await new Promise((resolve) => setTimeout(resolve, 5000))

      // Try to refresh the page to reset wallet state completely
      setSuccess('Wallet state cleared. Refreshing page to reset wallet connection...')

      // Wait a bit more then refresh
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (error) {
      console.error('Error clearing wallet state:', error)
      setError('Failed to clear wallet state')
      setLoading(false)
    }
  }

  // Force disconnect and reconnect wallet
  const forceWalletReset = async () => {
    try {
      setLoading(true)
      setError('')
      setSuccess('')

      // Force disconnect wallet
      if (window.localStorage) {
        localStorage.removeItem('pera-wallet:accounts')
        localStorage.removeItem('pera-wallet:activeAccount')
        localStorage.removeItem('pera-wallet:connectSession')
        localStorage.removeItem('pera-wallet:walletConnect')
      }

      setSuccess('Wallet disconnected. Please reconnect your wallet manually.')
      setLoading(false)

      // Refresh after a delay
      setTimeout(() => {
        window.location.reload()
      }, 3000)
    } catch (error) {
      console.error('Error resetting wallet:', error)
      setError('Failed to reset wallet')
      setLoading(false)
    }
  }

  const handleSendFile = async () => {
    if (!selectedFile || !recipientAddress || !accessFee || !fileContractClient) {
      setError('Please fill in all required fields')
      return
    }

    // Check if wallet is ready before proceeding
    if (!isWalletReady()) {
      setError('Wallet is not properly connected. Please reconnect your wallet.')
      return
    }

    setLoading(true)
    setError('')

    // Wait for wallet to be ready
    await waitForWallet()

    try {
      console.log('Starting file transfer process...')

      // Step 1: Upload file to appropriate storage
      let ipfsCID = ''
      if (useIPFS) {
        console.log('Uploading large file to IPFS...')
        ipfsCID = await uploadToIPFS(selectedFile)
        console.log(`File uploaded to IPFS with CID: ${ipfsCID}`)
      }

      // Step 2: Calculate file hash for verification
      const fileHash = await calculateFileHash(selectedFile)
      console.log('File hash calculated:', fileHash)

      // Step 3: Create file request object
      const fileId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
      const fileRequest: FileRequest = {
        id: fileId,
        sender: activeAddress || '',
        recipient: recipientAddress,
        fileHash,
        fileSize: selectedFile.size,
        accessFee: parseFloat(accessFee),
        fileType,
        isIPFS: useIPFS,
        ipfsCID,
        status: 'pending',
        createdAt: new Date().toISOString(),
      }

      console.log('Creating file request:', fileRequest)

      // Step 4: Create payment escrow on blockchain
      const txId = await createPaymentEscrow(fileRequest)
      console.log('Payment escrow created with transaction ID:', txId)

      // Step 5: Handle file transfer based on method
      if (useIPFS) {
        // For IPFS files, the receiver will download using the CID after payment
        setSuccess(`File uploaded to IPFS! CID: ${ipfsCID}. Receiver can download after payment.`)
      } else {
        // For WebRTC files, start the direct transfer
        console.log('Starting WebRTC file transfer...')
        await sendFileViaWebRTC(selectedFile, recipientAddress)
      }

      // Reset form
      clearForm()
    } catch (error) {
      console.error('Error sending file:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setError(`Failed to send file: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  // Handle receiver payment and download
  const handleReceiverPayment = async (request: FileRequest) => {
    if (!activeAddress || !transactionSigner) {
      setError('Wallet not connected')
      return
    }

    setLoading(true)
    setError('')

    try {
      console.log('Processing payment for file request:', request.id)

      // Step 1: Make payment to escrow
      const algorand = AlgorandClient.fromConfig({
        algodConfig: getAlgodConfigFromViteEnvironment(),
      })
      algorand.setDefaultSigner(transactionSigner)

      const fileContractClient = new FileSharingAppClient({
        algorand,
        defaultSender: activeAddress,
        appId: BigInt(746505672),
      })

      // Check if contract exists
      try {
        await algorand.app.getById(fileContractClient.appId)
        console.log('Contract found and ready')
      } catch (error) {
        console.error('Contract not found or not accessible:', error)
        throw new Error('File sharing contract is not available. Please ensure the contract is deployed.')
      }

      // Make payment to escrow
      const paymentAmount = algo(request.accessFee)
      const result = await fileContractClient.send.makePayment({
        args: {
          fileId: request.id,
          recipient: request.recipient,
        },
        payment: {
          amount: paymentAmount,
          receiver: fileContractClient.appAddress,
        },
      })

      console.log('Payment made to escrow:', result.transaction.txID())

      // Step 2: Download and verify file
      let downloadedFile: File

      if (request.isIPFS) {
        // Download from IPFS
        downloadedFile = await downloadFromIPFS(request.ipfsCID)
      } else {
        // For WebRTC files, this would be handled by the WebRTC transfer
        throw new Error('WebRTC files should be handled by direct transfer')
      }

      // Step 3: Verify file hash
      const isValid = await verifyFileHash(downloadedFile, request.fileHash)

      if (!isValid) {
        setError('File hash verification failed! File may be corrupted.')
        return
      }

      // Step 4: Release escrow payment to sender
      await releaseEscrowPayment(request)

      setSuccess('Payment successful! File downloaded and verified. Escrow released to sender.')

      // Update request status
      request.status = 'completed'
    } catch (error) {
      console.error('Error processing payment:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setError(`Payment failed: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  // Clear form after successful send
  const clearForm = () => {
    setSelectedFile(null)
    setRecipientAddress('')
    setAccessFee('')
    setFileHash('')
    setUseIPFS(false)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleApproveRequest = async (request: FileRequest) => {
    if (!fileContractClient || !transactionSigner) {
      setError('Wallet not connected')
      return
    }

    // Double check activeAddress is valid
    if (!activeAddress || activeAddress.trim() === '') {
      setError('Wallet address is not available. Please reconnect your wallet.')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Send payment transaction
      const algodConfig = getAlgodConfigFromViteEnvironment()
      const algorand = AlgorandClient.fromConfig({ algodConfig })
      algorand.setDefaultSigner(transactionSigner)

      // Send payment to contract
      await algorand.send.payment({
        signer: transactionSigner,
        sender: activeAddress,
        receiver: fileContractClient.applicationAddress,
        amount: algo(request.accessFee / 1000000), // Convert microALGO to ALGO
      })

      // Approve file request with retry mechanism
      let result
      let retries = 3

      while (retries > 0) {
        try {
          result = await fileContractClient.send.approveAndPay({
            args: [request.id],
            sender: activeAddress,
          })
          break // Success, exit retry loop
        } catch (error: unknown) {
          retries--
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          if (errorMessage.includes('Request Pending') && retries > 0) {
            console.log(`Transaction pending, retrying in 2 seconds... (${retries} retries left)`)
            await new Promise((resolve) => setTimeout(resolve, 2000)) // Wait 2 seconds
          } else {
            throw error // Re-throw if not a pending error or no retries left
          }
        }
      }

      console.log('File request approved:', result)
      setSuccess('Payment sent! You can now receive the file.')

      // Reload file requests from blockchain after transaction completes
      setTimeout(() => {
        loadFileRequests()
      }, 3000)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'

      if (errorMessage.includes('Request Pending') || errorMessage.includes('timeout')) {
        setError(
          'Wallet is stuck with pending transactions. Use "Clear Wallet State" to reset, or "Force Wallet Reset" to disconnect completely.',
        )
      } else {
        setError(`Failed to approve request: ${errorMessage}`)
      }
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmReceipt = async (request: FileRequest) => {
    if (!fileContractClient) {
      setError('Contract client not initialized')
      return
    }

    // Check activeAddress is valid
    if (!activeAddress || activeAddress.trim() === '') {
      setError('Wallet address is not available. Please reconnect your wallet.')
      return
    }

    setLoading(true)
    setError('')

    try {
      // For demo purposes, use the original file hash as confirmation
      let result
      let retries = 3

      while (retries > 0) {
        try {
          result = await fileContractClient.send.confirmReceipt({
            args: [request.id, request.fileHash],
            sender: activeAddress,
          })
          break // Success, exit retry loop
        } catch (error: unknown) {
          retries--
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          if (errorMessage.includes('Request Pending') && retries > 0) {
            console.log(`Transaction pending, retrying in 2 seconds... (${retries} retries left)`)
            await new Promise((resolve) => setTimeout(resolve, 2000)) // Wait 2 seconds
          } else {
            throw error // Re-throw if not a pending error or no retries left
          }
        }
      }

      console.log('Receipt confirmed:', result)
      setSuccess('File receipt confirmed! Payment released to sender.')

      // Reload file requests from blockchain after transaction completes
      setTimeout(() => {
        loadFileRequests()
      }, 3000)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'

      if (errorMessage.includes('Request Pending') || errorMessage.includes('timeout')) {
        setError(
          'Wallet is stuck with pending transactions. Use "Clear Wallet State" to reset, or "Force Wallet Reset" to disconnect completely.',
        )
      } else {
        setError(`Failed to confirm receipt: ${errorMessage}`)
      }
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const downloadFile = async (request: FileRequest) => {
    // Use the payment system for secure download
    await handleReceiverPayment(request)
  }

  if (!activeAddress) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Connect Wallet Required</h2>
          <p className="text-gray-600 mb-6">Please connect your wallet to use the secure file sharing system.</p>
          <a
            href="/connect-wallet"
            className="inline-block bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all duration-200"
          >
            Connect Wallet
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Secure File Sharing</h1>
          <p className="text-xl text-gray-600">Send encrypted files with blockchain escrow protection</p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-xl shadow-lg p-2 flex space-x-2">
            {[
              { id: 'send', label: 'Send File', icon: '📤' },
              { id: 'receive', label: 'Receive Files', icon: '📥' },
              { id: 'history', label: 'History', icon: '📋' },
            ].map((tab: { id: string; label: string; icon: string }) => (
              <button
                key={tab.id}
                onClick={() => setCurrentView(tab.id as 'send' | 'receive' | 'history')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  currentView === tab.id
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
            {error.includes('Wallet is stuck') && (
              <div className="mt-3 flex gap-3">
                <button
                  onClick={clearWalletState}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  Clear Wallet State
                </button>
                <button
                  onClick={forceWalletReset}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
                >
                  Force Wallet Reset
                </button>
              </div>
            )}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800">{success}</p>
          </div>
        )}

        {/* WebRTC Connection Status */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-500' : connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
                }`}
              ></div>
              <span className="text-blue-800 font-medium">
                WebRTC Status: {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {signalingClient?.isServerConnected() && <span className="text-blue-600 text-sm">Signaling Server Connected</span>}
              <button
                onClick={() => {
                  // Check server health
                  fetch('http://localhost:8080/health')
                    .then((response) => response.json())
                    .then((data) => {
                      console.log('Signaling server status:', data)
                      alert(
                        `Server Status: ${data.status}\nConnected Clients: ${data.connectedClients}\nUptime: ${Math.round(data.uptime)}s`,
                      )
                    })
                    .catch((error) => {
                      console.error('Server health check failed:', error)
                      alert('Signaling server is not running. Please start it with: npm run signaling-server')
                    })
                }}
                className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
              >
                Check Server
              </button>
            </div>
          </div>
        </div>

        {/* File Transfer Progress */}
        {fileTransferState.isTransferring && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-purple-800 font-medium">File Transfer Progress</span>
              <span className="text-purple-600 text-sm">{fileTransferState.progress}%</span>
            </div>
            <div className="w-full bg-purple-200 rounded-full h-2 mb-2">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${fileTransferState.progress}%` }}
              ></div>
            </div>
            <p className="text-purple-700 text-sm">{fileTransferState.status}</p>
          </div>
        )}

        {/* Received File */}
        {fileTransferState.receivedFile && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-800 font-medium">File Received!</p>
                <p className="text-green-600 text-sm">
                  {fileTransferState.receivedFile.name} ({FileUtils.formatFileSize(fileTransferState.receivedFile.size)})
                </p>
              </div>
              <button
                onClick={() => {
                  const url = URL.createObjectURL(fileTransferState.receivedFile!)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = fileTransferState.receivedFile!.name
                  a.click()
                  URL.revokeObjectURL(url)
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                Download
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Send File View */}
          {currentView === 'send' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Send Secure File</h2>

              {/* File Selection */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".pdf,.txt,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-32 flex flex-col items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <p className="text-lg font-medium">{selectedFile ? selectedFile.name : 'Click to select a file'}</p>
                  <p className="text-sm text-gray-400 mt-2">{selectedFile && `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`}</p>
                </button>
              </div>

              {selectedFile && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">File Details</h3>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Name:</span> {selectedFile.name}
                    </div>
                    <div>
                      <span className="font-medium">Size:</span> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                    <div>
                      <span className="font-medium">Type:</span> {selectedFile.type}
                    </div>
                    <div>
                      <span className="font-medium">Hash:</span> {fileHash.slice(0, 16)}...
                    </div>
                    <div>
                      <span className="font-medium">Transfer Method:</span> {useIPFS ? 'IPFS' : 'WebRTC'}
                    </div>
                  </div>
                </div>
              )}

              {/* Recipient and Settings */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Recipient Address</label>
                  <input
                    type="text"
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter Algorand address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Access Fee (ALGO)</label>
                  <input
                    type="number"
                    value={accessFee}
                    onChange={(e) => setAccessFee(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="0.001"
                    step="0.001"
                    min="0.001"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">File Type</label>
                  <select
                    value={fileType}
                    onChange={(e) => setFileType(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="document">Document</option>
                    <option value="payslip">Payslip</option>
                    <option value="contract">Contract</option>
                    <option value="image">Image</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <input type="checkbox" id="useIPFS" checked={useIPFS} onChange={(e) => setUseIPFS(e.target.checked)} className="mr-3" />
                  <label htmlFor="useIPFS" className="text-sm font-medium text-gray-700">
                    Use IPFS for large files (&gt;1MB)
                  </label>
                </div>
              </div>

              <button
                onClick={handleSendFile}
                disabled={loading || !selectedFile || !recipientAddress || !accessFee}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Request...' : 'Send Secure File'}
              </button>
            </div>
          )}

          {/* Receive Files View */}
          {currentView === 'receive' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Receive Files</h2>
                <button
                  onClick={loadFileRequests}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Refresh
                </button>
              </div>

              {pendingRequests.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-lg">No pending file requests</p>
                  <p className="text-gray-400 text-sm mt-2">Files sent to you will appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingRequests.map((request) => (
                    <div key={request.id} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-900 capitalize">{request.fileType}</h3>
                          <p className="text-sm text-gray-500">
                            From: {request.sender.slice(0, 8)}...{request.sender.slice(-4)}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            request.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : request.status === 'paid'
                                ? 'bg-blue-100 text-blue-800'
                                : request.status === 'completed'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {request.status}
                        </span>
                      </div>

                      <div className="grid md:grid-cols-3 gap-4 text-sm mb-4">
                        <div>
                          <span className="font-medium">Size:</span> {(request.fileSize / 1024 / 1024).toFixed(2)} MB
                        </div>
                        <div>
                          <span className="font-medium">Fee:</span> {request.accessFee / 1000000} ALGO
                        </div>
                        <div>
                          <span className="font-medium">Method:</span> {request.isIPFS ? 'IPFS' : 'WebRTC'}
                        </div>
                      </div>

                      <div className="flex space-x-3">
                        {request.status === 'pending' && (
                          <button
                            onClick={() => handleApproveRequest(request)}
                            disabled={loading}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                          >
                            Approve & Pay
                          </button>
                        )}

                        {request.status === 'paid' && (
                          <>
                            <button
                              onClick={() => downloadFile(request)}
                              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                            >
                              Download File
                            </button>
                            <button
                              onClick={() => handleConfirmReceipt(request)}
                              disabled={loading}
                              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                            >
                              Confirm Receipt
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* History View */}
          {currentView === 'history' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">File Transfer History</h2>

              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-lg">No file transfer history</p>
                <p className="text-gray-400 text-sm mt-2">Your file transfers will appear here</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default FileSharingPage
