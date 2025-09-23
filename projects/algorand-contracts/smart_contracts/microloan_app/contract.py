from pyteal import *

# Global state keys
ADMIN_KEY = Bytes("admin")
TOTAL_LOANS_KEY = Bytes("total_loans")
LOAN_ID_COUNTER_KEY = Bytes("loan_id_counter")

# Loan status constants
LOAN_STATUS_REQUESTED = Int(0)
LOAN_STATUS_APPROVED = Int(1)
LOAN_STATUS_ACTIVE = Int(2)
LOAN_STATUS_REPAID = Int(3)
LOAN_STATUS_DEFAULTED = Int(4)

def get_loan_box_key(loan_id: Expr) -> Expr:
    """Generate box storage key for loan data"""
    return Concat(Bytes("loan_"), Itob(loan_id))

def get_loan_principal_key() -> Expr:
    """Get loan principal key"""
    return Bytes("principal")

def get_loan_term_key() -> Expr:
    """Get loan term key"""
    return Bytes("term")

def get_loan_status_key() -> Expr:
    """Get loan status key"""
    return Bytes("status")

def get_loan_borrower_key() -> Expr:
    """Get loan borrower key"""
    return Bytes("borrower")

def get_loan_installment_key() -> Expr:
    """Get loan installment key"""
    return Bytes("installment")

def get_loan_remaining_key() -> Expr:
    """Get loan remaining amount key"""
    return Bytes("remaining")

def get_loan_repaid_total_key() -> Expr:
    """Get loan repaid total key"""
    return Bytes("repaid_total")

def create_microloan() -> Expr:
    """Create microloan system (only during contract creation)"""
    admin = Txn.application_args[0]
    
    return Seq([
        # Set global state
        App.globalPut(ADMIN_KEY, admin),
        App.globalPut(TOTAL_LOANS_KEY, Int(0)),
        App.globalPut(LOAN_ID_COUNTER_KEY, Int(0)),
        
        Approve()
    ])

def initialize_microloan() -> Expr:
    """Initialize microloan system (after contract creation)"""
    return Seq([
        Assert(Txn.on_completion() == OnComplete.NoOp),
        Assert(Global.group_size() == Int(1)),
        Assert(Txn.num_app_args() == Int(1)),
        
        # Get admin from application args
        admin = Txn.application_args[0],
        
        # Set global state
        App.globalPut(ADMIN_KEY, admin),
        App.globalPut(TOTAL_LOANS_KEY, Int(0)),
        App.globalPut(LOAN_ID_COUNTER_KEY, Int(0)),
        
        Log(Bytes("Microloan system initialized")),
        Approve()
    ])

def request_loan() -> Expr:
    """Request a loan"""
    return Seq([
        Assert(Txn.on_completion() == OnComplete.NoOp),
        Assert(Global.group_size() == Int(1)),
        Assert(Txn.num_app_args() == Int(2)),
        
        # Get parameters
        principal = Btoi(Txn.application_args[0]),
        term_days = Btoi(Txn.application_args[1]),
        borrower = Txn.sender(),
        
        # Validate parameters
        Assert(principal > Int(0)),
        Assert(term_days > Int(0)),
        Assert(term_days <= Int(365)),  # Max 1 year
        
        # Generate new loan ID
        loan_id = App.globalGet(LOAN_ID_COUNTER_KEY) + Int(1),
        App.globalPut(LOAN_ID_COUNTER_KEY, loan_id),
        
        # Create loan box storage
        loan_box_key = get_loan_box_key(loan_id),
        App.box_create(loan_box_key, Int(64)),  # 8 bytes per field * 8 fields
        
        # Store loan data
        App.box_put(loan_box_key, get_loan_principal_key(), Itob(principal)),
        App.box_put(loan_box_key, get_loan_term_key(), Itob(term_days)),
        App.box_put(loan_box_key, get_loan_status_key(), Itob(LOAN_STATUS_REQUESTED)),
        App.box_put(loan_box_key, get_loan_borrower_key(), borrower),
        App.box_put(loan_box_key, get_loan_installment_key(), Itob(Int(0))),
        App.box_put(loan_box_key, get_loan_remaining_key(), Itob(principal)),
        App.box_put(loan_box_key, get_loan_repaid_total_key(), Itob(Int(0))),
        
        # Update total loans count
        App.globalPut(TOTAL_LOANS_KEY, App.globalGet(TOTAL_LOANS_KEY) + Int(1)),
        
        # Log loan request
        Log(Concat(Bytes("Loan requested: "), Itob(loan_id))),
        Log(Concat(Bytes("Principal: "), Itob(principal))),
        Log(Concat(Bytes("Term days: "), Itob(term_days))),
        
        Approve()
    ])

