#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, String, Vec
};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum RequestType {
    Request,
    DirectLoan,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum RequestStatus {
    Pending,
    Accepted,
    Rejected,
    Paid,
    Completed,
    Cancelled,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MoneyRequest {
    pub id: String,
    pub group_id: String,
    pub from: Address,
    pub to: Address,
    pub amount: i128,
    pub currency: String,
    pub note: String,
    pub status: RequestStatus,
    pub request_type: RequestType,
    pub created_at: u64,
    pub updated_at: u64,
    pub transaction_hash: String,
    pub ledger_number: u32,
    pub return_tx_hash: String,
}

#[contracttype]
pub enum DataKey {
    Request(String),               // Request ID -> MoneyRequest
    GroupRequests(String),         // Group ID -> Vec<String> IDs
    UserRequests(Address),         // User Address -> Vec<String> IDs
}

#[contract]
pub struct MoneyRequestContract;

#[contractimpl]
impl MoneyRequestContract {
    pub fn create_request(
        env: Env,
        caller: Address,
        request_id: String,
        group_id: String,
        from: Address,
        to: Address,
        amount: i128,
        currency: String,
        note: String,
        request_type: RequestType,
    ) -> MoneyRequest {
        caller.require_auth();

        if caller != from {
            panic!("Only requester/lender can create request");
        }
        if amount <= 0 {
            panic!("Request amount must be positive");
        }

        let now = env.ledger().timestamp();

        let req = MoneyRequest {
            id: request_id.clone(),
            group_id: group_id.clone(),
            from: from.clone(),
            to: to.clone(),
            amount,
            currency,
            note,
            status: RequestStatus::Pending,
            request_type,
            created_at: now,
            updated_at: now,
            transaction_hash: String::from_str(&env, ""),
            ledger_number: 0,
            return_tx_hash: String::from_str(&env, ""),
        };

        // Save request
        env.storage().persistent().set(&DataKey::Request(request_id.clone()), &req);

        // Group index
        let mut group_list: Vec<String> = env.storage().persistent().get(&DataKey::GroupRequests(group_id.clone())).unwrap_or(Vec::new(&env));
        group_list.push_back(request_id.clone());
        env.storage().persistent().set(&DataKey::GroupRequests(group_id.clone()), &group_list);

        // User indexes
        let mut from_list: Vec<String> = env.storage().persistent().get(&DataKey::UserRequests(from.clone())).unwrap_or(Vec::new(&env));
        from_list.push_back(request_id.clone());
        env.storage().persistent().set(&DataKey::UserRequests(from), &from_list);

        let mut to_list: Vec<String> = env.storage().persistent().get(&DataKey::UserRequests(to.clone())).unwrap_or(Vec::new(&env));
        to_list.push_back(request_id.clone());
        env.storage().persistent().set(&DataKey::UserRequests(to), &to_list);

        // Emit event
        env.events().publish((symbol_short!("MoneyReq"), group_id), request_id);

        req
    }

    pub fn accept_request(env: Env, caller: Address, request_id: String) -> MoneyRequest {
        caller.require_auth();

        let mut req: MoneyRequest = env.storage().persistent().get(&DataKey::Request(request_id.clone())).expect("Request not found");
        if req.to != caller {
            panic!("Only recipient can accept request");
        }

        req.status = RequestStatus::Accepted;
        req.updated_at = env.ledger().timestamp();

        env.storage().persistent().set(&DataKey::Request(request_id.clone()), &req);

        env.events().publish((symbol_short!("ReqAcc"), req.group_id.clone()), request_id);

        req
    }

    pub fn reject_request(env: Env, caller: Address, request_id: String) -> MoneyRequest {
        caller.require_auth();

        let mut req: MoneyRequest = env.storage().persistent().get(&DataKey::Request(request_id.clone())).expect("Request not found");
        if req.to != caller && req.from != caller {
            panic!("Unauthorized to reject request");
        }

        req.status = RequestStatus::Rejected;
        req.updated_at = env.ledger().timestamp();

        env.storage().persistent().set(&DataKey::Request(request_id.clone()), &req);

        env.events().publish((symbol_short!("ReqRej"), req.group_id.clone()), request_id);

        req
    }

    pub fn mark_request_paid(
        env: Env,
        caller: Address,
        request_id: String,
        transaction_hash: String,
        ledger_number: u32,
    ) -> MoneyRequest {
        caller.require_auth();

        let mut req: MoneyRequest = env.storage().persistent().get(&DataKey::Request(request_id.clone())).expect("Request not found");
        
        req.status = RequestStatus::Paid;
        req.transaction_hash = transaction_hash;
        req.ledger_number = ledger_number;
        req.updated_at = env.ledger().timestamp();

        env.storage().persistent().set(&DataKey::Request(request_id.clone()), &req);

        env.events().publish((symbol_short!("ReqPaid"), req.group_id.clone()), request_id);

        req
    }

    pub fn get_request(env: Env, request_id: String) -> MoneyRequest {
        env.storage().persistent().get(&DataKey::Request(request_id)).expect("Request not found")
    }

    pub fn get_group_requests(env: Env, group_id: String) -> Vec<MoneyRequest> {
        let ids: Vec<String> = env.storage().persistent().get(&DataKey::GroupRequests(group_id)).unwrap_or(Vec::new(&env));
        let mut list = Vec::new(&env);

        for i in 0..ids.len() {
            let id = ids.get(i).unwrap();
            if let Some(req) = env.storage().persistent().get::<DataKey, MoneyRequest>(&DataKey::Request(id)) {
                list.push_back(req);
            }
        }

        list
    }

    pub fn get_user_requests(env: Env, wallet_address: Address) -> Vec<MoneyRequest> {
        let ids: Vec<String> = env.storage().persistent().get(&DataKey::UserRequests(wallet_address)).unwrap_or(Vec::new(&env));
        let mut list = Vec::new(&env);

        for i in 0..ids.len() {
            let id = ids.get(i).unwrap();
            if let Some(req) = env.storage().persistent().get::<DataKey, MoneyRequest>(&DataKey::Request(id)) {
                list.push_back(req);
            }
        }

        list
    }
}
