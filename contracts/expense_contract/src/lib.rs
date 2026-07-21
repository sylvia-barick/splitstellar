#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, String, Vec
};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum SplitType {
    Equal,
    Percentage,
    Exact,
    Shares,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Participant {
    pub wallet_address: Address,
    pub name: String,
    pub share_amount: i128,
    pub percentage: u32,
    pub exact_amount: i128,
    pub shares: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Expense {
    pub id: String,
    pub group_id: String,
    pub title: String,
    pub amount: i128, // In stroops/scaled units or float int
    pub currency: String,
    pub paid_by: Address,
    pub category: String,
    pub split_type: SplitType,
    pub participants: Vec<Participant>,
    pub created_at: u64,
    pub updated_at: u64,
}

#[contracttype]
pub enum DataKey {
    Expense(String),                 // Expense ID -> Expense
    GroupExpenses(String),           // Group ID -> Vec<String> expense IDs
}

#[contract]
pub struct ExpenseContract;

#[contractimpl]
impl ExpenseContract {
    pub fn add_expense(
        env: Env,
        caller: Address,
        expense_id: String,
        group_id: String,
        title: String,
        amount: i128,
        currency: String,
        paid_by: Address,
        category: String,
        split_type: SplitType,
        participants: Vec<Participant>,
    ) -> Expense {
        caller.require_auth();

        if amount <= 0 {
            panic!("Expense amount must be positive");
        }

        let now = env.ledger().timestamp();

        let expense = Expense {
            id: expense_id.clone(),
            group_id: group_id.clone(),
            title,
            amount,
            currency,
            paid_by,
            category,
            split_type,
            participants,
            created_at: now,
            updated_at: now,
        };

        // Store Expense
        env.storage().persistent().set(&DataKey::Expense(expense_id.clone()), &expense);

        // Track in group expenses
        let mut exp_list: Vec<String> = env.storage().persistent().get(&DataKey::GroupExpenses(group_id.clone())).unwrap_or(Vec::new(&env));
        exp_list.push_back(expense_id.clone());
        env.storage().persistent().set(&DataKey::GroupExpenses(group_id.clone()), &exp_list);

        // Emit Event
        env.events().publish((symbol_short!("ExpAdded"), group_id), expense_id);

        expense
    }

    pub fn edit_expense(
        env: Env,
        caller: Address,
        expense_id: String,
        title: String,
        amount: i128,
        category: String,
        split_type: SplitType,
        participants: Vec<Participant>,
    ) -> Expense {
        caller.require_auth();

        if amount <= 0 {
            panic!("Expense amount must be positive");
        }

        let mut expense: Expense = env.storage().persistent().get(&DataKey::Expense(expense_id.clone())).expect("Expense not found");
        if expense.paid_by != caller {
            panic!("Only payer can edit expense");
        }

        expense.title = title;
        expense.amount = amount;
        expense.category = category;
        expense.split_type = split_type;
        expense.participants = participants;
        expense.updated_at = env.ledger().timestamp();

        env.storage().persistent().set(&DataKey::Expense(expense_id.clone()), &expense);

        env.events().publish((symbol_short!("ExpEdit"), expense.group_id.clone()), expense_id);

        expense
    }

    pub fn delete_expense(env: Env, caller: Address, expense_id: String) {
        caller.require_auth();

        let expense: Expense = env.storage().persistent().get(&DataKey::Expense(expense_id.clone())).expect("Expense not found");
        if expense.paid_by != caller {
            panic!("Only payer can delete expense");
        }

        env.storage().persistent().remove(&DataKey::Expense(expense_id.clone()));
    }

    pub fn get_expense(env: Env, expense_id: String) -> Expense {
        env.storage().persistent().get(&DataKey::Expense(expense_id)).expect("Expense not found")
    }

    pub fn get_group_expenses(env: Env, group_id: String) -> Vec<Expense> {
        let exp_ids: Vec<String> = env.storage().persistent().get(&DataKey::GroupExpenses(group_id)).unwrap_or(Vec::new(&env));
        let mut result = Vec::new(&env);

        for i in 0..exp_ids.len() {
            let eid = exp_ids.get(i).unwrap();
            if let Some(exp) = env.storage().persistent().get::<DataKey, Expense>(&DataKey::Expense(eid)) {
                result.push_back(exp);
            }
        }

        result
    }
}
