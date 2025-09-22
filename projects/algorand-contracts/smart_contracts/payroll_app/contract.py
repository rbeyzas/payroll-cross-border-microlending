from pyteal import *

# Global state keys
ASA_ID_KEY = Bytes("asa_id")
CYCLE_SECS_KEY = Bytes("cycle_secs")
ADMIN_KEY = Bytes("admin")
TOTAL_EMPLOYEES_KEY = Bytes("total_employees")
LAST_DISBURSEMENT_KEY = Bytes("last_disbursement")

def get_employee_box_key(employee_address: Expr) -> Expr:
    """Generate box storage key for employee data"""
    return Concat(Bytes("emp_"), employee_address)

def get_employee_amount_key() -> Expr:
    """Get employee amount key"""
    return Bytes("amount")

def get_employee_paused_key() -> Expr:
    """Get employee paused key"""
    return Bytes("paused")

def create_payroll() -> Expr:
    """Initialize payroll system"""
    asa_id = Btoi(Txn.application_args[0])
    cycle_secs = Btoi(Txn.application_args[1])
    admin = Txn.application_args[2]
    
    return Seq([
        Assert(Txn.on_completion() == OnComplete.NoOp),
        Assert(Global.group_size() == Int(1)),
        Assert(Balance(Global.current_application_address()) >= Int(100000)),  # Min balance for app
        
        # Set global state
        App.globalPut(ASA_ID_KEY, asa_id),
        App.globalPut(CYCLE_SECS_KEY, cycle_secs),
        App.globalPut(ADMIN_KEY, admin),
        App.globalPut(TOTAL_EMPLOYEES_KEY, Int(0)),
        App.globalPut(LAST_DISBURSEMENT_KEY, Int(0)),
        
        Approve()
    ])

def add_employee() -> Expr:
    """Add employee to payroll"""
    employee_address = Txn.application_args[0]
    amount = Btoi(Txn.application_args[1])
    
    return Seq([
        Assert(Txn.on_completion() == OnComplete.NoOp),
        Assert(Global.group_size() == Int(1)),
        Assert(Txn.sender() == App.globalGet(ADMIN_KEY)),
        Assert(amount > Int(0)),
        
        # Create employee box storage
        employee_box_key = get_employee_box_key(employee_address),
        amount_key = get_employee_amount_key(),
        paused_key = get_employee_paused_key(),
        
        # Check if employee already exists
        Assert(App.box_length(employee_box_key) == Int(0)),
        
        # Create box with employee data (amount + paused status)
        App.box_create(employee_box_key, Int(16)),  # 8 bytes for amount + 8 bytes for paused
        
        # Store employee data
        App.box_put(employee_box_key, amount_key, Itob(amount)),
        App.box_put(employee_box_key, paused_key, Itob(Int(0))),  # Not paused
        
        # Update total employees count
        App.globalPut(TOTAL_EMPLOYEES_KEY, App.globalGet(TOTAL_EMPLOYEES_KEY) + Int(1)),
        
        Approve()
    ])

def remove_employee() -> Expr:
    """Remove employee from payroll"""
    employee_address = Txn.application_args[0]
    
    return Seq([
        Assert(Txn.on_completion() == OnComplete.NoOp),
        Assert(Global.group_size() == Int(1)),
        Assert(Txn.sender() == App.globalGet(ADMIN_KEY)),
        
        # Check if employee exists
        employee_box_key = get_employee_box_key(employee_address),
        Assert(App.box_length(employee_box_key) > Int(0)),
        
        # Delete employee box storage
        App.box_delete(employee_box_key),
        
        # Update total employees count
        App.globalPut(TOTAL_EMPLOYEES_KEY, App.globalGet(TOTAL_EMPLOYEES_KEY) - Int(1)),
        
        Approve()
    ])

