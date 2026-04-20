#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, Address, Env, String, Vec, symbol_short, BytesN,
};

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum KycStatus {
    None = 0,
    Pending = 1,
    Verified = 2,
    Rejected = 3,
    Suspended = 4,
}

// ---------------------------------------------------------------------------
// Structs
// ---------------------------------------------------------------------------

#[contracttype]
#[derive(Clone, Debug)]
pub struct UserRecord {
    pub address: Address,
    pub status: KycStatus,
    pub metadata_uri: String, // IPFS CID for identity metadata (encrypted/hashed)
    pub commitment: BytesN<32>, // ZK commitment hash (secret + data)
    pub updated_at: u64,
}

// ---------------------------------------------------------------------------
// Storage Keys
// ---------------------------------------------------------------------------

#[contracttype]
pub enum DataKey {
    Admins,
    User(Address),
}

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

#[contract]
pub struct VaulticUserRegistry;

#[contractimpl]
impl VaulticUserRegistry {
    
    /// Initializes the registry with a set of admin addresses.
    pub fn initialize(env: Env, admins: Vec<Address>) {
        if env.storage().instance().has(&DataKey::Admins) {
            panic!("already initialized");
        }
        if admins.is_empty() {
            panic!("at least one admin required");
        }
        env.storage().instance().set(&DataKey::Admins, &admins);
    }

    /// Submits a KYC application. Sets status to PENDING.
    pub fn submit_kyc(env: Env, user: Address, metadata_uri: String, commitment: BytesN<32>) {
        user.require_auth();

        let mut record = env.storage().persistent()
            .get(&DataKey::User(user.clone()))
            .unwrap_or(UserRecord {
                address: user.clone(),
                status: KycStatus::None,
                metadata_uri: String::from_str(&env, ""),
                commitment: BytesN::from_array(&env, &[0u8; 32]),
                updated_at: 0,
            });

        // Prevention: don't overwrite a Verified status without admin intervention
        if record.status == KycStatus::Verified {
            panic!("user already verified");
        }

        record.status = KycStatus::Pending;
        record.metadata_uri = metadata_uri;
        record.commitment = commitment;
        record.updated_at = env.ledger().timestamp();

        env.storage().persistent().set(&DataKey::User(user.clone()), &record);
        env.events().publish((symbol_short!("kyc_sub"), user), env.ledger().timestamp());
    }

    /// Updates a user's KYC status. Admin only.
    pub fn set_status(env: Env, caller: Address, user: Address, status: KycStatus) {
        caller.require_auth();
        let admins: Vec<Address> = env.storage().instance().get(&DataKey::Admins).expect("not initialized");
        if !admins.contains(&caller) {
            panic!("not an admin");
        }

        let mut record: UserRecord = env.storage().persistent()
            .get(&DataKey::User(user.clone()))
            .expect("user record not found");

        record.status = status;
        record.updated_at = env.ledger().timestamp();

        env.storage().persistent().set(&DataKey::User(user.clone()), &record);
        env.events().publish((symbol_short!("kyc_upd"), user), status as u32);
    }

    /// Batch update statuses for efficiency. Admin only.
    pub fn batch_set_status(env: Env, caller: Address, users: soroban_sdk::Vec<Address>, status: KycStatus) {
        caller.require_auth();
        let admins: Vec<Address> = env.storage().instance().get(&DataKey::Admins).expect("not initialized");
        if !admins.contains(&caller) {
            panic!("not an admin");
        }

        for user in users.iter() {
            let mut record: UserRecord = env.storage().persistent()
                .get(&DataKey::User(user.clone()))
                .expect("user record not found");
            record.status = status;
            record.updated_at = env.ledger().timestamp();
            env.storage().persistent().set(&DataKey::User(user.clone()), &record);
            env.events().publish((symbol_short!("kyc_upd"), user), status as u32);
        }
    }

    // -----------------------------------------------------------------------
    // View Functions
    // -----------------------------------------------------------------------

    /// Returns the full user record.
    pub fn get_user(env: Env, user: Address) -> UserRecord {
        env.storage().persistent().get(&DataKey::User(user.clone())).unwrap_or(UserRecord {
            address: user,
            status: KycStatus::None,
            metadata_uri: String::from_str(&env, ""),
            commitment: BytesN::from_array(&env, &[0u8; 32]),
            updated_at: 0,
        })
    }

    /// Simple check for other contracts.
    pub fn is_verified(env: Env, user: Address) -> bool {
        let record = env.storage().persistent()
            .get(&DataKey::User(user))
            .unwrap_or(UserRecord {
                address: Address::from_string(&String::from_str(&env, "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF")),
                status: KycStatus::None,
                metadata_uri: String::from_str(&env, ""),
                commitment: BytesN::from_array(&env, &[0u8; 32]),
                updated_at: 0,
            });
        record.status == KycStatus::Verified
    }

    /// Returns the current admins.
    pub fn get_admins(env: Env) -> Vec<Address> {
        env.storage().instance().get(&DataKey::Admins).expect("not initialized")
    }

    /// Transfers administrative power to a new set of addresses. Admin only.
    pub fn set_admins(env: Env, caller: Address, new_admins: Vec<Address>) {
        caller.require_auth();
        let admins: Vec<Address> = env.storage().instance().get(&DataKey::Admins).expect("not initialized");
        if !admins.contains(&caller) {
            panic!("not an admin");
        }
        if new_admins.is_empty() {
            panic!("at least one admin required");
        }
        env.storage().instance().set(&DataKey::Admins, &new_admins);
        env.events().publish((symbol_short!("adm_xfr"),), env.ledger().timestamp());
    }

    /// Upgrades the contract WASM. Admin only.
    pub fn upgrade(env: Env, caller: Address, new_wasm_hash: BytesN<32>) {
        caller.require_auth();
        let admins: Vec<Address> = env.storage().instance().get(&DataKey::Admins).expect("not initialized");
        if !admins.contains(&caller) {
            panic!("not an admin");
        }
        env.deployer().update_current_contract_wasm(new_wasm_hash);
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::{Address as _};

    #[test]
    fn test_kyc_lifecycle() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let user = Address::generate(&env);
        
        let contract_id = env.register_contract(None, VaulticUserRegistry);
        let client = VaulticUserRegistryClient::new(&env, &contract_id);

        // Initialize with a Vec as required by current signature
        client.initialize(&Vec::from_array(&env, [admin.clone()]));

        // Initial check
        assert_eq!(client.is_verified(&user), false);
        
        // Submit
        let commitment = BytesN::from_array(&env, &[1u8; 32]);
        client.submit_kyc(&user, &String::from_str(&env, "ipfs://identity_hash"), &commitment);
        let record = client.get_user(&user);
        assert!(matches!(record.status, KycStatus::Pending));
        assert_eq!(record.commitment, commitment);
        assert_eq!(client.is_verified(&user), false);

        // Approve (Passing admin as caller)
        client.set_status(&admin, &user, &KycStatus::Verified);
        assert_eq!(client.is_verified(&user), true);

        // Suspend (Passing admin as caller)
        client.set_status(&admin, &user, &KycStatus::Suspended);
        assert_eq!(client.is_verified(&user), false);
    }
}
