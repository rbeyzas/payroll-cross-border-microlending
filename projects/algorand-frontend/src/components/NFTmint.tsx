// src/components/NFTmint.tsx
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { useWallet } from '@txnlab/use-wallet-react'
import { useSnackbar } from 'notistack'
import { useState } from 'react'
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'
import { sha512_256 } from 'js-sha512'

interface NFTMintProps {
  openModal: boolean
  setModalState: (value: boolean) => void
}

const NFTmint = ({ openModal, setModalState }: NFTMintProps) => {
  const [metadataUrl, setMetadataUrl] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)

  const { transactionSigner, activeAddress } = useWallet()
  const { enqueueSnackbar } = useSnackbar()

  const algodConfig = getAlgodConfigFromViteEnvironment()
  const algorand = AlgorandClient.fromConfig({ algodConfig })

  const handleMintNFT = async () => {
    setLoading(true)

    if (!transactionSigner || !activeAddress) {
      enqueueSnackbar('Please connect wallet first', { variant: 'warning' })
      setLoading(false)
      return
    }

    if (!metadataUrl) {
      enqueueSnackbar('Please enter a metadata URL', { variant: 'warning' })
      setLoading(false)
      return
    }

    try {
      enqueueSnackbar('Minting NFT...', { variant: 'info' })

      const metadataHash = new Uint8Array(Buffer.from(sha512_256.digest(metadataUrl)))

      const createNFTResult = await algorand.send.assetCreate({
        sender: activeAddress,
        signer: transactionSigner,
        total: 1n,
        decimals: 0,
        assetName: 'MasterPass Ticket',
        unitName: 'MTK',
        url: metadataUrl,
        metadataHash,
        defaultFrozen: false,
      })

      enqueueSnackbar(`✅ NFT Minted! ASA ID: ${createNFTResult.assetId}`, { variant: 'success' })
      setMetadataUrl('')
    } catch (e) {
      console.error(e)
      enqueueSnackbar('Failed to mint NFT', { variant: 'error' })
    }

    setLoading(false)
  }

  return (
    <dialog id="nft_modal" className={`modal ${openModal ? 'modal-open' : ''} bg-slate-200`}>
      <form method="dialog" className="modal-box">
        <h3 className="font-bold text-lg">Mint MasterPass NFT</h3>
        <br />
        <input
          type="text"
          placeholder="Enter NFT metadata URL"
          className="input input-bordered w-full"
          value={metadataUrl}
          onChange={(e) => setMetadataUrl(e.target.value)}
        />
        <div className="modal-action">
          <button className="btn" onClick={() => setModalState(false)}>Close</button>
          <button
            className={`btn btn-success ${metadataUrl ? '' : 'btn-disabled'}`}
            onClick={handleMintNFT}
          >
            {loading ? <span className="loading loading-spinner" /> : 'Mint NFT'}
          </button>
        </div>
      </form>
    </dialog>
  )
}

export default NFTmint