def fund_app() -> Expr:
    """Fund the application with ALGO or ASA"""
    amount = Btoi(Txn.application_args[0])
    asa_id = App.globalGet(ASA_ID_KEY)
    
    return Seq([
        Assert(Txn.on_completion() == OnComplete.NoOp),
        Assert(Global.group_size() == Int(2)),
        Assert(Gtxn[0].type_enum() == TxnType.Payment),
        Assert(Gtxn[0].receiver() == Global.current_application_address()),
        Assert(Gtxn[0].amount() == amount),
        
        # If ASA is specified, also check ASA transfer
        If(asa_id > Int(0), Seq([
            Assert(Gtxn[1].type_enum() == TxnType.AssetTransfer),
            Assert(Gtxn[1].asset_receiver() == Global.current_application_address()),
            Assert(Gtxn[1].xfer_asset() == asa_id),
        ]),
        
        Approve()
    ])

def disburse() -> Expr:
    """Disburse payments to employees in batches"""
    batch_size = Btoi(Txn.application_args[0])
    
    return Seq([
        Assert(Txn.on_completion() == OnComplete.NoOp),
        Assert(Global.group_size() == Int(1)),
        Assert(Txn.sender() == App.globalGet(ADMIN_KEY)),
        Assert(batch_size > Int(0)),
        
        # TODO: Implement batch disbursement logic
        # This would require iterating through employees and creating payment transactions
        # For now, just approve
        Approve()
    ])

def pause_employee() -> Expr:
    """Pause or unpause an employee"""
    employee_address = Txn.application_args[0]
    paused = Btoi(Txn.application_args[1])
    
    return Seq([
        Assert(Txn.on_completion() == OnComplete.NoOp),
        Assert(Global.group_size() == Int(1)),
        Assert(Txn.sender() == App.globalGet(ADMIN_KEY)),
        Assert(Or(paused == Int(0), paused == Int(1))),
        
        # Check if employee exists
        employee_box_key = get_employee_box_key(employee_address),
        Assert(App.box_length(employee_box_key) > Int(0)),
        
        # Update paused status
        paused_key = get_employee_paused_key(),
        App.box_put(employee_box_key, paused_key, Itob(paused)),
        
        Approve()
    ])

def get_employee_info() -> Expr:
    """Get employee information"""
    employee_address = Txn.application_args[0]
    
    return Seq([
        Assert(Txn.on_completion() == OnComplete.NoOp),
        Assert(Global.group_size() == Int(1)),
        
        # Check if employee exists
        employee_box_key = get_employee_box_key(employee_address),
        
        If(App.box_length(employee_box_key) > Int(0), Seq([
            # Employee exists - return their info
            amount_key = get_employee_amount_key(),
            paused_key = get_employee_paused_key(),
            
            amount_data = App.box_get(employee_box_key, amount_key),
            paused_data = App.box_get(employee_box_key, paused_key),
            
            # Log the information (in a real app, you'd return this data)
            Log(Concat(Bytes("Employee: "), employee_address)),
            Log(Concat(Bytes("Amount: "), amount_data)),
            Log(Concat(Bytes("Paused: "), paused_data)),
        ]), Seq([
            # Employee doesn't exist
            Log(Bytes("Employee not found")),
        ])),
        
        Approve()
    ])

def get_payroll_info() -> Expr:
    """Get payroll system information"""
    return Seq([
        Assert(Txn.on_completion() == OnComplete.NoOp),
        Assert(Global.group_size() == Int(1)),
        
        # Log payroll information
        Log(Concat(Bytes("ASA ID: "), Itob(App.globalGet(ASA_ID_KEY)))),
        Log(Concat(Bytes("Cycle Seconds: "), Itob(App.globalGet(CYCLE_SECS_KEY)))),
        Log(Concat(Bytes("Admin: "), App.globalGet(ADMIN_KEY))),
        Log(Concat(Bytes("Total Employees: "), Itob(App.globalGet(TOTAL_EMPLOYEES_KEY)))),
        Log(Concat(Bytes("Last Disbursement: "), Itob(App.globalGet(LAST_DISBURSEMENT_KEY)))),
        
        Approve()
    ])

def get_total_employees() -> Expr:
    """Get total number of employees"""
    return Seq([
        Assert(Txn.on_completion() == OnComplete.NoOp),
        Assert(Global.group_size() == Int(1)),
        
        # Log total employees
        Log(Concat(Bytes("Total Employees: "), Itob(App.globalGet(TOTAL_EMPLOYEES_KEY)))),
        
        Approve()
    ])

def router() -> Expr:
    """Main router for the application"""
    return Cond(
        [Txn.application_id() == Int(0), create_payroll()],
        [Txn.on_completion() == OnComplete.DeleteApplication, Return(Txn.sender() == App.globalGet(ADMIN_KEY))],
        [Txn.on_completion() == OnComplete.UpdateApplication, Return(Txn.sender() == App.globalGet(ADMIN_KEY))],
        [Txn.on_completion() == OnComplete.CloseOut, Approve()],
        [Txn.on_completion() == OnComplete.OptIn, Approve()],
        [Txn.application_args[0] == Bytes("create_payroll"), create_payroll()],
        [Txn.application_args[0] == Bytes("add_employee"), add_employee()],
        [Txn.application_args[0] == Bytes("remove_employee"), remove_employee()],
        [Txn.application_args[0] == Bytes("fund_app"), fund_app()],
        [Txn.application_args[0] == Bytes("disburse"), disburse()],
        [Txn.application_args[0] == Bytes("pause_employee"), pause_employee()],
        [Txn.application_args[0] == Bytes("get_employee_info"), get_employee_info()],
        [Txn.application_args[0] == Bytes("get_payroll_info"), get_payroll_info()],
        [Txn.application_args[0] == Bytes("get_total_employees"), get_total_employees()],
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