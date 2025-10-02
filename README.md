# AlgoShare - Secure File Sharing Platform

Bu proje, Algorand blockchain üzerinde güvenli dosya paylaşımı sağlayan bir platformdur:

## 🔹 File Sharing Features - Aktif

**Smart Contract AppID:** `746228510`  
**AlgoExplorer:** [https://testnet.algoexplorer.io/application/746228510](https://testnet.algoexplorer.io/application/746228510)

### Özellikler:

- ✅ **Güvenli Dosya Paylaşımı:** WebRTC ve blockchain teknolojisi ile güvenli dosya transferi
- ✅ **IPFS Entegrasyonu:** Büyük dosyalar için IPFS depolama desteği
- ✅ **Blockchain Escrow:** Algorand smart contract ile güvenli ödeme sistemi
- ✅ **Real-time Transfer:** Anlık dosya transferi ve progress tracking

### Smart Contract Fonksiyonları:

- `createFileRequest(fileId, recipient, fileHash, fileSize, accessFee)` - Dosya isteği oluştur
- `approveAndPay(fileId)` - Dosya isteğini onayla ve ödeme yap
- `confirmReceipt(fileId, fileHash)` - Dosya alındığını onayla
- `releasePayment(fileId, recipient)` - Ödemeyi serbest bırak
- `getFileRequest(fileId)` - Dosya isteği bilgilerini al

### Frontend Features:

1. **Send Files:** Dosya seç, alıcı adresi gir, transfer et
2. **Receive Files:** Gelen dosya isteklerini görüntüle ve onayla
3. **File History:** Gönderilen ve alınan dosyaların geçmişi
4. **WebRTC Transfer:** Gerçek zamanlı dosya transferi

## 🔹 Teknoloji Stack

- **Blockchain:** Algorand Smart Contracts
- **File Transfer:** WebRTC P2P Communication
- **Storage:** IPFS for large files
- **Frontend:** React + TypeScript + Tailwind CSS
- **Signaling:** WebSocket signaling server

## 🔹 Güvenlik Özellikleri

- **Blockchain Escrow:** Ödeme güvenliği için smart contract
- **File Verification:** SHA-256 hash doğrulama
- **Encrypted Transfer:** WebRTC ile şifreli transfer
- **Access Control:** Sadece yetkili kullanıcılar dosya alabilir

---

Bu proje, Algorand blockchain üzerinde güvenli dosya paylaşımı sağlayan bir platformdur. Kullanıcılar WebRTC teknolojisi ile dosyalarını güvenli şekilde transfer edebilir, blockchain escrow sistemi ile ödeme güvenliği sağlanır.

## 🌟 How To Get Started Instructions

### **Fork the Repo:**

To create your own copy of this repository:

a. **Go to the GitHub Repository:**

- Navigate to the main page which is the current one your on.

b. **Click the "Fork" Button:**

- In the top-right corner of the page, click the **Fork** button. This will create a copy of the repository under your GitHub account. Feel free to hit the ⭐️ aswell so you can find the Algorand-dApp-Quick-Start-Template-Typescript repo easily!

c. **Wait for the Forking Process to Complete:**

- GitHub will take a few moments to create the fork. Once complete, you’ll be redirected to your newly created fork.

https://github.com/user-attachments/assets/92e746e1-3143-4769-8a5a-1339e4bd7a14

## 🚀 Start with Codespaces

This is the fastest way to get up and running!

1. **Create a Codespace:**

   - Click the green "Code" button at the top right of your forked repo.
   - Select "Create codespace on main".
   - Once your Codespace is fully loaded, you are ready to go!

Make sure to wait for algokit to be installed automatically - it should only take a few mins max!

2. **While in Codespace:**

   - Enter the workspace
     <img width="2794" height="1524" alt="image" src="https://github.com/user-attachments/assets/41f25490-1284-4998-b342-27f7a0ffb420" />

3. **Give it a testrun!:** (WIP)
   - Click on run & debug
   - Run and deploy the hello world smart contract
   - And then run dApp - check out what is already given to you. Or simply `npm run dev` in the CLI!
     <img width="1528" height="808" alt="image" src="https://github.com/user-attachments/assets/2f337d67-02e2-4b0c-8244-109951269b5e" />

**Pro Tip:** GitHub Codespaces is included with free accounts but comes with a monthly limit of 60 hours.

To avoid losing your progress, be sure to **commit your changes regularly** — just like shown in the video demo below — so your updates are saved to your forked repository.

https://github.com/user-attachments/assets/dd452ea1-3070-4718-af34-bea978e208ab

## For Local Devs:

If `npm run dev` doesn’t work, run: `npm install --save-dev @algorandfoundation/algokit-client-generator`

And create your `.env` file by copying from the `.env.template`

## Project Structure Simplified

- `projects/algorand-frontend/src/` — Frontend code (React + TypeScript)
- `projects/algorand-frontend/src/App.tsx` — Main app layout and routing
- `projects/algorand-frontend/src/pages/FileSharingPage.tsx` — File sharing interface
- `projects/algorand-frontend/src/utils/webrtc.ts` — WebRTC file transfer logic
- `projects/algorand-frontend/src/utils/real-signaling.ts` — WebSocket signaling
- `projects/algorand-contracts/smart_contracts/file_sharing_app/contract.algo.ts` — File sharing smart contract

## Reference Guide

Need more help? See the Algorand-dApp-Quick-Start-Template Reference Guide for step-by-step instructions, AI prompts, and troubleshooting tips:

[View the guide](https://docs.google.com/document/d/1f_ysbtFOLKM_Tjvey7VCcGYsAzOmyEVmsdC5si936wc/edit?usp=sharing)

# algoshare

# QuickStartTemplate

This starter full stack project has been generated using AlgoKit. See below for default getting started instructions.

## Setup

### Initial setup

1. Clone this repository to your local machine.
2. Ensure [Docker](https://www.docker.com/) is installed and operational. Then, install `AlgoKit` following this [guide](https://github.com/algorandfoundation/algokit-cli#install).
3. Run `algokit project bootstrap all` in the project directory. This command sets up your environment by installing necessary dependencies, setting up a Python virtual environment, and preparing your `.env` file.
4. In the case of a smart contract project, execute `algokit generate env-file -a target_network localnet` from the `QuickStartTemplate-contracts` directory to create a `.env.localnet` file with default configuration for `localnet`.
5. To build your project, execute `algokit project run build`. This compiles your project and prepares it for running.
6. For project-specific instructions, refer to the READMEs of the child projects:
   - Smart Contracts: [QuickStartTemplate-contracts](projects/QuickStartTemplate-contracts/README.md)
   - Frontend Application: [QuickStartTemplate-frontend](projects/QuickStartTemplate-frontend/README.md)

> This project is structured as a monorepo, refer to the [documentation](https://github.com/algorandfoundation/algokit-cli/blob/main/docs/features/project/run.md) to learn more about custom command orchestration via `algokit project run`.

### Subsequently

1. If you update to the latest source code and there are new dependencies, you will need to run `algokit project bootstrap all` again.
2. Follow step 3 above.

### Continuous Integration / Continuous Deployment (CI/CD)

This project uses [GitHub Actions](https://docs.github.com/en/actions/learn-github-actions/understanding-github-actions) to define CI/CD workflows, which are located in the [`.github/workflows`](./.github/workflows) folder. You can configure these actions to suit your project's needs, including CI checks, audits, linting, type checking, testing, and deployments to TestNet.

For pushes to `main` branch, after the above checks pass, the following deployment actions are performed:

- The smart contract(s) are deployed to TestNet using [AlgoNode](https://algonode.io).
- The frontend application is deployed to a provider of your choice (Netlify, Vercel, etc.). See [frontend README](frontend/README.md) for more information.

> Please note deployment of smart contracts is done via `algokit deploy` command which can be invoked both via CI as seen on this project, or locally. For more information on how to use `algokit deploy` please see [AlgoKit documentation](https://github.com/algorandfoundation/algokit-cli/blob/main/docs/features/deploy.md).

## Tools

This project makes use of Python and React to build Algorand smart contracts and to provide a base project configuration to develop frontends for your Algorand dApps and interactions with smart contracts. The following tools are in use:

- Algorand, AlgoKit, and AlgoKit Utils
- Python dependencies including Poetry, Black, Ruff or Flake8, mypy, pytest, and pip-audit
- React and related dependencies including AlgoKit Utils, Tailwind CSS, daisyUI, use-wallet, npm, jest, playwright, Prettier, ESLint, and Github Actions workflows for build validation

### VS Code

It has also been configured to have a productive dev experience out of the box in [VS Code](https://code.visualstudio.com/), see the [backend .vscode](./backend/.vscode) and [frontend .vscode](./frontend/.vscode) folders for more details.

## Integrating with smart contracts and application clients

Refer to the [QuickStartTemplate-contracts](projects/QuickStartTemplate-contracts/README.md) folder for overview of working with smart contracts, [projects/QuickStartTemplate-frontend](projects/QuickStartTemplate-frontend/README.md) for overview of the React project and the [projects/QuickStartTemplate-frontend/contracts](projects/QuickStartTemplate-frontend/src/contracts/README.md) folder for README on adding new smart contracts from backend as application clients on your frontend. The templates provided in these folders will help you get started.
When you compile and generate smart contract artifacts, your frontend component will automatically generate typescript application clients from smart contract artifacts and move them to `frontend/src/contracts` folder, see [`generate:app-clients` in package.json](projects/QuickStartTemplate-frontend/package.json). Afterwards, you are free to import and use them in your frontend application.

The frontend starter also provides an example of smart contract interactions in [`AppCalls.tsx`](projects/QuickStartTemplate-frontend/src/components/AppCalls.tsx) component by default.

## Next Steps

You can take this project and customize it to build your own decentralized applications on Algorand. Make sure to understand how to use AlgoKit and how to write smart contracts for Algorand before you start.

# AlgoShare - Secure File Sharing Platform

Bu proje, Algorand blockchain üzerinde güvenli dosya paylaşımı sağlayan bir platformdur:

## 🔹 Proje Özellikleri

### Secure File Sharing (Güvenli Dosya Paylaşımı)

- WebRTC teknolojisi ile peer-to-peer dosya transferi
- Algorand smart contract ile güvenli ödeme sistemi
- IPFS entegrasyonu ile büyük dosya desteği
- Real-time progress tracking ve status updates

### Blockchain Integration

- Smart contract escrow sistemi ile ödeme güvenliği
- File hash verification ile dosya bütünlüğü kontrolü
- Access control ile yetkili kullanıcı kontrolü
- Transparent transaction history

### Advanced Features

- **WebRTC P2P**: Direkt kullanıcılar arası dosya transferi
- **IPFS Storage**: Büyük dosyalar için decentralized storage
- **File Verification**: SHA-256 hash ile dosya doğrulama
- **Progress Tracking**: Real-time transfer progress

## 🚀 Kurulum ve Çalıştırma

### Frontend (React + TypeScript)

```bash
cd projects/algorand-frontend
npm install
npm run dev
```

### Smart Contracts (Python + AlgoKit)

```bash
cd projects/algorand-contracts
algokit project bootstrap all
algokit project run build
algokit project run test
```

## 📋 FileSharingApp Smart Contract Fonksiyonları

### Global State

- `file_requests`: File request data storage
- `access_fees`: Access fee tracking
- `file_hashes`: File integrity verification
- `recipients`: Recipient address mapping

### Box Storage (File Data)

- `file_metadata`: File name, size, type
- `access_control`: Recipient permissions
- `payment_status`: Payment and escrow status

### Fonksiyonlar

1. `createFileRequest(fileId, recipient, fileHash, fileSize, accessFee)` - Dosya isteği oluştur
2. `approveAndPay(fileId)` - Dosya isteğini onayla ve ödeme yap
3. `confirmReceipt(fileId, fileHash)` - Dosya alındığını onayla
4. `releasePayment(fileId, recipient)` - Ödemeyi serbest bırak
5. `getFileRequest(fileId)` - Dosya isteği bilgilerini al
6. `verifyFileHash(fileId, hash)` - Dosya hash doğrulama
7. `getPaymentStatus(fileId)` - Ödeme durumu kontrolü

## 🎯 Frontend Features

1. **Send Files**: Dosya seç, alıcı adresi gir, transfer et
2. **Receive Files**: Gelen dosya isteklerini görüntüle ve onayla
3. **File History**: Gönderilen ve alınan dosyaların geçmişi
4. **WebRTC Transfer**: Gerçek zamanlı dosya transferi

## 📊 Analytics & Monitoring

Proje, kullanım verilerini ölçmek için analytics entegrasyonu içerir:

- Kaç dosya transferi yapıldı
- Kaç kullanıcı dosya paylaştı
- Transfer başarı oranları
- WebRTC connection durumları
- IPFS storage kullanımı

## 🌐 Network Configuration

### Testnet

- Algod: `https://testnet-api.algonode.cloud`
- Indexer: `https://testnet-idx.algonode.cloud`

### Environment Variables

```bash
VITE_ALGOD_SERVER=https://testnet-api.algonode.cloud
VITE_ALGOD_PORT=443
VITE_ALGOD_TOKEN=
VITE_ALGOD_NETWORK=testnet
VITE_INDEXER_SERVER=https://testnet-idx.algonode.cloud
VITE_INDEXER_PORT=443
VITE_INDEXER_TOKEN=
VITE_API_URL=http://localhost:3001
```

## 📱 Kullanım

1. **Wallet Bağlantısı**: Connect Wallet butonuna tıklayın ve cüzdanınızı bağlayın
2. **Dosya Gönderme**: /file-sharing sayfasında dosya seçin ve alıcı adresini girin
3. **Dosya Alma**: Gelen dosya isteklerini onaylayın ve dosyaları indirin
4. **Geçmiş**: Tüm dosya transferlerinizi history sayfasında görüntüleyin

## 🔗 AppID ve Explorer Linkleri

### FileSharingApp Smart Contract

- **Testnet AppID**: `746505672`
- **AlgoExplorer**: `https://testnet.algoexplorer.io/application/746505672`
- **App Address**: `[TO_BE_DETERMINED]`
- **Mainnet AppID**: `[TO_BE_DEPLOYED]`

> **✅ Deployed**: FileSharingApp başarıyla testnet'e deploy edildi ve çalışır durumda!

## 🛠️ Geliştirme

### Yeni Özellik Ekleme

1. Smart contract fonksiyonlarını `contract.algo.ts` dosyasına ekleyin
2. Frontend component'lerini `src/components/` klasörüne ekleyin
3. WebRTC logic'ini `src/utils/webrtc.ts` dosyasında güncelleyin
4. Test'leri `contract.algo.spec.ts` dosyasına ekleyin

### Test Etme

```bash
# Smart contract testleri
cd projects/algorand-contracts
algokit project run test

# Frontend testleri
cd projects/algorand-frontend
npm test
```

## 📄 Lisans

MIT License - Detaylar için LICENSE dosyasına bakın.

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/AmazingFeature`)
3. Commit yapın (`git commit -m 'Add some AmazingFeature'`)
4. Push yapın (`git push origin feature/AmazingFeature`)
5. Pull Request açın

## 📞 İletişim

- **Email**: contact@algoshare.com
- **Twitter**: [@AlgoShare](https://twitter.com/algoshare)
- **Discord**: [AlgoShare Community](https://discord.gg/algoshare)

---

**Built with ❤️ on Algorand Blockchain**

# Start all services

docker-compose up -d

# Run integration tests

node test-mvp.js
