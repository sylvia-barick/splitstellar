#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, String, Vec
};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum GroupStatus {
    Active,
    Archived,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum MemberRole {
    Owner,
    Member,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Member {
    pub id: String,
    pub name: String,
    pub wallet_address: Address,
    pub email: String,
    pub joined_at: u64,
    pub role: MemberRole,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct InviteCode {
    pub group_id: String,
    pub code: String,
    pub created_at: u64,
    pub expires_at: u64,
    pub max_uses: u32,
    pub current_uses: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Group {
    pub id: String,
    pub name: String,
    pub description: String,
    pub currency: String,
    pub invite_code: String,
    pub owner_wallet: Address,
    pub created_at: u64,
    pub updated_at: u64,
    pub status: GroupStatus,
    pub members: Vec<Member>,
}

#[contracttype]
pub enum DataKey {
    Group(String),              // Group ID -> Group
    Invite(String),             // Invite Code -> InviteCode
    GroupList,                  // Vec<String> of all group IDs
    UserGroups(Address),       // Vec<String> of group IDs for a user
}

#[contract]
pub struct GroupContract;

#[contractimpl]
impl GroupContract {
    pub fn create_group(
        env: Env,
        owner: Address,
        group_id: String,
        name: String,
        description: String,
        currency: String,
        owner_name: String,
        invite_code_str: String,
    ) -> Group {
        owner.require_auth();

        let now = env.ledger().timestamp();

        let owner_member = Member {
            id: group_id.clone(),
            name: owner_name,
            wallet_address: owner.clone(),
            email: String::from_str(&env, ""),
            joined_at: now,
            role: MemberRole::Owner,
        };

        let mut members = Vec::new(&env);
        members.push_back(owner_member);

        let group = Group {
            id: group_id.clone(),
            name,
            description,
            currency,
            invite_code: invite_code_str.clone(),
            owner_wallet: owner.clone(),
            created_at: now,
            updated_at: now,
            status: GroupStatus::Active,
            members,
        };

        // Store Group
        env.storage().persistent().set(&DataKey::Group(group_id.clone()), &group);

        // Store Invite Code
        let invite = InviteCode {
            group_id: group_id.clone(),
            code: invite_code_str,
            created_at: now,
            expires_at: now + 604800, // 7 days default
            max_uses: 100,
            current_uses: 0,
        };
        env.storage().persistent().set(&DataKey::Invite(invite.code.clone()), &invite);

        // Track in master list
        let mut master_list: Vec<String> = env.storage().persistent().get(&DataKey::GroupList).unwrap_or(Vec::new(&env));
        master_list.push_back(group_id.clone());
        env.storage().persistent().set(&DataKey::GroupList, &master_list);

        // Add to user groups
        let mut user_list: Vec<String> = env.storage().persistent().get(&DataKey::UserGroups(owner.clone())).unwrap_or(Vec::new(&env));
        user_list.push_back(group_id.clone());
        env.storage().persistent().set(&DataKey::UserGroups(owner.clone()), &user_list);

        // Emit Event
        env.events().publish((symbol_short!("GrpCreate"), group_id), owner);

        group
    }

    pub fn update_group(
        env: Env,
        caller: Address,
        group_id: String,
        name: String,
        description: String,
    ) -> Group {
        caller.require_auth();

        let mut group: Group = env.storage().persistent().get(&DataKey::Group(group_id.clone())).expect("Group not found");
        if group.owner_wallet != caller {
            panic!("Only owner can update group");
        }

        group.name = name;
        group.description = description;
        group.updated_at = env.ledger().timestamp();

        env.storage().persistent().set(&DataKey::Group(group_id), &group);
        group
    }

    pub fn archive_group(env: Env, caller: Address, group_id: String) -> Group {
        caller.require_auth();

        let mut group: Group = env.storage().persistent().get(&DataKey::Group(group_id.clone())).expect("Group not found");
        if group.owner_wallet != caller {
            panic!("Only owner can archive group");
        }

        group.status = GroupStatus::Archived;
        group.updated_at = env.ledger().timestamp();

        env.storage().persistent().set(&DataKey::Group(group_id), &group);
        group
    }

    pub fn delete_group(env: Env, caller: Address, group_id: String) {
        caller.require_auth();

        let group: Group = env.storage().persistent().get(&DataKey::Group(group_id.clone())).expect("Group not found");
        if group.owner_wallet != caller {
            panic!("Only owner can delete group");
        }

        env.storage().persistent().remove(&DataKey::Group(group_id.clone()));
    }

    pub fn join_group_by_code(
        env: Env,
        caller: Address,
        invite_code_str: String,
        member_name: String,
    ) -> Group {
        caller.require_auth();

        let mut invite: InviteCode = env.storage().persistent().get(&DataKey::Invite(invite_code_str.clone())).expect("Invalid invite code");
        if invite.current_uses >= invite.max_uses {
            panic!("Invite code max uses reached");
        }

        let mut group: Group = env.storage().persistent().get(&DataKey::Group(invite.group_id.clone())).expect("Group not found");
        let now = env.ledger().timestamp();

        // Check duplicate
        let mut exists = false;
        for i in 0..group.members.len() {
            if group.members.get(i).unwrap().wallet_address == caller {
                exists = true;
                break;
            }
        }

        if !exists {
            let new_member = Member {
                id: invite_code_str.clone(),
                name: member_name,
                wallet_address: caller.clone(),
                email: String::from_str(&env, ""),
                joined_at: now,
                role: MemberRole::Member,
            };
            group.members.push_back(new_member);
            group.updated_at = now;
            env.storage().persistent().set(&DataKey::Group(group.id.clone()), &group);

            // Add to user group list
            let mut user_list: Vec<String> = env.storage().persistent().get(&DataKey::UserGroups(caller.clone())).unwrap_or(Vec::new(&env));
            user_list.push_back(group.id.clone());
            env.storage().persistent().set(&DataKey::UserGroups(caller.clone()), &user_list);

            invite.current_uses += 1;
            env.storage().persistent().set(&DataKey::Invite(invite_code_str), &invite);

            env.events().publish((symbol_short!("MemJoined"), group.id.clone()), caller);
        }

        group
    }

    pub fn remove_member(env: Env, caller: Address, group_id: String, member_wallet: Address) -> Group {
        caller.require_auth();

        let mut group: Group = env.storage().persistent().get(&DataKey::Group(group_id.clone())).expect("Group not found");
        if group.owner_wallet != caller {
            panic!("Only owner can remove member");
        }
        if member_wallet == group.owner_wallet {
            panic!("Owner cannot be removed");
        }

        let mut new_members = Vec::new(&env);
        for i in 0..group.members.len() {
            let m = group.members.get(i).unwrap();
            if m.wallet_address != member_wallet {
                new_members.push_back(m);
            }
        }
        group.members = new_members;
        group.updated_at = env.ledger().timestamp();

        env.storage().persistent().set(&DataKey::Group(group_id), &group);
        group
    }

    pub fn get_group(env: Env, group_id: String) -> Group {
        env.storage().persistent().get(&DataKey::Group(group_id)).expect("Group not found")
    }

    pub fn get_user_groups(env: Env, wallet_address: Address) -> Vec<Group> {
        let master_list: Vec<String> = env.storage().persistent().get(&DataKey::GroupList).unwrap_or(Vec::new(&env));
        let mut user_groups = Vec::new(&env);

        for i in 0..master_list.len() {
            let gid = master_list.get(i).unwrap();
            if let Some(group) = env.storage().persistent().get::<DataKey, Group>(&DataKey::Group(gid)) {
                let mut is_member = false;
                for j in 0..group.members.len() {
                    if group.members.get(j).unwrap().wallet_address == wallet_address {
                        is_member = true;
                        break;
                    }
                }
                if is_member || group.owner_wallet == wallet_address {
                    user_groups.push_back(group);
                }
            }
        }

        user_groups
    }
}
