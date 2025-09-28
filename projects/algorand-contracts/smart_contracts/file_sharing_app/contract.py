from pyteal import *
from typing import Literal

# Constants
FILE_REQUEST_PREFIX = Bytes("file_req_")
USER_FILES_PREFIX = Bytes("user_files_")
STATS_PREFIX = Bytes("stats")
ADMIN_KEY = Bytes("admin")
TOTAL_FILES_KEY = Bytes("total_files")
TOTAL_VALUE_KEY = Bytes("total_value")

def file_sharing_contract() -> Expr:
    """Main contract logic for secure file sharing with escrow"""
    
    # On creation, initialize the contract
    on_creation = Seq([
        App.globalPut(ADMIN_KEY, Txn.sender()),
        App.globalPut(TOTAL_FILES_KEY, Int(0)),
        App.globalPut(TOTAL_VALUE_KEY, Int(0)),
        Approve()
    ])
    
    # Handle different application calls
    handle_noop = Cond(
        [Txn.application_args[0] == Bytes("initialize"), handle_initialize()],
        [Txn.application_args[0] == Bytes("create_file_request"), handle_create_file_request()],
        [Txn.application_args[0] == Bytes("approve_and_pay"), handle_approve_and_pay()],
        [Txn.application_args[0] == Bytes("confirm_receipt"), handle_confirm_receipt()],
        [Txn.application_args[0] == Bytes("dispute_transfer"), handle_dispute_transfer()],
        [Txn.application_args[0] == Bytes("resolve_dispute"), handle_resolve_dispute()],
        [Txn.application_args[0] == Bytes("cancel_request"), handle_cancel_request()],
        [Txn.application_args[0] == Bytes("get_file_request"), handle_get_file_request()],
        [Txn.application_args[0] == Bytes("get_user_file_requests"), handle_get_user_file_requests()],
        [Txn.application_args[0] == Bytes("update_file_metadata"), handle_update_file_metadata()],
        [Txn.application_args[0] == Bytes("emergency_withdraw"), handle_emergency_withdraw()],
        [Txn.application_args[0] == Bytes("get_stats"), handle_get_stats()],
    )
    
    # Handle opt-in
    handle_optin = Approve()
    
    # Handle close-out
    handle_closeout = Approve()
    
    # Handle update application (admin only)
    handle_updateapp = Return(Txn.sender() == App.globalGet(ADMIN_KEY))
    
    # Handle delete application (admin only)
    handle_deleteapp = Return(Txn.sender() == App.globalGet(ADMIN_KEY))
    
    return Cond(
        [Txn.application_id() == Int(0), on_creation],
        [Txn.on_completion() == OnComplete.OptIn, handle_optin],
        [Txn.on_completion() == OnComplete.CloseOut, handle_closeout],
        [Txn.on_completion() == OnComplete.UpdateApplication, handle_updateapp],
        [Txn.on_completion() == OnComplete.DeleteApplication, handle_deleteapp],
        [Txn.on_completion() == OnComplete.NoOp, handle_noop],
    )

def handle_initialize() -> Expr:
    """Initialize the file sharing application"""
    return Seq([
        Assert(Txn.sender() == App.globalGet(ADMIN_KEY)),
        App.globalPut(ADMIN_KEY, Txn.application_args[1]),
        Approve()
    ])

