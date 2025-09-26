const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

export interface Loan {
  id: string
  principal: number
  termDays: number
  status: 'requested' | 'approved' | 'active' | 'repaid' | 'defaulted'
  borrower: string
  lender?: string
  installment: number
  remaining: number
  repaidTotal: number
  createdAt?: string
  fundedAt?: string
}

export interface BorrowerProfile {
  address: string
  did: string
  didDoc: any
  trustScore: number
  loanHistory: Loan[]
  totalLoans: number
  repaidLoans: number
  defaultedLoans: number
}

export interface ContractInfo {
  appId: string
  address: string
  network: string
  explorerUrl: string
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // Health check
  async healthCheck() {
    return this.request('/health')
  }

  // Get all loans
  async getLoans(): Promise<Loan[]> {
    return this.request<Loan[]>('/api/loans')
  }

  // Create new loan
  async createLoan(principal: number, termDays: number, borrower: string): Promise<Loan> {
    return this.request<Loan>('/api/loans', {
      method: 'POST',
      body: JSON.stringify({ principal, termDays, borrower }),
    })
  }

  // Fund a loan
  async fundLoan(loanId: string, lender: string): Promise<Loan> {
    return this.request<Loan>(`/api/loans/${loanId}/fund`, {
      method: 'POST',
      body: JSON.stringify({ lender }),
    })
  }

  // Repay loan
  async repayLoan(loanId: string, amount: number, borrower: string): Promise<any> {
    return this.request(`/api/loans/${loanId}/repay`, {
      method: 'POST',
      body: JSON.stringify({ amount, borrower }),
    })
  }

  // Get borrower profile with DID and trust score
  async getBorrowerProfile(address: string): Promise<BorrowerProfile> {
    return this.request<BorrowerProfile>(`/api/borrower/${address}`)
  }

  // Get contract information
  async getContractInfo(): Promise<ContractInfo> {
    return this.request<ContractInfo>('/api/contract')
  }
}

export const apiClient = new ApiClient()
export default apiClient