def approve_loan() -> Expr:
    """Approve a loan (admin only)"""
    return Seq([
        Assert(Txn.on_completion() == OnComplete.NoOp),
        Assert(Global.group_size() == Int(1)),
        Assert(Txn.num_app_args() == Int(2)),
        Assert(Txn.sender() == App.globalGet(ADMIN_KEY)),
        
        # Get parameters
        loan_id = Btoi(Txn.application_args[0]),
        installment_amount = Btoi(Txn.application_args[1]),
        
        # Validate parameters
        Assert(installment_amount > Int(0)),
        
        # Check if loan exists
        loan_box_key = get_loan_box_key(loan_id),
        Assert(App.box_length(loan_box_key) > Int(0)),
        
        # Check loan status is REQUESTED
        status = Btoi(App.box_get(loan_box_key, get_loan_status_key())),
        Assert(status == LOAN_STATUS_REQUESTED),
        
        # Update loan status and installment
        App.box_put(loan_box_key, get_loan_status_key(), Itob(LOAN_STATUS_APPROVED)),
        App.box_put(loan_box_key, get_loan_installment_key(), Itob(installment_amount)),
        
        # Log loan approval
        Log(Concat(Bytes("Loan approved: "), Itob(loan_id))),
        Log(Concat(Bytes("Installment: "), Itob(installment_amount))),
        
        Approve()
    ])

def drawdown() -> Expr:
    """Drawdown approved loan with inner payment"""
    return Seq([
        Assert(Txn.on_completion() == OnComplete.NoOp),
        Assert(Global.group_size() == Int(1)),
        Assert(Txn.num_app_args() == Int(1)),
        
        # Get loan ID
        loan_id = Btoi(Txn.application_args[0]),
        borrower = Txn.sender(),
        
        # Check if loan exists
        loan_box_key = get_loan_box_key(loan_id),
        Assert(App.box_length(loan_box_key) > Int(0)),
        
        # Check loan status is APPROVED
        status = Btoi(App.box_get(loan_box_key, get_loan_status_key())),
        Assert(status == LOAN_STATUS_APPROVED),
        
        # Check borrower matches
        stored_borrower = App.box_get(loan_box_key, get_loan_borrower_key()),
        Assert(stored_borrower == borrower),
        
        # Get loan principal
        principal = Btoi(App.box_get(loan_box_key, get_loan_principal_key())),
        
        # Check contract has enough balance
        contract_balance = Balance(Global.current_application_address()),
        Assert(contract_balance >= principal),
        
        # Send inner payment to borrower
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.Payment,
            TxnField.receiver: borrower,
            TxnField.amount: principal,
        }),
        InnerTxnBuilder.Submit(),
        
        # Update loan status to ACTIVE
        App.box_put(loan_box_key, get_loan_status_key(), Itob(LOAN_STATUS_ACTIVE)),
        
        # Log drawdown with transaction details
        Log(Concat(Bytes("LOAN_DRAWDOWN:"), Itob(loan_id))),
        Log(Concat(Bytes("BORROWER:"), borrower)),
        Log(Concat(Bytes("AMOUNT:"), Itob(principal))),
        
        Approve()
    ])