def handle_create_file_request() -> Expr:
    """Create a file sharing request with escrow"""
    file_id = Txn.application_args[1]
    recipient = Txn.application_args[2]
    file_hash = Txn.application_args[3]
    file_size = Btoi(Txn.application_args[4])
    access_fee = Btoi(Txn.application_args[5])
    file_type = Txn.application_args[6]
    is_ipfs = Txn.application_args[7]
    ipfs_cid = Txn.application_args[8]
    
    # Create file request key
    file_request_key = Concat(FILE_REQUEST_PREFIX, file_id)
    
    # Create user files key for sender
    sender_files_key = Concat(USER_FILES_PREFIX, Txn.sender())
    
    # Create user files key for recipient
    recipient_files_key = Concat(USER_FILES_PREFIX, recipient)
    
    return Seq([
        # Check if file request already exists
        Assert(App.box_get(file_request_key)[1] == Int(0)),
        
        # Create file request data
        file_data = Concat(
            Concat(
                Concat(
                    Concat(
                        Concat(
                            Concat(
                                Concat(
                                    Concat(Txn.sender(), Bytes(",")),
                                    Concat(recipient, Bytes(","))
                                ),
                                Concat(file_hash, Bytes(","))
                            ),
                            Concat(Itob(file_size), Bytes(","))
                        ),
                        Concat(Itob(access_fee), Bytes(","))
                    ),
                    Concat(file_type, Bytes(","))
                ),
                Concat(is_ipfs, Bytes(","))
            ),
            ipfs_cid
        ),
        
        # Store file request in box storage
        App.box_put(file_request_key, file_data),
        
        # Add to sender's file list
        sender_files = App.box_get(sender_files_key),
        If(sender_files[1] == Int(0),
            App.box_put(sender_files_key, file_id),
            App.box_put(sender_files_key, Concat(sender_files[0], Concat(Bytes(","), file_id)))
        ),
        
        # Add to recipient's file list
        recipient_files = App.box_get(recipient_files_key),
        If(recipient_files[1] == Int(0),
            App.box_put(recipient_files_key, file_id),
            App.box_put(recipient_files_key, Concat(recipient_files[0], Concat(Bytes(","), file_id)))
        ),
        
        # Update statistics
        App.globalPut(TOTAL_FILES_KEY, App.globalGet(TOTAL_FILES_KEY) + Int(1)),
        App.globalPut(TOTAL_VALUE_KEY, App.globalGet(TOTAL_VALUE_KEY) + access_fee),
        
        Approve()
    ])

def handle_approve_and_pay() -> Expr:
    """Recipient approves and pays for file access"""
    file_id = Txn.application_args[1]
    file_request_key = Concat(FILE_REQUEST_PREFIX, file_id)
    
    return Seq([
        # Get file request
        file_request = App.box_get(file_request_key),
        Assert(file_request[1] == Int(1)),
        
        # Parse file request data
        file_data = file_request[0],
        
        # Extract recipient address (second field)
        recipient_start = Substring(file_data, Int(0), IndexOf(file_data, Bytes(","))),
        remaining = Substring(file_data, Add(IndexOf(file_data, Bytes(",")), Int(1)), Len(file_data)),
        recipient_end = Add(IndexOf(remaining, Bytes(",")), IndexOf(file_data, Bytes(","))),
        recipient = Substring(file_data, Add(IndexOf(file_data, Bytes(",")), Int(1)), recipient_end),
        
        # Check caller is the recipient
        Assert(Txn.sender() == recipient),
        
        # Check payment amount
        # Extract access fee (fifth field)
        fee_start = Add(recipient_end, Int(1)),
        fee_remaining = Substring(file_data, fee_start, Len(file_data)),
        fee_end = Add(fee_start, IndexOf(fee_remaining, Bytes(","))),
        access_fee = Btoi(Substring(file_data, fee_start, fee_end)),
        
        # Verify payment transaction
        Assert(Gtxn[1].type_enum() == TxnType.Payment),
        Assert(Gtxn[1].sender() == Txn.sender()),
        Assert(Gtxn[1].receiver() == Global.current_application_address()),
        Assert(Gtxn[1].amount() == access_fee),
        
        # Update file request status to "paid"
        updated_data = Concat(file_data, Concat(Bytes(","), Bytes("paid"))),
        App.box_put(file_request_key, updated_data),
        
        Approve()
    ])

