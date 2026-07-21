#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, String, Vec
};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ActivityType {
    ExpenseAdded,
    ExpenseUpdated,
    ExpenseDeleted,
    MemberJoined,
    MemberLeft,
    MemberRemoved,
    GroupCreated,
    GroupUpdated,
    GroupArchived,
    SettlementGenerated,
    SettlementPaid,
    MoneyRequested,
    MoneyRequestAccepted,
    MoneyRequestRejected,
    PaymentCompleted,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ActivityItem {
    pub id: String,
    pub group_id: String,
    pub actor_address: Address,
    pub actor_name: String,
    pub activity_type: ActivityType,
    pub description: String,
    pub amount: i128,
    pub currency: String,
    pub timestamp: u64,
}

#[contracttype]
pub enum DataKey {
    Activity(String),               // Activity ID -> ActivityItem
    GroupActivities(String),        // Group ID -> Vec<String> IDs
    UserActivities(Address),        // User Address -> Vec<String> IDs
}

#[contract]
pub struct ActivityContract;

#[contractimpl]
impl ActivityContract {
    pub fn log_activity(
        env: Env,
        caller: Address,
        activity_id: String,
        group_id: String,
        actor_address: Address,
        actor_name: String,
        activity_type: ActivityType,
        description: String,
        amount: i128,
        currency: String,
    ) -> ActivityItem {
        caller.require_auth();

        let now = env.ledger().timestamp();

        let item = ActivityItem {
            id: activity_id.clone(),
            group_id: group_id.clone(),
            actor_address: actor_address.clone(),
            actor_name,
            activity_type,
            description,
            amount,
            currency,
            timestamp: now,
        };

        // Save activity
        env.storage().persistent().set(&DataKey::Activity(activity_id.clone()), &item);

        // Group index
        let mut group_list: Vec<String> = env.storage().persistent().get(&DataKey::GroupActivities(group_id.clone())).unwrap_or(Vec::new(&env));
        group_list.push_back(activity_id.clone());
        env.storage().persistent().set(&DataKey::GroupActivities(group_id.clone()), &group_list);

        // User index
        let mut user_list: Vec<String> = env.storage().persistent().get(&DataKey::UserActivities(actor_address.clone())).unwrap_or(Vec::new(&env));
        user_list.push_back(activity_id.clone());
        env.storage().persistent().set(&DataKey::UserActivities(actor_address), &user_list);

        // Emit Event
        env.events().publish((symbol_short!("ActLogged"), group_id), activity_id);

        item
    }

    pub fn get_group_activities(env: Env, group_id: String) -> Vec<ActivityItem> {
        let ids: Vec<String> = env.storage().persistent().get(&DataKey::GroupActivities(group_id)).unwrap_or(Vec::new(&env));
        let mut list = Vec::new(&env);

        for i in 0..ids.len() {
            let id = ids.get(i).unwrap();
            if let Some(act) = env.storage().persistent().get::<DataKey, ActivityItem>(&DataKey::Activity(id)) {
                list.push_back(act);
            }
        }

        list
    }

    pub fn get_user_activities(env: Env, wallet_address: Address) -> Vec<ActivityItem> {
        let ids: Vec<String> = env.storage().persistent().get(&DataKey::UserActivities(wallet_address)).unwrap_or(Vec::new(&env));
        let mut list = Vec::new(&env);

        for i in 0..ids.len() {
            let id = ids.get(i).unwrap();
            if let Some(act) = env.storage().persistent().get::<DataKey, ActivityItem>(&DataKey::Activity(id)) {
                list.push_back(act);
            }
        }

        list
    }
}
