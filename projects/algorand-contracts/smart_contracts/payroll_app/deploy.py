#!/usr/bin/env python3

import os
from algokit_utils import (
    ApplicationClient,
    ApplicationSpecification,
    get_localnet_default_account,
    get_algod_client,
    get_indexer_client,
)
from algosdk import account
from algosdk.transaction import PaymentTxn
from algosdk.atomic_transaction_composer import TransactionWithSigner

# Load environment variables
ALGOD_SERVER = os.getenv("ALGOD_SERVER", "https://testnet-api.algonode.cloud")
INDEXER_SERVER = os.getenv("INDEXER_SERVER", "https://testnet-idx.algonode.cloud")

def main():
    print("🚀 Deploying PayrollApp to Testnet...")
    
    # Get clients
    algod_client = get_algod_client(ALGOD_SERVER)
    indexer_client = get_indexer_client(INDEXER_SERVER)
    
    # Get default account (for testnet, you'd use a funded account)
    try:
        account_info = get_localnet_default_account(algod_client)
        print(f"Using account: {account_info.address}")
    except:
        # For testnet, we'll need a funded account
        print("⚠️  Please provide a funded testnet account")
        return
    
    # Create application client
    app_spec = ApplicationSpecification.from_json({
        "contract": {
            "name": "PayrollApp",
            "version": "1.0.0"
        },
        "source": {
            "approval": "contract.algo",
            "clear": "contract.clear.algo"
        }
    })
    
    client = ApplicationClient(
        algod_client=algod_client,
        app_spec=app_spec,
        signer=account_info,
    )
    
    try:
        # Deploy the application
        print("📦 Deploying application...")
        app_id, app_address, txid = client.create()
        
        print(f"✅ PayrollApp deployed successfully!")
        print(f"📋 App ID: {app_id}")
        print(f"📍 App Address: {app_address}")
        print(f"🔗 Transaction ID: {txid}")
        print(f"🌐 AlgoExplorer: https://testnet.algoexplorer.io/application/{app_id}")
        
        # Save App ID to file for frontend
        with open("app_id.txt", "w") as f:
            f.write(str(app_id))
        
        print(f"💾 App ID saved to app_id.txt")
        
    except Exception as e:
        print(f"❌ Deployment failed: {e}")

if __name__ == "__main__":
    main()
