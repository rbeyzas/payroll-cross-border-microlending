# 🚀 MVP Microlending dApp - Cross-Border Lending on Algorand

A complete full-stack microlending platform built on Algorand with Liquid Auth authentication and GoPlausible DID resolution.

## 🌟 Features

### 🔐 Authentication & Identity

- **Liquid Auth Integration**: Secure authentication with Algorand wallets
- **GoPlausible DID Resolution**: Decentralized identity verification
- **Trust Score Calculation**: Dynamic scoring based on loan history

### 💰 Smart Contract Features

- **Loan Creation**: Borrowers can request loans with custom terms
- **Loan Funding**: Lenders can fund approved loans
- **Repayment System**: Automated installment tracking
- **Trust Scoring**: Blockchain-based reputation system

### 🎯 User Portals

- **Borrower Portal**: Create loan requests, view profile, track history
- **Lender Portal**: Browse loans, view borrower profiles, fund loans
- **Real-time Updates**: Live blockchain data integration

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │  Smart Contract │
│   (React/Vite)  │◄──►│   (Node.js)     │◄──►│   (Algorand)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Liquid Auth    │    │  GoPlausible    │    │   Algorand      │
│  (Authentication)│    │  (DID Resolver) │    │   (Blockchain)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local development)
- Algorand wallet (Pera, Defly, or Exodus)

### 1. Clone and Setup

```bash
git clone <repository-url>
cd payroll-cross-border-microlending
```

### 2. Environment Configuration

```bash
# Copy environment files
cp backend/env.example backend/.env
cp projects/algorand-frontend/.env.example projects/algorand-frontend/.env

# Update backend/.env with your configuration
ALGOD_SERVER=https://testnet-api.algonode.cloud
ALGOD_NETWORK=testnet
CONTRACT_APP_ID=746230222
CONTRACT_ADDRESS=JYSDGLSFX6IJEMV3QQK47H32AI7QL7FHOLNV6YXCXOQVDUPLVP6YLSF2FQ
```

### 3. Start the Platform

```bash
# Start all services
docker-compose up -d

# Check service status
docker-compose ps
```

### 4. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Liquid Auth**: http://localhost:3000
- **Health Check**: http://localhost:3001/health

## 🔧 Development

### Local Development Setup

#### Backend Development

```bash
cd backend
npm install
npm run dev
```

#### Frontend Development

```bash
cd projects/algorand-frontend
npm install
npm run dev
```

### Smart Contract Development

```bash
cd projects/algorand-contracts
npm install
npm run build
```

## 📱 User Flows

### Borrower Flow

1. **Connect Wallet**: Authenticate with Liquid Auth
2. **Create Loan**: Specify amount and term
3. **Wait for Approval**: Admin reviews and approves
4. **Drawdown**: Receive funds to wallet
5. **Repay**: Make installment payments

### Lender Flow

1. **Connect Wallet**: Authenticate with wallet
2. **Browse Loans**: View available loan requests
3. **Check Profiles**: Review borrower trust scores
4. **Fund Loan**: Provide funding for approved loans
5. **Track Returns**: Monitor loan performance

## 🔗 API Endpoints

### Core Endpoints

- `GET /health` - Health check
- `GET /api/loans` - List all loans
- `POST /api/loans` - Create new loan
- `POST /api/loans/:id/fund` - Fund a loan
- `POST /api/loans/:id/repay` - Repay loan
- `GET /api/borrower/:address` - Get borrower profile
- `GET /api/contract` - Get contract information

### Example API Usage

```javascript
// Create a loan
const loan = await fetch("/api/loans", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    principal: 1000000, // 1 ALGO in microALGO
    termDays: 30,
    borrower: "BORROWER_ADDRESS",
  }),
});

// Get borrower profile with trust score
const profile = await fetch("/api/borrower/BORROWER_ADDRESS");
```

## 🧪 Testing

### Smart Contract Testing

```bash
cd projects/algorand-contracts
npm test
```

### API Testing

```bash
cd backend
npm test
```

### End-to-End Testing

```bash
cd projects/algorand-frontend
npm run test:e2e
```

## 🔒 Security Features

- **Liquid Auth**: Secure wallet authentication
- **DID Verification**: Decentralized identity resolution
- **Trust Scoring**: Reputation-based risk assessment
- **Smart Contract Security**: On-chain loan management
- **Input Validation**: Comprehensive data validation

## 📊 Trust Score Algorithm

```javascript
function calculateTrustScore(loanHistory) {
  if (!loanHistory || loanHistory.length === 0) {
    return 100; // Default for new users
  }

  let totalLoans = loanHistory.length;
  let repaidLoans = loanHistory.filter((loan) => loan.status === "repaid").length;
  let defaultedLoans = loanHistory.filter((loan) => loan.status === "defaulted").length;

  // Score: 100 - (defaulted_loans * 20) + (repaid_loans * 5)
  let score = 100 - defaultedLoans * 20 + repaidLoans * 5;

  return Math.max(0, Math.min(100, score));
}
```

## 🌐 Network Configuration

### Testnet (Default)

- **Algorand Node**: https://testnet-api.algonode.cloud
- **Indexer**: https://testnet-idx.algonode.cloud
- **Explorer**: https://testnet.algoexplorer.io

### Mainnet (Production)

- **Algorand Node**: https://mainnet-api.algonode.cloud
- **Indexer**: https://mainnet-idx.algonode.cloud
- **Explorer**: https://algoexplorer.io

## 🐛 Troubleshooting

### Common Issues

1. **Wallet Connection Failed**

   - Ensure wallet is unlocked
   - Check network configuration
   - Verify Liquid Auth is running

2. **Smart Contract Errors**

   - Check contract deployment
   - Verify app ID and address
   - Ensure sufficient ALGO balance

3. **API Connection Issues**
   - Verify backend is running
   - Check environment variables
   - Review Docker logs

### Debug Commands

```bash
# Check service logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs liquid-auth

# Restart services
docker-compose restart backend
docker-compose restart frontend
```

## 📈 Performance Optimization

- **Frontend**: Code splitting, lazy loading, caching
- **Backend**: Connection pooling, request batching
- **Smart Contract**: Efficient storage, minimal computation
- **Database**: Indexing, query optimization

## 🔮 Future Enhancements

- **Multi-Asset Support**: Support for ASAs
- **Automated Lending**: AI-powered risk assessment
- **Cross-Chain**: Integration with other blockchains
- **Mobile App**: Native mobile application
- **Analytics Dashboard**: Advanced reporting and insights

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📞 Support

- **Documentation**: [Project Wiki]
- **Issues**: [GitHub Issues]
- **Discord**: [Community Server]
- **Email**: support@microlending.com

---

**Built with ❤️ for the Algorand ecosystem**
