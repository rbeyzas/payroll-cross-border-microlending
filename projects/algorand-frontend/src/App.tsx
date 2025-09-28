import { SupportedWallet, WalletId, WalletManager, WalletProvider } from '@txnlab/use-wallet-react'
import { SnackbarProvider } from 'notistack'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import LandingPage from './pages/LandingPage'
import ConnectWalletPage from './pages/ConnectWalletPage'
import PayrollPage from './pages/PayrollPage'
import MicroloanPage from './pages/MicroloanPage'
import LiquidAuthPage from './pages/LiquidAuthPage'
import FileSharingPage from './pages/FileSharingPage'
import HackathonDemo from './pages/HackathonDemo'
import Home from './Home'
import { getAlgodConfigFromViteEnvironment, getKmdConfigFromViteEnvironment } from './utils/network/getAlgoClientConfigs'

let supportedWallets: SupportedWallet[]
if (import.meta.env.VITE_ALGOD_NETWORK === 'localnet') {
  const kmdConfig = getKmdConfigFromViteEnvironment()
  supportedWallets = [
    {
      id: WalletId.KMD,
      options: {
        baseServer: kmdConfig.server,
        token: String(kmdConfig.token),
        port: String(kmdConfig.port),
      },
    },
  ]
} else {
  supportedWallets = [
    { id: WalletId.DEFLY },
    { id: WalletId.PERA },
    { id: WalletId.EXODUS },
    // If you are interested in WalletConnect v2 provider
    // refer to https://github.com/TxnLab/use-wallet for detailed integration instructions
  ]
}

export default function App() {
  const algodConfig = getAlgodConfigFromViteEnvironment()

  // Ensure network is properly configured
  if (!algodConfig.network) {
    throw new Error('Network configuration is missing. Please check your .env file.')
  }

  const walletManager = new WalletManager({
    wallets: supportedWallets,
    defaultNetwork: algodConfig.network,
    networks: {
      [algodConfig.network]: {
        algod: {
          baseServer: algodConfig.server,
          port: algodConfig.port,
          token: String(algodConfig.token),
        },
      },
    },
    options: {
      resetNetwork: true,
    },
  })

  return (
    <SnackbarProvider maxSnack={3}>
      <WalletProvider manager={walletManager}>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Navbar />
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/connect-wallet" element={<ConnectWalletPage />} />
              <Route path="/demo" element={<Home />} />
              <Route path="/dashboard" element={<Home />} />
              <Route path="/payroll" element={<PayrollPage />} />
              <Route path="/microlending" element={<MicroloanPage />} />
              <Route path="/liquid-auth" element={<LiquidAuthPage />} />
              <Route path="/file-sharing" element={<FileSharingPage />} />
              <Route path="/trustscore" element={<HackathonDemo />} />
              <Route path="/analytics" element={<Home />} />
            </Routes>
          </div>
        </Router>
      </WalletProvider>
    </SnackbarProvider>
  )
}