def handle_confirm_receipt() -> Expr:
    """Recipient confirms file receipt and releases payment"""
    file_id = Txn.application_args[1]
    confirmation_hash = Txn.application_args[2]
    file_request_key = Concat(FILE_REQUEST_PREFIX, file_id)
    
    return Seq([
        # Get file request
        file_request = App.box_get(file_request_key),
        Assert(file_request[1] == Int(1)),
        
        # Check file request status is "paid"
        file_data = file_request[0],
        Assert(Substring(file_data, Sub(Len(file_data), Int(4)), Len(file_data)) == Bytes("paid")),
        
        # Extract sender and access fee
        sender_start = Int(0),
        sender_end = IndexOf(file_data, Bytes(",")),
        sender = Substring(file_data, sender_start, sender_end),
        
        # Calculate fee position in the data string
        remaining = Substring(file_data, Add(sender_end, Int(1)), Len(file_data)),
        recipient_end = Add(IndexOf(remaining, Bytes(",")), sender_end),
        fee_start = Add(recipient_end, Int(1)),
        fee_remaining = Substring(file_data, fee_start, Len(file_data)),
        fee_end = Add(fee_start, IndexOf(fee_remaining, Bytes(","))),
        access_fee = Btoi(Substring(file_data, fee_start, fee_end)),
        
        # Verify caller is recipient
        recipient_start = Add(sender_end, Int(1)),
        recipient = Substring(file_data, recipient_start, recipient_end),
        Assert(Txn.sender() == recipient),
        
        # Send payment to sender
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.Payment,
            TxnField.sender: Global.current_application_address(),
            TxnField.receiver: sender,
            TxnField.amount: access_fee,
        }),
        InnerTxnBuilder.Submit(),
        
        # Update file request status to "completed"
        updated_data = Concat(Substring(file_data, Int(0), Sub(Len(file_data), Int(4))), Bytes("completed")),
        App.box_put(file_request_key, updated_data),
        
        Approve()
    ])

def handle_dispute_transfer() -> Expr:
    """Handle dispute for file transfer"""
    file_id = Txn.application_args[1]
    reason = Txn.application_args[2]
    file_request_key = Concat(FILE_REQUEST_PREFIX, file_id)
    
    return Seq([
        # Get file request
        file_request = App.box_get(file_request_key),
        Assert(file_request[1] == Int(1)),
        
        # Extract sender and recipient
        file_data = file_request[0],
        sender_start = Int(0),
        sender_end = IndexOf(file_data, Bytes(",")),
        sender = Substring(file_data, sender_start, sender_end),
        
        remaining = Substring(file_data, Add(sender_end, Int(1)), Len(file_data)),
        recipient_end = Add(IndexOf(remaining, Bytes(",")), sender_end),
        recipient = Substring(file_data, Add(sender_end, Int(1)), recipient_end),
        
        # Check caller is either sender or recipient
        Assert(Or(Txn.sender() == sender, Txn.sender() == recipient)),
        
        # Update file request status to "disputed"
        updated_data = Concat(file_data, Concat(Bytes(","), Bytes("disputed"))),
        App.box_put(file_request_key, updated_data),
        
        Approve()
    ])