def repay() -> Expr:
    """Repay loan installment"""
    return Seq([
        Assert(Txn.on_completion() == OnComplete.NoOp),
        Assert(Global.group_size() == Int(2)),  # Payment + App call
        Assert(Txn.num_app_args() == Int(1)),
        
        # Get loan ID
        loan_id = Btoi(Txn.application_args[0]),
        borrower = Txn.sender(),
        
        # Check if loan exists
        loan_box_key = get_loan_box_key(loan_id),
        Assert(App.box_length(loan_box_key) > Int(0)),
        
        # Check loan status is ACTIVE
        status = Btoi(App.box_get(loan_box_key, get_loan_status_key())),
        Assert(status == LOAN_STATUS_ACTIVE),
        
        # Check borrower matches
        stored_borrower = App.box_get(loan_box_key, get_loan_borrower_key()),
        Assert(stored_borrower == borrower),
        
        # Get loan data
        principal = Btoi(App.box_get(loan_box_key, get_loan_principal_key())),
        installment = Btoi(App.box_get(loan_box_key, get_loan_installment_key())),
        remaining = Btoi(App.box_get(loan_box_key, get_loan_remaining_key())),
        
        # Validate payment transaction
        Assert(Gtxn[0].type_enum() == TxnType.Payment),
        Assert(Gtxn[0].sender() == borrower),
        Assert(Gtxn[0].receiver() == Global.current_application_address()),
        Assert(Gtxn[0].amount() == installment),
        
        # Update repaid total and remaining amount
        current_repaid = Btoi(App.box_get(loan_box_key, get_loan_repaid_total_key())),
        new_repaid_total = current_repaid + installment,
        new_remaining = remaining - installment,
        
        App.box_put(loan_box_key, get_loan_remaining_key(), Itob(new_remaining)),
        App.box_put(loan_box_key, get_loan_repaid_total_key(), Itob(new_repaid_total)),
        
        # Check if fully repaid
        If(new_remaining <= Int(0), Seq([
            App.box_put(loan_box_key, get_loan_status_key(), Itob(LOAN_STATUS_REPAID)),
            Log(Bytes("LOAN_CLOSED")),
        ]), Seq([
            Log(Bytes("LOAN_REPAYMENT")),
        ])),
        
        # Log repayment details
        Log(Concat(Bytes("LOAN_REPAY:"), Itob(loan_id))),
        Log(Concat(Bytes("AMOUNT:"), Itob(installment))),
        Log(Concat(Bytes("REPAID_TOTAL:"), Itob(new_repaid_total))),
        Log(Concat(Bytes("REMAINING:"), Itob(new_remaining))),
        
        Approve()
    ])

def mark_default() -> Expr:
    """Mark loan as defaulted (admin only)"""
    return Seq([
        Assert(Txn.on_completion() == OnComplete.NoOp),
        Assert(Global.group_size() == Int(1)),
        Assert(Txn.num_app_args() == Int(1)),
        Assert(Txn.sender() == App.globalGet(ADMIN_KEY)),
        
        # Get loan ID
        loan_id = Btoi(Txn.application_args[0]),
        
        # Check if loan exists
        loan_box_key = get_loan_box_key(loan_id),
        Assert(App.box_length(loan_box_key) > Int(0)),
        
        # Update loan status to DEFAULTED
        App.box_put(loan_box_key, get_loan_status_key(), Itob(LOAN_STATUS_DEFAULTED)),
        
        # Log default
        Log(Concat(Bytes("Loan defaulted: "), Itob(loan_id))),
        
        Approve()
    ])

def fund_app() -> Expr:
    """Fund the application with ALGO (admin only)"""
    return Seq([
        Assert(Txn.on_completion() == OnComplete.NoOp),
        Assert(Global.group_size() == Int(2)),
        Assert(Txn.sender() == App.globalGet(ADMIN_KEY)),
        Assert(Gtxn[0].type_enum() == TxnType.Payment),
        Assert(Gtxn[0].sender() == Txn.sender()),
        Assert(Gtxn[0].receiver() == Global.current_application_address()),
        Assert(Gtxn[0].amount() > Int(0)),
        
        # Log funding
        Log(Bytes("CONTRACT_FUNDED")),
        Log(Concat(Bytes("AMOUNT:"), Itob(Gtxn[0].amount()))),
        Log(Concat(Bytes("FUNDER:"), Txn.sender())),
        
        Approve()
    ])

