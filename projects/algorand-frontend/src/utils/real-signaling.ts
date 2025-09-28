/**
 * Real Signaling Server Implementation
 * Bu dosya gerçek WebSocket signaling server implementasyonunu içerir
 */

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'file-request' | 'file-response' | 'register'
  from: string
  to: string
  data: any
  timestamp: number
}

export interface FileTransferRequest {
  fileId: string
  sender: string
  recipient: string
  fileMetadata: {
    name: string
    size: number
    type: string
    hash: string
  }
}

/**
 * Gerçek WebSocket Signaling Server
 * Bu server gerçek peer-to-peer bağlantıları kurar
 */
export class RealSignalingClient {
  private ws: WebSocket | null = null
  private messageHandlers: Map<string, (message: SignalingMessage) => void> = new Map()
  private isConnected = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private serverUrl: string

  constructor(serverUrl: string = 'wss://signaling-server.herokuapp.com') {
    this.serverUrl = serverUrl
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.serverUrl)

        this.ws.onopen = () => {
          console.log('Connected to real signaling server')
          this.isConnected = true
          this.reconnectAttempts = 0

          // Register with a temporary client ID
          this.sendMessage({
            type: 'register',
            from: 'temp',
            to: 'server',
            data: { address: `client_${Date.now()}` },
          })

          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const message: SignalingMessage = JSON.parse(event.data)
            this.handleMessage(message)
          } catch (error) {
            console.error('Error parsing signaling message:', error)
          }
        }

        this.ws.onclose = () => {
          console.log('Disconnected from signaling server')
          this.isConnected = false
          this.handleReconnect()
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          reject(error)
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)

      setTimeout(() => {
        this.connect().catch(console.error)
      }, this.reconnectDelay * this.reconnectAttempts)
    } else {
      console.error('Max reconnection attempts reached')
    }
  }

  private handleMessage(message: SignalingMessage): void {
    const handler = this.messageHandlers.get(message.type)
    if (handler) {
      handler(message)
    }
  }

  onMessage(type: string, handler: (message: SignalingMessage) => void): void {
    this.messageHandlers.set(type, handler)
  }

  sendMessage(message: Omit<SignalingMessage, 'timestamp'>): void {
    if (!this.isConnected || !this.ws) {
      throw new Error('Not connected to signaling server')
    }

    const fullMessage: SignalingMessage = {
      ...message,
      timestamp: Date.now(),
    }

    this.ws.send(JSON.stringify(fullMessage))
  }

  sendOffer(to: string, offer: RTCSessionDescriptionInit, from: string): void {
    this.sendMessage({
      type: 'offer',
      from,
      to,
      data: offer,
    })
  }

  sendAnswer(to: string, answer: RTCSessionDescriptionInit, from: string): void {
    this.sendMessage({
      type: 'answer',
      from,
      to,
      data: answer,
    })
  }

  sendIceCandidate(to: string, candidate: RTCIceCandidateInit, from: string): void {
    this.sendMessage({
      type: 'ice-candidate',
      from,
      to,
      data: candidate,
    })
  }

  sendFileRequest(request: FileTransferRequest): void {
    this.sendMessage({
      type: 'file-request',
      from: request.sender,
      to: request.recipient,
      data: request,
    })
  }

  sendFileResponse(to: string, fileId: string, accepted: boolean, from: string): void {
    this.sendMessage({
      type: 'file-response',
      from,
      to,
      data: { fileId, accepted },
    })
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.isConnected = false
    this.messageHandlers.clear()
  }

  isServerConnected(): boolean {
    return this.isConnected
  }
}

/**
 * Simple WebSocket Signaling Server (Node.js)
 * Bu server'ı ayrı bir Node.js uygulaması olarak çalıştırabilirsiniz
 */
export const createSignalingServer = () => {
  const WebSocket = require('ws')
  const wss = new WebSocket.Server({ port: 8080 })

  const clients = new Map<string, WebSocket>()

  wss.on('connection', (ws: WebSocket) => {
    console.log('New client connected')

    ws.on('message', (data: string) => {
      try {
        const message: SignalingMessage = JSON.parse(data)

        // Route message to target client
        const targetClient = clients.get(message.to)
        if (targetClient && targetClient.readyState === WebSocket.OPEN) {
          targetClient.send(JSON.stringify(message))
        }
      } catch (error) {
        console.error('Error handling message:', error)
      }
    })

    ws.on('close', () => {
      console.log('Client disconnected')
      // Remove client from map
      for (const [address, client] of clients.entries()) {
        if (client === ws) {
          clients.delete(address)
          break
        }
      }
    })

    // Store client with a temporary ID (in real implementation, use wallet address)
    const clientId = `client_${Date.now()}`
    clients.set(clientId, ws)
  })

  console.log('Signaling server running on ws://localhost:8080')
  return wss
}

// Server'ı çalıştırmak için:
// if (require.main === module) {
//   createSignalingServer()
// }