def handle_resolve_dispute() -> Expr:
    """Admin resolves dispute"""
    file_id = Txn.application_args[1]
    resolution = Txn.application_args[2]
    file_request_key = Concat(FILE_REQUEST_PREFIX, file_id)
    
    return Seq([
        # Check caller is admin
        Assert(Txn.sender() == App.globalGet(ADMIN_KEY)),
        
        # Get file request
        file_request = App.box_get(file_request_key),
        Assert(file_request[1] == Int(1)),
        
        # Check file request status is "disputed"
        file_data = file_request[0],
        Assert(Substring(file_data, Sub(Len(file_data), Int(8)), Len(file_data)) == Bytes("disputed")),
        
        # Extract sender, recipient, and access fee
        sender_start = Int(0),
        sender_end = IndexOf(file_data, Bytes(",")),
        sender = Substring(file_data, sender_start, sender_end),
        
        remaining = Substring(file_data, Add(sender_end, Int(1)), Len(file_data)),
        recipient_end = Add(IndexOf(remaining, Bytes(",")), sender_end),
        recipient = Substring(file_data, Add(sender_end, Int(1)), recipient_end),
        
        fee_start = Add(recipient_end, Int(1)),
        fee_remaining = Substring(file_data, fee_start, Len(file_data)),
        fee_end = Add(fee_start, IndexOf(fee_remaining, Bytes(","))),
        access_fee = Btoi(Substring(file_data, fee_start, fee_end)),
        
        # Resolve dispute based on resolution
        If(resolution == Bytes("sender_wins"),
            # Send payment to sender
            Seq([
                InnerTxnBuilder.Begin(),
                InnerTxnBuilder.SetFields({
                    TxnField.type_enum: TxnType.Payment,
                    TxnField.sender: Global.current_application_address(),
                    TxnField.receiver: sender,
                    TxnField.amount: access_fee,
                }),
                InnerTxnBuilder.Submit(),
                
                # Update status to "resolved_sender"
                updated_data = Concat(Substring(file_data, Int(0), Sub(Len(file_data), Int(8))), Bytes("resolved_sender")),
                App.box_put(file_request_key, updated_data),
            ]),
            # Send payment to recipient
            If(resolution == Bytes("recipient_wins"),
                Seq([
                    InnerTxnBuilder.Begin(),
                    InnerTxnBuilder.SetFields({
                        TxnField.type_enum: TxnType.Payment,
                        TxnField.sender: Global.current_application_address(),
                        TxnField.receiver: recipient,
                        TxnField.amount: access_fee,
                    }),
                    InnerTxnBuilder.Submit(),
                    
                    # Update status to "resolved_recipient"
                    updated_data = Concat(Substring(file_data, Int(0), Sub(Len(file_data), Int(8))), Bytes("resolved_recipient")),
                    App.box_put(file_request_key, updated_data),
                ]),
                Reject()
            )
        ),
        
        Approve()
    ])

def handle_cancel_request() -> Expr:
    """Cancel file request (only by sender before approval)"""
    file_id = Txn.application_args[1]
    file_request_key = Concat(FILE_REQUEST_PREFIX, file_id)
    
    return Seq([
        # Get file request
        file_request = App.box_get(file_request_key),
        Assert(file_request[1] == Int(1)),
        
        # Extract sender
        file_data = file_request[0],
        sender_start = Int(0),
        sender_end = IndexOf(file_data, Bytes(",")),
        sender = Substring(file_data, sender_start, sender_end),
        
        # Check caller is the sender
        Assert(Txn.sender() == sender),
        
        # Check request is not yet paid
        Assert(Substring(file_data, Sub(Len(file_data), Int(4)), Len(file_data)) != Bytes("paid")),
        
        # Delete file request
        App.box_delete(file_request_key),
        
        Approve()
    ])

def handle_get_file_request() -> Expr:
    """Get file request information"""
    file_id = Txn.application_args[1]
    file_request_key = Concat(FILE_REQUEST_PREFIX, file_id)
    
    return Seq([
        file_request = App.box_get(file_request_key),
        If(file_request[1] == Int(1),
            Log(file_request[0]),
            Log(Bytes("not_found"))
        ),
        Approve()
    ])

def handle_get_user_file_requests() -> Expr:
    """Get all file requests for a user"""
    user_address = Txn.application_args[1]
    user_files_key = Concat(USER_FILES_PREFIX, user_address)
    
    return Seq([
        user_files = App.box_get(user_files_key),
        If(user_files[1] == Int(1),
            Log(user_files[0]),
            Log(Bytes("[]"))
        ),
        Approve()
    ])