def get_loan_info() -> Expr:
    """Get loan information"""
    return Seq([
        Assert(Txn.on_completion() == OnComplete.NoOp),
        Assert(Global.group_size() == Int(1)),
        Assert(Txn.num_app_args() == Int(1)),
        
        # Get loan ID
        loan_id = Btoi(Txn.application_args[0]),
        
        # Check if loan exists
        loan_box_key = get_loan_box_key(loan_id),
        
        If(App.box_length(loan_box_key) > Int(0), Seq([
            # Get loan data
            principal = App.box_get(loan_box_key, get_loan_principal_key()),
            term = App.box_get(loan_box_key, get_loan_term_key()),
            status = App.box_get(loan_box_key, get_loan_status_key()),
            borrower = App.box_get(loan_box_key, get_loan_borrower_key()),
            installment = App.box_get(loan_box_key, get_loan_installment_key()),
            remaining = App.box_get(loan_box_key, get_loan_remaining_key()),
            
            # Log loan information
            Log(Concat(Bytes("Loan ID: "), Itob(loan_id))),
            Log(Concat(Bytes("Principal: "), principal)),
            Log(Concat(Bytes("Term: "), term)),
            Log(Concat(Bytes("Status: "), status)),
            Log(Concat(Bytes("Borrower: "), borrower)),
            Log(Concat(Bytes("Installment: "), installment)),
            Log(Concat(Bytes("Remaining: "), remaining)),
        ]), Seq([
            Log(Bytes("Loan not found")),
        ])),
        
        Approve()
    ])

def get_total_loans() -> Expr:
    """Get total number of loans"""
    return Seq([
        Assert(Txn.on_completion() == OnComplete.NoOp),
        Assert(Global.group_size() == Int(1)),
        
        # Log total loans
        Log(Concat(Bytes("Total Loans: "), Itob(App.globalGet(TOTAL_LOANS_KEY)))),
        
        Approve()
    ])

def get_admin() -> Expr:
    """Get admin address"""
    return Seq([
        Assert(Txn.on_completion() == OnComplete.NoOp),
        Assert(Global.group_size() == Int(1)),
        
        # Log admin
        Log(Concat(Bytes("Admin: "), App.globalGet(ADMIN_KEY))),
        
        Approve()
    ])

def router() -> Expr:
    """Main router for the application"""
    return Cond(
        [Txn.application_id() == Int(0), create_microloan()],
        [Txn.on_completion() == OnComplete.DeleteApplication, Return(Txn.sender() == App.globalGet(ADMIN_KEY))],
        [Txn.on_completion() == OnComplete.UpdateApplication, Return(Txn.sender() == App.globalGet(ADMIN_KEY))],
        [Txn.on_completion() == OnComplete.CloseOut, Approve()],
        [Txn.on_completion() == OnComplete.OptIn, Approve()],
        [Txn.application_args[0] == Bytes("request_loan"), request_loan()],
        [Txn.application_args[0] == Bytes("approve_loan"), approve_loan()],
        [Txn.application_args[0] == Bytes("drawdown"), drawdown()],
        [Txn.application_args[0] == Bytes("repay"), repay()],
        [Txn.application_args[0] == Bytes("fund_app"), fund_app()],
        [Txn.application_args[0] == Bytes("mark_default"), mark_default()],
        [Txn.application_args[0] == Bytes("get_loan_info"), get_loan_info()],
        [Txn.application_args[0] == Bytes("get_total_loans"), get_total_loans()],
        [Txn.application_args[0] == Bytes("get_admin"), get_admin()],
    )

def approval_program() -> Expr:
    """Approval program"""
    return router()

def clear_state_program() -> Expr:
    """Clear state program"""
    return Approve()

if __name__ == "__main__":
    # Compile the contracts
    with open("contract.algo", "w") as f:
        f.write(compileTeal(approval_program(), Mode.Application, version=8))
    
    with open("contract.clear.algo", "w") as f:
        f.write(compileTeal(clear_state_program(), Mode.Application, version=8))
