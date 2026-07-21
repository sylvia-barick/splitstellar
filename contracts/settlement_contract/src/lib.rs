#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, String, Vec
};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum PaymentStatus {
    Pending,
    Paid,
    Completed,
    Failed,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SettlementTransaction {
    pub id: String,
    pub group_id: String,
    pub from: Address,
    pub to: Address,
    pub amount: i128,
    pub currency: String,
    pub status: PaymentStatus,
    pub transaction_hash: String,
    pub ledger_number: u32,
    pub timestamp: u64,
    pub note: String,
    pub settlement_id: String,
    pub request_id: String,
}

#[contracttype]
pub enum DataKey {
    Settlement(String),               // ID -> SettlementTransaction
    GroupSettlements(String),        // Group ID -> Vec<String> IDs
    UserSettlements(Address),        // User Address -> Vec<String> IDs
    TxHash(String),                  // Transaction Hash -> bool (prevent duplicate payment replays)
}

#[contract]
pub struct SettlementContract;

#[contractimpl]
impl SettlementContract {
    pub fn record_payment(
        env: Env,
        caller: Address,
        payment_id: String,
        group_id: String,
        from: Address,
        to: Address,
        amount: i128,
        currency: String,
        transaction_hash: String,
        ledger_number: u32,
    ) -> SettlementTransaction {
        caller.require_auth();

        if amount <= 0 {
            panic!("Payment amount must be greater than zero");
        }

        // Prevent duplicate transaction hash submission (replay attack protection)
        if transaction_hash.len() > 0 {
            if env.storage().persistent().has(&DataKey::TxHash(transaction_hash.clone())) {
                panic!("Transaction hash has already been recorded");
            }
            env.storage().persistent().set(&DataKey::TxHash(transaction_hash.clone()), &true);
        }

        let now = env.ledger().timestamp();

        let tx = SettlementTransaction {
            id: payment_id.clone(),
            group_id: group_id.clone(),
            from: from.clone(),
            to: to.clone(),
            amount,
            currency,
            status: PaymentStatus::Completed,
            transaction_hash,
            ledger_number,
            timestamp: now,
            note: String::from_str(&env, ""),
            settlement_id: String::from_str(&env, ""),
            request_id: String::from_str(&env, ""),
        };

        // Store settlement transaction
        env.storage().persistent().set(&DataKey::Settlement(payment_id.clone()), &tx);

        // Group index
        let mut group_list: Vec<String> = env.storage().persistent().get(&DataKey::GroupSettlements(group_id.clone())).unwrap_or(Vec::new(&env));
        group_list.push_back(payment_id.clone());
        env.storage().persistent().set(&DataKey::GroupSettlements(group_id.clone()), &group_list);

        // User indexes
        let mut from_list: Vec<String> = env.storage().persistent().get(&DataKey::UserSettlements(from.clone())).unwrap_or(Vec::new(&env));
        from_list.push_back(payment_id.clone());
        env.storage().persistent().set(&DataKey::UserSettlements(from), &from_list);

        let mut to_list: Vec<String> = env.storage().persistent().get(&DataKey::UserSettlements(to.clone())).unwrap_or(Vec::new(&env));
        to_list.push_back(payment_id.clone());
        env.storage().persistent().set(&DataKey::UserSettlements(to), &to_list);

        // Emit Events
        env.events().publish((symbol_short!("StlPaid"), group_id.clone()), payment_id.clone());
        env.events().publish((symbol_short!("PayComp"), group_id), payment_id);

        tx
    }

    pub fn get_settlement(env: Env, payment_id: String) -> SettlementTransaction {
        env.storage().persistent().get(&DataKey::Settlement(payment_id)).expect("Settlement transaction not found")
    }

    pub fn get_group_settlements(env: Env, group_id: String) -> Vec<SettlementTransaction> {
        let ids: Vec<String> = env.storage().persistent().get(&DataKey::GroupSettlements(group_id)).unwrap_or(Vec::new(&env));
        let mut list = Vec::new(&env);

        for i in 0..ids.len() {
            let id = ids.get(i).unwrap();
            if let Some(tx) = env.storage().persistent().get::<DataKey, SettlementTransaction>(&DataKey::Settlement(id)) {
                list.push_back(tx);
            }
        }

        list
    }

    pub fn get_user_settlements(env: Env, wallet_address: Address) -> Vec<SettlementTransaction> {
        let ids: Vec<String> = env.storage().persistent().get(&DataKey::UserSettlements(wallet_address)).unwrap_or(Vec::new(&env));
        let mut list = Vec::new(&env);

        for i in 0..ids.len() {
            let id = ids.get(i).unwrap();
            if let Some(tx) = env.storage().persistent().get::<DataKey, SettlementTransaction>(&DataKey::Settlement(id)) {
                list.push_back(tx);
            }
        }

        list
    }
}