def handle_update_file_metadata() -> Expr:
    """Update file metadata (only by sender before approval)"""
    file_id = Txn.application_args[1]
    new_file_hash = Txn.application_args[2]
    new_file_size = Btoi(Txn.application_args[3])
    new_access_fee = Btoi(Txn.application_args[4])
    file_request_key = Concat(FILE_REQUEST_PREFIX, file_id)
    
    return Seq([
        # Get file request
        file_request = App.box_get(file_request_key),
        Assert(file_request[1] == Int(1)),
        
        # Extract sender
        file_data = file_request[0],
        sender_start = Int(0),
        sender_end = IndexOf(file_data, Bytes(",")),
        sender = Substring(file_data, sender_start, sender_end),
        
        # Check caller is the sender
        Assert(Txn.sender() == sender),
        
        # Check request is not yet paid
        Assert(Substring(file_data, Sub(Len(file_data), Int(4)), Len(file_data)) != Bytes("paid")),
        
        # Update file metadata (reconstruct with new values)
        # Keep sender, recipient, update hash, size, fee
        recipient_start = Add(sender_end, Int(1)),
        remaining = Substring(file_data, recipient_start, Len(file_data)),
        recipient_end = Add(IndexOf(remaining, Bytes(",")), recipient_start),
        recipient = Substring(file_data, recipient_start, recipient_end),
        
        # Extract other fields to preserve
        file_type_start = Add(recipient_end, Int(1)),
        file_type_remaining = Substring(file_data, file_type_start, Len(file_data)),
        file_type_end = Add(file_type_start, IndexOf(file_type_remaining, Bytes(","))),
        file_type = Substring(file_data, file_type_start, file_type_end),
        
        is_ipfs_start = Add(file_type_end, Int(1)),
        is_ipfs_remaining = Substring(file_data, is_ipfs_start, Len(file_data)),
        is_ipfs_end = Add(is_ipfs_start, IndexOf(is_ipfs_remaining, Bytes(","))),
        is_ipfs = Substring(file_data, is_ipfs_start, is_ipfs_end),
        
        ipfs_cid_start = Add(is_ipfs_end, Int(1)),
        ipfs_cid = Substring(file_data, ipfs_cid_start, Len(file_data)),
        
        # Reconstruct with updated values
        updated_data = Concat(
            Concat(
                Concat(
                    Concat(
                        Concat(
                            Concat(
                                Concat(
                                    Concat(sender, Bytes(",")),
                                    Concat(recipient, Bytes(","))
                                ),
                                Concat(new_file_hash, Bytes(","))
                            ),
                            Concat(Itob(new_file_size), Bytes(","))
                        ),
                        Concat(Itob(new_access_fee), Bytes(","))
                    ),
                    Concat(file_type, Bytes(","))
                ),
                Concat(is_ipfs, Bytes(","))
            ),
            ipfs_cid
        ),
        
        App.box_put(file_request_key, updated_data),
        
        Approve()
    ])

def handle_emergency_withdraw() -> Expr:
    """Emergency withdrawal by admin"""
    amount = Btoi(Txn.application_args[1])
    
    return Seq([
        # Check caller is admin
        Assert(Txn.sender() == App.globalGet(ADMIN_KEY)),
        
        # Send payment to admin
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.Payment,
            TxnField.sender: Global.current_application_address(),
            TxnField.receiver: Txn.sender(),
            TxnField.amount: amount,
        }),
        InnerTxnBuilder.Submit(),
        
        Approve()
    ])

def handle_get_user_file_requests() -> Expr:
    """Get all file requests for a user (read-only method)"""
    user_address = Txn.application_args[1]
    
    # This is a simplified version - in production you'd iterate through all box keys
    # For now, we'll return a placeholder response
    return Seq([
        Log(Concat(Bytes("User file requests for: "), user_address)),
        Log(Bytes("[]")),  # Empty array for now
        Approve()
    ])

def handle_get_file_request() -> Expr:
    """Get specific file request by ID (read-only method)"""
    file_id = Txn.application_args[1]
    file_request_key = Concat(FILE_REQUEST_PREFIX, file_id)
    
    return Seq([
        # Get file request from box storage
        file_request = App.box_get(file_request_key),
        If(file_request[1] == Int(1), [
            # File request exists, log it
            Log(file_request[0])
        ], [
            # File request not found
            Log(Bytes("not_found"))
        ]),
        Approve()
    ])

def handle_get_stats() -> Expr:
    """Get application statistics"""
    return Seq([
        stats = Concat(
            Concat(Bytes("total_files:"), Itob(App.globalGet(TOTAL_FILES_KEY))),
            Concat(Bytes(",total_value:"), Itob(App.globalGet(TOTAL_VALUE_KEY)))
        ),
        Log(stats),
        Approve()
    ])

if __name__ == "__main__":
    compileTeal(file_sharing_contract(), Mode.Application, version=8)
