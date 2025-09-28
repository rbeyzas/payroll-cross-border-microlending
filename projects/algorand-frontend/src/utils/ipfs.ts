export interface IPFSUploadResponse {
  success: boolean
  cid: string
  size: number
  url: string
  error?: string
}

export interface IPFSConfig {
  gateway: string
  apiUrl?: string
  apiKey?: string
  secretKey?: string
}

export class IPFSService {
  private config: IPFSConfig

  constructor(config: IPFSConfig) {
    this.config = config
  }

  /**
   * Upload file to IPFS using Pinata (or other IPFS service)
   */
  async uploadFile(file: File): Promise<IPFSUploadResponse> {
    try {
      // For demo purposes, we'll use a mock IPFS service
      // In production, you would integrate with Pinata, Infura, or other IPFS providers
      return await this.uploadToMockIPFS(file)
    } catch (error) {
      console.error('IPFS upload error:', error)
      return {
        success: false,
        cid: '',
        size: 0,
        url: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Upload file to IPFS via Pinata
   */
  private async uploadToPinata(file: File): Promise<IPFSUploadResponse> {
    if (!this.config.apiKey || !this.config.secretKey) {
      throw new Error('Pinata API credentials not configured')
    }

    const formData = new FormData()
    formData.append('file', file)

    // Add metadata
    formData.append(
      'pinataMetadata',
      JSON.stringify({
        name: file.name,
        keyvalues: {
          originalName: file.name,
          fileSize: file.size.toString(),
          fileType: file.type,
          uploadedAt: new Date().toISOString(),
        },
      }),
    )

    const response = await fetch(`${this.config.apiUrl}/pinning/pinFileToIPFS`, {
      method: 'POST',
      headers: {
        pinata_api_key: this.config.apiKey,
        pinata_secret_api_key: this.config.secretKey,
      },
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`Pinata upload failed: ${response.statusText}`)
    }

    const result = await response.json()

    return {
      success: true,
      cid: result.IpfsHash,
      size: file.size,
      url: `${this.config.gateway}${result.IpfsHash}`,
    }
  }

  /**
   * Upload file to mock IPFS service (for demo purposes)
   */
  private async uploadToMockIPFS(file: File): Promise<IPFSUploadResponse> {
    // Simulate upload delay
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Generate mock CID
    const mockCID = `Qm${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`

    console.log(`Mock IPFS upload: ${file.name} -> ${mockCID}`)

    return {
      success: true,
      cid: mockCID,
      size: file.size,
      url: `${this.config.gateway}${mockCID}`,
    }
  }

  /**
   * Download file from IPFS
   */
  async downloadFile(cid: string): Promise<Blob> {
    try {
      const response = await fetch(`${this.config.gateway}${cid}`)

      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`)
      }

      return await response.blob()
    } catch (error) {
      console.error('IPFS download error:', error)
      throw error
    }
  }

  /**
   * Get file metadata from IPFS
   */
  async getFileMetadata(cid: string): Promise<{
    size: number
    type: string
    name: string
  }> {
    try {
      // For demo purposes, return mock metadata
      // In production, you would fetch this from IPFS or your metadata service
      return {
        size: 1024 * 1024, // 1MB mock
        type: 'application/octet-stream',
        name: `file_${cid.slice(0, 8)}.bin`,
      }
    } catch (error) {
      console.error('IPFS metadata error:', error)
      throw error
    }
  }

  /**
   * Verify file integrity by comparing hashes
   */
  async verifyFileIntegrity(file: File, expectedHash: string): Promise<boolean> {
    try {
      const buffer = await file.arrayBuffer()
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const actualHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

      return actualHash === expectedHash
    } catch (error) {
      console.error('Hash verification error:', error)
      return false
    }
  }

  /**
   * Get IPFS gateway URL for a CID
   */
  getGatewayURL(cid: string): string {
    return `${this.config.gateway}${cid}`
  }

  /**
   * Check if a CID is valid
   */
  isValidCID(cid: string): boolean {
    // Basic CID validation (starts with Qm for v0 or bafy for v1)
    return /^Qm[a-zA-Z0-9]{44}$/.test(cid) || /^bafy[a-zA-Z0-9]{50,}$/.test(cid)
  }
}

// Default IPFS configuration
export const defaultIPFSConfig: IPFSConfig = {
  gateway: 'https://ipfs.io/ipfs/',
  apiUrl: 'https://api.pinata.cloud',
  // API keys should be set in environment variables
  apiKey: import.meta.env.VITE_PINATA_API_KEY || '',
  secretKey: import.meta.env.VITE_PINATA_SECRET_KEY || '',
}

// Create default IPFS service instance
export const ipfsService = new IPFSService(defaultIPFSConfig)

// Utility functions for IPFS
export const IPFSUtils = {
  /**
   * Determine if a file should use IPFS based on size
   */
  shouldUseIPFS(fileSize: number, threshold: number = 1024 * 1024): boolean {
    return fileSize > threshold // Use IPFS for files > 1MB
  },

  /**
   * Get file size category
   */
  getFileSizeCategory(size: number): 'small' | 'medium' | 'large' {
    if (size < 1024 * 1024) return 'small' // < 1MB
    if (size < 10 * 1024 * 1024) return 'medium' // < 10MB
    return 'large' // >= 10MB
  },

  /**
   * Format CID for display
   */
  formatCID(cid: string, maxLength: number = 20): string {
    if (cid.length <= maxLength) return cid
    return `${cid.slice(0, maxLength / 2)}...${cid.slice(-maxLength / 2)}`
  },

  /**
   * Extract file extension from MIME type
   */
  getFileExtensionFromMimeType(mimeType: string): string {
    const extensions: Record<string, string> = {
      'application/pdf': 'pdf',
      'text/plain': 'txt',
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/vnd.ms-excel': 'xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'text/csv': 'csv',
      'application/zip': 'zip',
      'application/json': 'json',
    }

    return extensions[mimeType] || 'bin'
  },

  /**
   * Generate filename with CID
   */
  generateFileName(originalName: string, cid: string): string {
    const extension = originalName.split('.').pop() || 'bin'
    return `file_${cid.slice(0, 8)}.${extension}`
  },
}

// React hook for IPFS operations
export const useIPFS = (config?: Partial<IPFSConfig>) => {
  const service = new IPFSService({ ...defaultIPFSConfig, ...config })

  const uploadFile = async (file: File): Promise<IPFSUploadResponse> => {
    return service.uploadFile(file)
  }

  const downloadFile = async (cid: string): Promise<Blob> => {
    return service.downloadFile(cid)
  }

  const getFileMetadata = async (cid: string) => {
    return service.getFileMetadata(cid)
  }

  const verifyFileIntegrity = async (file: File, expectedHash: string): Promise<boolean> => {
    return service.verifyFileIntegrity(file, expectedHash)
  }

  return {
    uploadFile,
    downloadFile,
    getFileMetadata,
    verifyFileIntegrity,
    service,
  }
}
