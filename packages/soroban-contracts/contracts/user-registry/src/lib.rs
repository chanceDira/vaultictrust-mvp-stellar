#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, Address, Env, String, Vec, symbol_short, BytesN,
};


#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum KycStatus {
    None = 0,
    Pending = 1,
    Verified = 2,
    Rejected = 3,
    Suspended = 4,
}


#[contracttype]
#[derive(Clone, Debug)]
pub struct UserRecord {
    pub address: Address,
    pub status: KycStatus,
    /* @notice IPFS CID for identity metadata (encrypted/hashed) */
    pub metadata_uri: String,
    /* @notice ZK commitment hash (secret + data) */
    pub commitment: BytesN<32>,
    pub updated_at: u64,
}


#[contracttype]
pub enum DataKey {
    Admins,
    User(Address),
    UserList,
    TotalUsers,
}


#[contract]
pub struct VaulticUserRegistry;

#[contractimpl]
impl VaulticUserRegistry {
    
    /* @notice Initializes the registry with a set of admin addresses.
     * @param env The Soroban environment.
     * @param admins A vector of administrative addresses.
     */
    pub fn initialize(env: Env, admins: Vec<Address>) {
        if env.storage().instance().has(&DataKey::Admins) {
            panic!("already initialized");
        }
        if admins.is_empty() {
            panic!("at least one admin required");
        }
        env.storage().instance().set(&DataKey::Admins, &admins);
        env.storage().instance().set(&DataKey::TotalUsers, &0u32);
        env.storage().persistent().set(&DataKey::UserList, &Vec::<Address>::new(&env));
    }

    /* @notice Submits a KYC application. Sets status to PENDING.
     * @param env The Soroban environment.
     * @param user The address of the user submitting the application.
     * @param metadata_uri IPFS CID for identity metadata (encrypted/hashed).
     * @param commitment ZK commitment hash for verification.
     */
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

        if record.status == KycStatus::Verified {
            panic!("user already verified");
        }

        if record.updated_at == 0 {
            let mut total: u32 = env.storage().instance().get(&DataKey::TotalUsers).unwrap_or(0);
            total += 1;
            env.storage().instance().set(&DataKey::TotalUsers, &total);

            let mut list: Vec<Address> = env.storage().persistent().get(&DataKey::UserList).unwrap_or(Vec::new(&env));
            list.push_back(user.clone());
            env.storage().persistent().set(&DataKey::UserList, &list);
        }

        record.status = KycStatus::Pending;
        record.metadata_uri = metadata_uri;
        record.commitment = commitment;
        record.updated_at = env.ledger().timestamp();

        env.storage().persistent().set(&DataKey::User(user.clone()), &record);
        env.events().publish((symbol_short!("kyc_sub"), user), env.ledger().timestamp());
    }

    /* @notice Updates a user's KYC status. Admin only.
     * @param env The Soroban environment.
     * @param caller The address of the administrator.
     * @param user The address of the user whose status is being updated.
     * @param status The new KYC status.
     */
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

    /* @notice Batch update statuses for efficiency. Admin only.
     * @param env The Soroban environment.
     * @param caller The address of the administrator.
     * @param users A vector of user addresses.
     * @param status The new status for all specified users.
     */
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


    /* @notice Returns the full user record.
     * @param env The Soroban environment.
     * @param user The address of the user.
     * @return UserRecord The complete user profile.
     */
    pub fn get_user(env: Env, user: Address) -> UserRecord {
        env.storage().persistent().get(&DataKey::User(user.clone())).unwrap_or(UserRecord {
            address: user,
            status: KycStatus::None,
            metadata_uri: String::from_str(&env, ""),
            commitment: BytesN::from_array(&env, &[0u8; 32]),
            updated_at: 0,
        })
    }

    /* @notice Simple check for other contracts.
     * @param env The Soroban environment.
     * @param user The address of the user.
     * @return bool True if the user is verified.
     */
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


    pub fn get_admins(env: Env) -> Vec<Address> {
        env.storage().instance().get(&DataKey::Admins).expect("not initialized")
    }

    /* @notice Transfers administrative power to a new set of addresses. Admin only.
     * @param env The Soroban environment.
     * @param caller The address of the current administrator.
     * @param new_admins The new vector of administrative addresses.
     */
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

    /* @notice Upgrades the contract WASM. Admin only.
     * @param env The Soroban environment.
     * @param caller The address of the administrator.
     * @param new_wasm_hash The hash of the new WASM binary.
     */
    pub fn upgrade(env: Env, caller: Address, new_wasm_hash: BytesN<32>) {
        caller.require_auth();
        let admins: Vec<Address> = env.storage().instance().get(&DataKey::Admins).expect("not initialized");
        if !admins.contains(&caller) {
            panic!("not an admin");
        }
        env.deployer().update_current_contract_wasm(new_wasm_hash);
    }


    pub fn get_total_users(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::TotalUsers).unwrap_or(0)
    }


    pub fn get_all_users(env: Env, offset: u32, limit: u32) -> Vec<Address> {
        let list: Vec<Address> = env.storage().persistent().get(&DataKey::UserList).unwrap_or(Vec::new(&env));
        let mut result = Vec::new(&env);
        let end = core::cmp::min(offset + limit, list.len());
        for i in offset..end {
            result.push_back(list.get(i).unwrap());
        }
        result
    }
}


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


        client.initialize(&Vec::from_array(&env, [admin.clone()]));

        assert_eq!(client.is_verified(&user), false);
        
        let commitment = BytesN::from_array(&env, &[1u8; 32]);
        client.submit_kyc(&user, &String::from_str(&env, "ipfs://identity_hash"), &commitment);
        let record = client.get_user(&user);
        assert!(matches!(record.status, KycStatus::Pending));
        assert_eq!(record.commitment, commitment);
        assert_eq!(client.is_verified(&user), false);

        client.set_status(&admin, &user, &KycStatus::Verified);
        assert_eq!(client.is_verified(&user), true);

        client.set_status(&admin, &user, &KycStatus::Suspended);
        assert_eq!(client.is_verified(&user), false);
    }
}
