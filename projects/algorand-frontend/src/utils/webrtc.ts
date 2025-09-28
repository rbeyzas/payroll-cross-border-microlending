export interface FileMetadata {
  name: string
  size: number
  type: string
  totalChunks: number
  hash: string
}

export interface FileChunk {
  chunkIndex: number
  data: number[]
  isLast: boolean
}

export interface WebRTCConnection {
  peerConnection: RTCPeerConnection
  dataChannel: RTCDataChannel | null
  isConnected: boolean
  onFileReceived?: (file: File) => void
  onProgress?: (progress: number) => void
  onStatusChange?: (status: string) => void
  onIceCandidate?: (candidate: RTCIceCandidateInit) => void
}

export class WebRTCFileTransfer {
  public connection: WebRTCConnection | null = null
  private receivedChunks: Map<number, Uint8Array> = new Map()
  private fileMetadata: FileMetadata | null = null
  private onCompleteCallback?: (file: File) => void
  private isReceiving = false
  private expectedChunks = 0
  private isInitialized = false

  constructor(
    private config: {
      iceServers?: RTCIceServer[]
      maxFileSize?: number
      chunkSize?: number
    } = {},
  ) {
    this.config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
      ],
      maxFileSize: 50 * 1024 * 1024, // 50MB
      chunkSize: 64 * 1024, // 64KB
      ...config,
    }
  }

  /**
   * Initialize WebRTC connection as sender
   */
  async initializeAsSender(): Promise<WebRTCConnection> {
    if (this.isInitialized) {
      throw new Error('WebRTC connection already initialized')
    }

    const peerConnection = new RTCPeerConnection({
      iceServers: this.config.iceServers,
      iceCandidatePoolSize: 10,
    })

    const dataChannel = peerConnection.createDataChannel('fileTransfer', {
      ordered: true,
      maxRetransmits: 3,
    })

    const connection: WebRTCConnection = {
      peerConnection,
      dataChannel,
      isConnected: false,
    }

    this.setupConnectionHandlers(connection)
    this.setupDataChannelHandlers(dataChannel)
    this.connection = connection
    this.isInitialized = true

    return connection
  }

  /**
   * Initialize WebRTC connection as receiver
   */
  async initializeAsReceiver(): Promise<WebRTCConnection> {
    if (this.isInitialized) {
      throw new Error('WebRTC connection already initialized')
    }

    const peerConnection = new RTCPeerConnection({
      iceServers: this.config.iceServers,
      iceCandidatePoolSize: 10,
    })

    const connection: WebRTCConnection = {
      peerConnection,
      dataChannel: null,
      isConnected: false,
    }

    // Set up data channel handler for incoming connections
    peerConnection.ondatachannel = (event) => {
      const dataChannel = event.channel
      connection.dataChannel = dataChannel
      this.setupDataChannelHandlers(dataChannel)
    }

    this.setupConnectionHandlers(connection)
    this.connection = connection
    this.isInitialized = true

    return connection
  }

  /**
   * Send file via WebRTC
   */
  async sendFile(file: File): Promise<void> {
    if (!this.connection?.dataChannel) {
      throw new Error('Connection not established')
    }

    if (file.size > this.config.maxFileSize!) {
      throw new Error(`File too large. Maximum size: ${this.config.maxFileSize! / 1024 / 1024}MB`)
    }

    // Wait for data channel to be open
    if (this.connection.dataChannel.readyState !== 'open') {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Data channel connection timeout'))
        }, 10000)

        this.connection!.dataChannel!.onopen = () => {
          clearTimeout(timeout)
          resolve()
        }

        this.connection!.dataChannel!.onerror = (error) => {
          clearTimeout(timeout)
          reject(error)
        }
      })
    }

    // Calculate file hash
    const fileHash = await this.calculateFileHash(file)

    const fileMetadata: FileMetadata = {
      name: file.name,
      size: file.size,
      type: file.type,
      totalChunks: Math.ceil(file.size / this.config.chunkSize!),
      hash: fileHash,
    }

    // Send file metadata
    this.connection.dataChannel.send(
      JSON.stringify({
        type: 'file_metadata',
        metadata: fileMetadata,
      }),
    )

    // Send file in chunks
    const fileBuffer = await file.arrayBuffer()
    const totalChunks = fileMetadata.totalChunks

    for (let i = 0; i < totalChunks; i++) {
      const start = i * this.config.chunkSize!
      const end = Math.min(start + this.config.chunkSize!, file.size)
      const chunk = fileBuffer.slice(start, end)

      const chunkData: FileChunk = {
        chunkIndex: i,
        data: Array.from(new Uint8Array(chunk)),
        isLast: i === totalChunks - 1,
      }

      this.connection.dataChannel.send(
        JSON.stringify({
          type: 'file_chunk',
          chunk: chunkData,
        }),
      )

      // Update progress
      const progress = ((i + 1) / totalChunks) * 100
      this.connection.onProgress?.(progress)

      // Small delay to prevent overwhelming the data channel
      if (i % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 10))
      }
    }

    // Send completion signal
    this.connection.dataChannel.send(
      JSON.stringify({
        type: 'file_complete',
      }),
    )
  }

  /**
   * Handle incoming file
   */
  private setupDataChannelHandlers(dataChannel: RTCDataChannel): void {
    dataChannel.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data)

        switch (message.type) {
          case 'file_metadata': {
            this.fileMetadata = message.metadata
            this.receivedChunks.clear()
            this.expectedChunks = this.fileMetadata.totalChunks
            this.isReceiving = true
            this.connection?.onStatusChange?.('Receiving file metadata...')
            break
          }

          case 'file_chunk': {
            if (!this.isReceiving) {
              return
            }

            const chunk = message.chunk as FileChunk
            this.receivedChunks.set(chunk.chunkIndex, new Uint8Array(chunk.data))

            if (this.fileMetadata) {
              const progress = (this.receivedChunks.size / this.fileMetadata.totalChunks) * 100
              this.connection?.onProgress?.(progress)
              this.connection?.onStatusChange?.(`Receiving file... ${Math.round(progress)}%`)
            }

            // Check if all chunks received
            if (this.receivedChunks.size >= this.expectedChunks) {
              await this.reconstructFile()
            }
            break
          }

          case 'file_complete':
            this.connection?.onStatusChange?.('File transfer completed')
            break
        }
      } catch (error) {
        console.error('Error processing data channel message:', error)
        this.connection?.onStatusChange?.(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    dataChannel.onopen = () => {
      this.connection?.onStatusChange?.('Data channel opened')
    }

    dataChannel.onclose = () => {
      this.connection?.onStatusChange?.('Data channel closed')
    }

    dataChannel.onerror = (error) => {
      console.error('Data channel error:', error)
      this.connection?.onStatusChange?.('Data channel error')
    }
  }

  /**
   * Set up connection event handlers
   */
  private setupConnectionHandlers(connection: WebRTCConnection): void {
    connection.peerConnection.oniceconnectionstatechange = () => {
      const state = connection.peerConnection.iceConnectionState
      connection.isConnected = state === 'connected'

      switch (state) {
        case 'connected':
          connection.onStatusChange?.('Connected')
          break
        case 'disconnected':
          connection.onStatusChange?.('Disconnected')
          break
        case 'failed':
          connection.onStatusChange?.('Connection failed')
          break
        case 'checking':
          connection.onStatusChange?.('Checking connection...')
          break
        case 'completed':
          connection.onStatusChange?.('Connection established')
          break
        default:
          connection.onStatusChange?.('Connecting...')
          break
      }
    }

    connection.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        connection.onIceCandidate?.(event.candidate)
      }
    }

    connection.peerConnection.onconnectionstatechange = () => {
      const state = connection.peerConnection.connectionState

      switch (state) {
        case 'connected':
          connection.onStatusChange?.('Peer connection established')
          break
        case 'disconnected':
          connection.onStatusChange?.('Peer connection lost')
          break
        case 'failed':
          connection.onStatusChange?.('Peer connection failed')
          break
        case 'connecting':
          connection.onStatusChange?.('Establishing peer connection...')
          break
      }
    }
  }

  /**
   * Reconstruct file from received chunks
   */
  private async reconstructFile(): Promise<void> {
    if (!this.fileMetadata) {
      throw new Error('No file metadata available')
    }

    // Verify all chunks received
    if (this.receivedChunks.size !== this.fileMetadata.totalChunks) {
      console.warn(`Missing chunks: ${this.fileMetadata.totalChunks - this.receivedChunks.size} chunks missing`)
    }

    // Reconstruct file
    const chunks = new Array(this.fileMetadata.totalChunks)
    for (let i = 0; i < this.fileMetadata.totalChunks; i++) {
      const chunk = this.receivedChunks.get(i)
      if (!chunk) {
        console.warn(`Missing chunk ${i}`)
        chunks[i] = new Uint8Array(0)
      } else {
        chunks[i] = chunk
      }
    }

    const fileBuffer = new Uint8Array(this.fileMetadata.size)
    let offset = 0

    for (const chunk of chunks) {
      if (chunk.length > 0) {
        fileBuffer.set(chunk, offset)
        offset += chunk.length
      }
    }

    // Verify file hash
    const receivedHash = await this.calculateHash(fileBuffer)

    if (receivedHash !== this.fileMetadata.hash) {
      console.warn('File hash mismatch - file may be corrupted')
    }

    // Create File object
    const file = new File([fileBuffer], this.fileMetadata.name, {
      type: this.fileMetadata.type,
    })

    this.connection?.onFileReceived?.(file)
    this.onCompleteCallback?.(file)

    // Reset receiving state
    this.isReceiving = false
    this.receivedChunks.clear()
    this.fileMetadata = null
  }

  /**
   * Calculate SHA-256 hash of a file
   */
  private async calculateFileHash(file: File): Promise<string> {
    const buffer = await file.arrayBuffer()
    return this.calculateHash(new Uint8Array(buffer))
  }

  /**
   * Calculate SHA-256 hash of Uint8Array
   */
  private async calculateHash(data: Uint8Array): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Generate offer for connection
   */
  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.connection) {
      throw new Error('Connection not initialized')
    }

    const offer = await this.connection.peerConnection.createOffer({
      offerToReceiveAudio: false,
      offerToReceiveVideo: false,
    })

    await this.connection.peerConnection.setLocalDescription(offer)
    return offer
  }

  /**
   * Handle offer from remote peer
   */
  async handleOffer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    if (!this.connection) {
      throw new Error('Connection not initialized')
    }

    await this.connection.peerConnection.setRemoteDescription(offer)
    const answer = await this.connection.peerConnection.createAnswer()
    await this.connection.peerConnection.setLocalDescription(answer)
    return answer
  }

  /**
   * Handle answer from remote peer
   */
  async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.connection) {
      throw new Error('Connection not initialized')
    }

    await this.connection.peerConnection.setRemoteDescription(answer)
  }

  /**
   * Add ICE candidate
   */
  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.connection) {
      throw new Error('Connection not initialized')
    }

    try {
      await this.connection.peerConnection.addIceCandidate(candidate)
    } catch (error) {
      console.error('Failed to add ICE candidate:', error)
    }
  }

  /**
   * Close connection
   */
  close(): void {
    if (this.connection) {
      if (this.connection.dataChannel) {
        this.connection.dataChannel.close()
      }
      this.connection.peerConnection.close()
      this.connection = null
    }
    this.isInitialized = false
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): string {
    if (!this.connection) {
      return 'disconnected'
    }
    return this.connection.peerConnection.iceConnectionState
  }

  /**
   * Set file received callback
   */
  onFileReceived(callback: (file: File) => void): void {
    this.onCompleteCallback = callback
  }

  /**
   * Check if connection is initialized
   */
  isConnectionInitialized(): boolean {
    return this.isInitialized && this.connection !== null
  }
}

// Utility functions for file handling
export const FileUtils = {
  /**
   * Validate file type and size
   */
  validateFile(
    file: File,
    options: {
      maxSize?: number
      allowedTypes?: string[]
    } = {},
  ): { valid: boolean; error?: string } {
    const maxSize = options.maxSize || 10 * 1024 * 1024 // 10MB default
    const allowedTypes = options.allowedTypes || [
      'application/pdf',
      'text/plain',
      'image/jpeg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ]

    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File too large. Maximum size: ${maxSize / 1024 / 1024}MB`,
      }
    }

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`,
      }
    }

    return { valid: true }
  },

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  },

  /**
   * Get file type category
   */
  getFileCategory(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image'
    if (mimeType.startsWith('video/')) return 'video'
    if (mimeType.startsWith('audio/')) return 'audio'
    if (mimeType.includes('pdf')) return 'pdf'
    if (mimeType.includes('word') || mimeType.includes('document')) return 'document'
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'spreadsheet'
    if (mimeType.includes('text/')) return 'text'
    return 'other'
  },
}
