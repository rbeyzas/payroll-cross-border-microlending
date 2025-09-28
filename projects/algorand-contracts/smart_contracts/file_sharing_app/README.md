# Secure File Sharing App

A decentralized file sharing system built on Algorand with escrow protection, supporting both WebRTC peer-to-peer transfers and IPFS storage.

## Features

### 🔒 Secure File Sharing

- **Encrypted file transfers** with blockchain escrow protection
- **Smart contract-based access control** - files only unlock after payment verification
- **File integrity verification** using SHA-256 hashing
- **Dispute resolution system** for handling conflicts

### 📁 Dual Transfer Methods

- **WebRTC P2P**: Direct peer-to-peer transfer for small files (< 1MB)
- **IPFS Storage**: Decentralized storage for large files (> 1MB)
- **Automatic method selection** based on file size

### 💰 Blockchain Escrow

- **Payment protection** - funds held in smart contract until file receipt confirmed
- **Automatic payment release** upon successful file transfer
- **Dispute handling** with admin resolution capabilities

## Smart Contract Architecture

### Core Functions

#### File Management

- `createFileRequest()` - Create a new file sharing request
- `approveAndPay()` - Recipient approves and pays for file access
- `confirmReceipt()` - Confirm file receipt and release payment
- `cancelRequest()` - Cancel file request (sender only, before approval)

#### Dispute Resolution

- `disputeTransfer()` - Raise a dispute for file transfer
- `resolveDispute()` - Admin resolves dispute and releases funds

#### Data Retrieval

- `getFileRequest()` - Get file request details
- `getUserFileRequests()` - Get all file requests for a user
- `getStats()` - Get application statistics

#### Administration

- `initialize()` - Initialize the application
- `updateFileMetadata()` - Update file metadata (sender only)
- `emergencyWithdraw()` - Emergency fund withdrawal (admin only)

### Box Storage Schema

The contract uses Algorand Box Storage for efficient data management:

#### File Request Storage

- **Key**: `file_req_{fileId}`
- **Value**: `sender,recipient,fileHash,fileSize,accessFee,fileType,isIPFS,ipfsCID,status`

#### User File Lists

- **Key**: `user_files_{address}`
- **Value**: Comma-separated list of file IDs

#### Application Stats

- **Global State**: Total files, total value locked

## File Transfer Flow

### 1. File Upload

```
Sender → Select File → Calculate Hash → Choose Method (WebRTC/IPFS)
```

### 2. Request Creation

```
Sender → createFileRequest() → Blockchain Transaction → Request Created
```

### 3. File Transfer

- **WebRTC**: Direct P2P connection established
- **IPFS**: File uploaded to IPFS, CID stored on blockchain

### 4. Payment & Access

```
Recipient → approveAndPay() → Payment Sent → File Access Granted
```

### 5. Completion

```
Recipient → Download File → confirmReceipt() → Payment Released
```

## Security Features

### File Integrity

- SHA-256 hash verification ensures file integrity
- Hash comparison between sender and receiver
- Blockchain-stored file metadata

### Access Control

- Smart contract gated file access
- Payment verification before file unlock
- Address-based permission system

### Dispute Resolution

- Either party can raise disputes
- Admin-mediated resolution process
- Fund protection during disputes

## Usage

### Frontend Integration

```typescript
import { FileSharingAppClient } from '../contracts/FileSharingApp'
import { WebRTCFileTransfer } from '../utils/webrtc'
import { ipfsService } from '../utils/ipfs'

// Initialize contract client
const client = new FileSharingAppClient({
  algorand,
  defaultSender: userAddress,
  appId: BigInt(APP_ID),
})

// Create file request
await client.createFileRequest({
  args: [fileId, recipientAddress, fileHash, fileSize, accessFee, fileType, isIPFS, ipfsCID],
  sender: userAddress,
})
```

### WebRTC File Transfer

```typescript
// Initialize WebRTC connection
const webrtc = new WebRTCFileTransfer()
const connection = await webrtc.initializeAsSender()

// Send file
await webrtc.sendFile(file)
```

### IPFS Integration

```typescript
// Upload to IPFS
const result = await ipfsService.uploadFile(file)
const cid = result.cid

// Download from IPFS
const blob = await ipfsService.downloadFile(cid)
```

## Deployment

### Prerequisites

- Python 3.8+
- Algorand Node (localnet/testnet)
- AlgoKit CLI

### Deploy Contract

```bash
cd smart_contracts/file_sharing_app
python deploy.py
```

### Environment Variables

```bash
# IPFS Configuration (Optional)
VITE_PINATA_API_KEY=your_pinata_api_key
VITE_PINATA_SECRET_KEY=your_pinata_secret_key

# Algorand Network
VITE_ALGOD_NETWORK=testnet
VITE_ALGOD_SERVER=https://testnet-api.algonode.cloud
```

## Supported File Types

- **Documents**: PDF, DOC, DOCX, TXT
- **Images**: JPEG, PNG, GIF
- **Spreadsheets**: XLS, XLSX, CSV
- **Archives**: ZIP
- **Other**: JSON, Binary files

## File Size Limits

- **WebRTC**: Up to 1MB (configurable)
- **IPFS**: Up to 10MB (configurable)
- **Maximum**: 100MB (platform limit)

## Fee Structure

- **Minimum Access Fee**: 0.001 ALGO
- **Maximum Access Fee**: 1 ALGO
- **Platform Fee**: 5% (configurable)
- **Transaction Fees**: Standard Algorand fees

## Network Support

- **Localnet**: Development and testing
- **Testnet**: Public testing environment
- **Mainnet**: Production deployment (when ready)

## API Reference

### Smart Contract Methods

| Method              | Description                 | Args                                                  | Returns |
| ------------------- | --------------------------- | ----------------------------------------------------- | ------- |
| `createFileRequest` | Create file sharing request | fileId, recipient, hash, size, fee, type, isIPFS, cid | void    |
| `approveAndPay`     | Approve and pay for file    | fileId                                                | void    |
| `confirmReceipt`    | Confirm file receipt        | fileId, hash                                          | void    |
| `disputeTransfer`   | Raise dispute               | fileId, reason                                        | void    |
| `resolveDispute`    | Resolve dispute             | fileId, resolution                                    | void    |

### Utility Functions

| Function            | Description             | Parameters    |
| ------------------- | ----------------------- | ------------- |
| `calculateFileHash` | Calculate SHA-256 hash  | File object   |
| `uploadToIPFS`      | Upload file to IPFS     | File object   |
| `initializeWebRTC`  | Setup WebRTC connection | Configuration |
| `validateFile`      | Validate file type/size | File, options |

## Troubleshooting

### Common Issues

1. **WebRTC Connection Failed**
   - Check firewall settings
   - Verify STUN server accessibility
   - Ensure both parties are online

2. **IPFS Upload Failed**
   - Verify API credentials
   - Check network connectivity
   - Ensure file size limits

3. **Smart Contract Errors**
   - Verify wallet connection
   - Check sufficient ALGO balance
   - Confirm transaction parameters

### Error Codes

- `FILE_TOO_LARGE`: File exceeds size limits
- `INVALID_FILE_TYPE`: Unsupported file type
- `INSUFFICIENT_FUNDS`: Not enough ALGO for fees
- `CONNECTION_FAILED`: WebRTC connection error
- `IPFS_UPLOAD_FAILED`: IPFS service error

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:

- Create an issue on GitHub
- Join our Discord community
- Check the documentation wiki

---

**Built with ❤️ for the Algorand ecosystem**
