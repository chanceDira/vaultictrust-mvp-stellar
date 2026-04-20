#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, Address, BytesN, Env, String, Vec, symbol_short,
};


#[contracttype]

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum AssetState {
    Pending = 0,
    Active = 1,
    Tokenized = 2,
    Closed = 3,
    Relisted = 4,
}

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum OwnershipModel {
    WholeOwnership = 0,
    Fractional = 1,
}



/* @notice Canonical on-chain record for a registered real-world asset. */
#[contracttype]
#[derive(Clone, Debug)]
pub struct AssetRecord {
    pub asset_id: u32,
    pub asset_owner: Address,
    pub state: AssetState,
    pub model: OwnershipModel,
    pub registered_at: u64,
    pub valuation: i128,
    pub total_shares: i128,
    pub price_per_share: i128,
    pub sold_shares: i128,
    
    /* @notice Stellar Native Asset Code (e.g. VTGOLD) */
    pub asset_code: String,

    /* @notice Stellar Native Asset Issuer (set upon tokenization) */
    pub issuer: Option<Address>,
    pub tokenized_at: u64,
    pub relist_count: u32,
    pub relisted_at: u64,
    pub asset_name: String,
    pub asset_category: String,
    pub metadata_uri: String,
}


#[contracttype]
pub enum DataKey {
    Admins,
    Tokenizer,
    AssetCounter,
    Asset(u32),
    OwnerAssets(Address),
}


#[contract]
pub struct VaulticAssetRegistry;

#[contractimpl]
impl VaulticAssetRegistry {

    /* @notice Initializes the registry. Must be called exactly once.
     * @param env The Soroban environment.
     * @param admins A vector of administrative addresses.
     * @param tokenizer The address authorized to tokenize assets.
     */
    pub fn initialize(env: Env, admins: Vec<Address>, tokenizer: Address) {
        if env.storage().instance().has(&DataKey::Admins) {
            panic!("already initialized");
        }
        if admins.is_empty() {
            panic!("at least one admin required");
        }
        env.storage().instance().set(&DataKey::Admins, &admins);
        env.storage().instance().set(&DataKey::Tokenizer, &tokenizer);
        env.storage().instance().set(&DataKey::AssetCounter, &1u32);
    }


    /* @notice Updates the tokenizer address. Admin only.
     * @param env The Soroban environment.
     * @param caller The address of the administrator calling the function.
     * @param new_tokenizer The new address authorized to tokenize assets.
     */
    pub fn set_tokenizer(env: Env, caller: Address, new_tokenizer: Address) {
        caller.require_auth();
        let admins: Vec<Address> = env.storage().instance().get(&DataKey::Admins).expect("not initialized");
        if !admins.contains(&caller) {
            panic!("not an admin");
        }
        env.storage().instance().set(&DataKey::Tokenizer, &new_tokenizer);
        env.events().publish((symbol_short!("tok_upd"),), new_tokenizer);
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


    pub fn get_admins(env: Env) -> Vec<Address> {
        env.storage().instance().get(&DataKey::Admins).expect("not initialized")
    }


    pub fn get_tokenizer(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Tokenizer).expect("not initialized")
    }


    pub fn get_counter(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::AssetCounter).expect("not initialized")
    }


    /* @notice Registers a new real-world asset. Admin only.
     * @param env The Soroban environment.
     * @param asset_owner The initial owner of the asset record.
     * @param caller The administrator registering the asset.
     * @param asset_name The human-readable name of the asset.
     * @param asset_category The classification of the asset (e.g. "Mining").
     * @param asset_code The token symbol to be used upon tokenization.
     * @param metadata_uri IPFS URI for extended documentation.
     * @param valuation The initial valuation in USDC (7 decimal precision).
     * @param model The ownership model (Whole vs Fractional).
     * @return u32 The assigned unique asset ID.
     */
    pub fn register_asset(
        env: Env,
        asset_owner: Address,
        caller: Address,
        asset_name: String,
        asset_category: String,
        asset_code: String,
        metadata_uri: String,
        valuation: i128,
        model: OwnershipModel,
    ) -> u32 {
        caller.require_auth();
        let admins: Vec<Address> = env.storage().instance().get(&DataKey::Admins).expect("not initialized");
        if !admins.contains(&caller) {
            panic!("not an admin");
        }

        if valuation <= 0 {
            panic!("invalid valuation");
        }

        let mut counter: u32 = env.storage().instance().get(&DataKey::AssetCounter).unwrap_or(1);
        let asset_id = counter;
        counter += 1;
        env.storage().instance().set(&DataKey::AssetCounter, &counter);

        let record = AssetRecord {
            asset_id,
            asset_owner: asset_owner.clone(),
            state: AssetState::Pending,
            model,
            registered_at: env.ledger().timestamp(),
            valuation,
            total_shares: 0i128,
            price_per_share: 0i128,
            sold_shares: 0i128,
            asset_code,
            issuer: None,
            tokenized_at: 0,
            relist_count: 0,
            relisted_at: 0,
            asset_name: asset_name.clone(),
            asset_category: asset_category.clone(),
            metadata_uri: metadata_uri.clone(),
        };

        env.storage().persistent().set(&DataKey::Asset(asset_id), &record);

        let mut owner_assets: Vec<u32> = env
            .storage()
            .persistent()
            .get(&DataKey::OwnerAssets(asset_owner.clone()))
            .unwrap_or(Vec::new(&env));
        owner_assets.push_back(asset_id);
        env.storage().persistent().set(&DataKey::OwnerAssets(asset_owner.clone()), &owner_assets);

        env.events().publish(
            (symbol_short!("reg_ast"), asset_id, asset_owner),
            record.valuation,
        );

        asset_id
    }


    /* @notice Approves a PENDING asset, making it ACTIVE for investment. Admin only.
     * @param env The Soroban environment.
     * @param caller The administrator approving the asset.
     * @param asset_id The ID of the asset to approve.
     */
    pub fn approve_asset(env: Env, caller: Address, asset_id: u32) {
        caller.require_auth();
        let admins: Vec<Address> = env.storage().instance().get(&DataKey::Admins).expect("not initialized");
        if !admins.contains(&caller) {
            panic!("not an admin");
        }

        let mut record: AssetRecord = env.storage().persistent().get(&DataKey::Asset(asset_id)).expect("not found");

        if record.state != AssetState::Pending {
            panic!("invalid transition: must be Pending");
        }

        record.state = AssetState::Active;
        env.storage().persistent().set(&DataKey::Asset(asset_id), &record);
        env.events().publish((symbol_short!("aprv_ast"), asset_id), caller);
    }


    /* @notice Records tokenization details using Stellar Native Assets. Tokenizer only.
     * @param env The Soroban environment.
     * @param asset_id The ID of the asset being tokenized.
     * @param issuer The Stellar issuer account address.
     * @param total_shares The total number of fractional units created.
     * @param price_per_share The price per share in USDC (7 decimal precision).
     */
    pub fn record_tokenization(
        env: Env,
        asset_id: u32,
        issuer: Address,
        total_shares: i128,
        price_per_share: i128,
    ) {
        let tokenizer: Address = env.storage().instance().get(&DataKey::Tokenizer).expect("not initialized");
        tokenizer.require_auth();

        let mut record: AssetRecord = env.storage().persistent().get(&DataKey::Asset(asset_id)).expect("not found");

        if record.model != OwnershipModel::Fractional {
            panic!("model mismatch: must be Fractional");
        }
        if record.state != AssetState::Active && record.state != AssetState::Relisted {
            panic!("invalid state: must be Active or Relisted");
        }
        if total_shares <= 0 || price_per_share <= 0 {
            panic!("invalid inputs: shares and price must be positive");
        }

        record.state = AssetState::Tokenized;
        record.issuer = Some(issuer.clone());
        record.total_shares = total_shares;
        record.price_per_share = price_per_share;
        record.tokenized_at = env.ledger().timestamp();

        env.storage().persistent().set(&DataKey::Asset(asset_id), &record);
        env.events().publish(
            (symbol_short!("tok_ast"), asset_id, issuer),
            (total_shares, price_per_share),
        );
    }


    /* @notice Records additional shares sold for a fractional asset. Tokenizer only.
     * @param env The Soroban environment.
     * @param asset_id The ID of the asset.
     * @param shares_delta The number of new shares sold.
     */
    pub fn record_shares_sold(env: Env, asset_id: u32, shares_delta: i128) {
        let tokenizer: Address = env.storage().instance().get(&DataKey::Tokenizer).expect("not initialized");
        tokenizer.require_auth();

        if shares_delta <= 0 {
            panic!("invalid delta");
        }

        let mut record: AssetRecord = env.storage().persistent().get(&DataKey::Asset(asset_id)).expect("not found");
        record.sold_shares += shares_delta;
        env.storage().persistent().set(&DataKey::Asset(asset_id), &record);
        env.events().publish((symbol_short!("sold_upd"), asset_id), record.sold_shares);
    }


    /* @notice Closes an asset (marks as CLOSED). Callable by admin or tokenizer.
     * @param env The Soroban environment.
     * @param asset_id The ID of the asset to close.
     * @param caller The authorized administrator or tokenizer.
     */
    pub fn close_asset(env: Env, asset_id: u32, caller: Address) {
        caller.require_auth();
        let admins: Vec<Address> = env.storage().instance().get(&DataKey::Admins).expect("not initialized");
        let tokenizer: Address = env.storage().instance().get(&DataKey::Tokenizer).expect("not initialized");

        let mut is_admin = false;
        for admin in admins.iter() {
            if admin == caller {
                is_admin = true;
                break;
            }
        }

        if !is_admin && caller != tokenizer {
            panic!("unauthorized");
        }

        let mut record: AssetRecord = env.storage().persistent().get(&DataKey::Asset(asset_id)).expect("not found");

        if record.state == AssetState::Pending || record.state == AssetState::Closed {
            panic!("invalid transition: cannot close a Pending or already Closed asset");
        }

        record.state = AssetState::Closed;
        env.storage().persistent().set(&DataKey::Asset(asset_id), &record);
        env.events().publish((symbol_short!("cls_ast"), asset_id), caller);
    }


    /* @notice Transfers registered asset ownership to a new address. Tokenizer only.
     * @param env The Soroban environment.
     * @param asset_id The ID of the asset.
     * @param new_owner The address of the new asset owner.
     */
    pub fn transfer_asset_ownership(env: Env, asset_id: u32, new_owner: Address) {
        let tokenizer: Address = env.storage().instance().get(&DataKey::Tokenizer).expect("not initialized");
        tokenizer.require_auth();

        let mut record: AssetRecord = env.storage().persistent().get(&DataKey::Asset(asset_id)).expect("not found");

        let previous_owner = record.asset_owner.clone();
        if previous_owner == new_owner {
            return;
        }

        let mut prev_list: Vec<u32> = env
            .storage()
            .persistent()
            .get(&DataKey::OwnerAssets(previous_owner.clone()))
            .unwrap_or(Vec::new(&env));
        let mut new_prev_list = Vec::new(&env);
        for id in prev_list.iter() {
            if id != asset_id {
                new_prev_list.push_back(id);
            }
        }
        prev_list = new_prev_list;
        env.storage().persistent().set(&DataKey::OwnerAssets(previous_owner.clone()), &prev_list);

        let mut new_list: Vec<u32> = env
            .storage()
            .persistent()
            .get(&DataKey::OwnerAssets(new_owner.clone()))
            .unwrap_or(Vec::new(&env));
        new_list.push_back(asset_id);
        env.storage().persistent().set(&DataKey::OwnerAssets(new_owner.clone()), &new_list);

        record.asset_owner = new_owner.clone();
        env.storage().persistent().set(&DataKey::Asset(asset_id), &record);
        env.events().publish((symbol_short!("own_xfr"), asset_id, previous_owner), new_owner);
    }


    /* @notice Relists a CLOSED FRACTIONAL asset for a new offering round. Tokenizer only.
     * @param env The Soroban environment.
     * @param asset_id The ID of the asset.
     * @param new_valuation the updated valuation.
     * @param new_metadata_uri the updated IPFS metadata.
     */
    pub fn relist_asset(
        env: Env,
        asset_id: u32,
        new_valuation: i128,
        new_metadata_uri: String,
    ) {
        let tokenizer: Address = env.storage().instance().get(&DataKey::Tokenizer).expect("not initialized");
        tokenizer.require_auth();

        if new_valuation <= 0 {
            panic!("invalid valuation");
        }

        let mut record: AssetRecord = env.storage().persistent().get(&DataKey::Asset(asset_id)).expect("not found");

        if record.state != AssetState::Closed {
            panic!("must be Closed to relist");
        }
        if record.model != OwnershipModel::Fractional {
            panic!("model mismatch: must be Fractional");
        }

        record.state = AssetState::Relisted;
        record.valuation = new_valuation;
        record.metadata_uri = new_metadata_uri;
        record.sold_shares = 0;
        record.total_shares = 0;
        record.price_per_share = 0;
        record.tokenized_at = 0;
        record.relist_count += 1;
        record.relisted_at = env.ledger().timestamp();

        env.storage().persistent().set(&DataKey::Asset(asset_id), &record);
        env.events().publish(
            (symbol_short!("relist"), asset_id, record.asset_owner),
            (new_valuation, record.relist_count),
        );
    }


    pub fn relist_whole_asset(
        env: Env,
        asset_id: u32,
        new_valuation: i128,
        new_metadata_uri: String,
    ) {
        let tokenizer: Address = env.storage().instance().get(&DataKey::Tokenizer).expect("not initialized");
        tokenizer.require_auth();

        if new_valuation <= 0 {
            panic!("invalid valuation");
        }

        let mut record: AssetRecord = env.storage().persistent().get(&DataKey::Asset(asset_id)).expect("not found");

        if record.state != AssetState::Closed {
            panic!("must be Closed to relist as whole");
        }
        if record.model != OwnershipModel::WholeOwnership {
            panic!("model mismatch: must be WholeOwnership");
        }

        record.state = AssetState::Active;
        record.valuation = new_valuation;
        record.metadata_uri = new_metadata_uri;

        env.storage().persistent().set(&DataKey::Asset(asset_id), &record);
        env.events().publish(
            (symbol_short!("rl_whole"), asset_id, record.asset_owner),
            new_valuation,
        );
    }


    pub fn relist_asset_as_fractional(
        env: Env,
        asset_id: u32,
        new_valuation: i128,
        new_metadata_uri: String,
    ) {
        let tokenizer: Address = env.storage().instance().get(&DataKey::Tokenizer).expect("not initialized");
        tokenizer.require_auth();

        if new_valuation <= 0 {
            panic!("invalid valuation");
        }

        let mut record: AssetRecord = env.storage().persistent().get(&DataKey::Asset(asset_id)).expect("not found");

        if record.state != AssetState::Closed {
            panic!("must be Closed");
        }
        if record.model != OwnershipModel::WholeOwnership {
            panic!("must be WholeOwnership to convert to Fractional");
        }

        record.state = AssetState::Relisted;
        record.model = OwnershipModel::Fractional;
        record.valuation = new_valuation;
        record.metadata_uri = new_metadata_uri;
        record.sold_shares = 0;
        record.total_shares = 0;
        record.price_per_share = 0;
        record.tokenized_at = 0;
        record.relist_count += 1;
        record.relisted_at = env.ledger().timestamp();

        env.storage().persistent().set(&DataKey::Asset(asset_id), &record);
        env.events().publish(
            (symbol_short!("rl_frac"), asset_id, record.asset_owner),
            (new_valuation, record.relist_count),
        );
    }


    pub fn get_asset(env: Env, asset_id: u32) -> AssetRecord {
        env.storage().persistent().get(&DataKey::Asset(asset_id)).expect("not found")
    }

    pub fn get_assets_by_owner(env: Env, owner: Address) -> Vec<u32> {
        env.storage().persistent().get(&DataKey::OwnerAssets(owner)).unwrap_or(Vec::new(&env))
    }

    pub fn get_asset_state(env: Env, asset_id: u32) -> AssetState {
        let record: AssetRecord = env.storage().persistent().get(&DataKey::Asset(asset_id)).expect("not found");
        record.state
    }

    pub fn get_relist_count(env: Env, asset_id: u32) -> u32 {
        let record: AssetRecord = env.storage().persistent().get(&DataKey::Asset(asset_id)).expect("not found");
        record.relist_count
    }

    pub fn get_funding_progress(env: Env, asset_id: u32) -> (i128, i128) {
        let record: AssetRecord = env.storage().persistent().get(&DataKey::Asset(asset_id)).expect("not found");
        (record.sold_shares, record.total_shares)
    }

    pub fn total_assets(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::AssetCounter).unwrap_or(1) - 1
    }
}


#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::{Address as _};

    fn setup_registry(env: &Env) -> (VaulticAssetRegistryClient, Address, Address) {
        let admin = Address::generate(env);
        let tokenizer = Address::generate(env);
        let contract_id = env.register_contract(None, VaulticAssetRegistry);
        let client = VaulticAssetRegistryClient::new(env, &contract_id);
        client.initialize(&admin, &tokenizer);
        (client, admin, tokenizer)
    }

    #[test]
    fn test_initialize() {
        let env = Env::default();
        let (client, _, _) = setup_registry(&env);
        assert_eq!(client.total_assets(), 0);
    }

    #[test]
    #[should_panic(expected = "already initialized")]
    fn test_double_initialize() {
        let env = Env::default();
        let (client, admin, tokenizer) = setup_registry(&env);
        client.initialize(&admin, &tokenizer);
    }

    #[test]
    fn test_full_lifecycle_fractional() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, _, tokenizer) = setup_registry(&env);
        let owner = Address::generate(&env);
        let issuer = Address::generate(&env);

        let asset_id = client.register_asset(
            &owner,
            &String::from_str(&env, "Gold Mine Shares"),
            &String::from_str(&env, "Mining"),
            &String::from_str(&env, "VTGOLD"),
            &String::from_str(&env, "ipfs://QmXyz"),
            &1_000_000i128,
            &OwnershipModel::Fractional,
        );
        assert_eq!(asset_id, 1);
        assert!(matches!(client.get_asset(&asset_id).state, AssetState::Pending));

        client.approve_asset(&asset_id);
        assert!(matches!(client.get_asset(&asset_id).state, AssetState::Active));

        client.record_tokenization(&asset_id, &issuer, &10_000i128, &100i128);
        let record = client.get_asset(&asset_id);
        assert!(matches!(record.state, AssetState::Tokenized));
        assert_eq!(record.issuer.unwrap(), issuer);
        assert_eq!(record.total_shares, 10_000i128);

        client.record_shares_sold(&asset_id, &500i128);
        let (sold, total) = client.get_funding_progress(&asset_id);
        assert_eq!(sold, 500i128);
        assert_eq!(total, 10_000i128);

        client.close_asset(&asset_id, &tokenizer);
        assert!(matches!(client.get_asset(&asset_id).state, AssetState::Closed));

        client.relist_asset(
            &asset_id,
            &1_200_000i128,
            &String::from_str(&env, "ipfs://QmNewMeta"),
        );
        let relisted = client.get_asset(&asset_id);
        assert!(matches!(relisted.state, AssetState::Relisted));
        assert_eq!(relisted.relist_count, 1);
        assert_eq!(relisted.sold_shares, 0);
    }

    #[test]
    fn test_transfer_ownership() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, _, _) = setup_registry(&env);
        let owner = Address::generate(&env);
        let new_owner = Address::generate(&env);

        let asset_id = client.register_asset(
            &owner,
            &String::from_str(&env, "Plot A"),
            &String::from_str(&env, "Real Estate"),
            &String::from_str(&env, "VTPLT"),
            &String::from_str(&env, "ipfs://Qm123"),
            &500_000i128,
            &OwnershipModel::WholeOwnership,
        );

        client.transfer_asset_ownership(&asset_id, &new_owner);
        let record = client.get_asset(&asset_id);
        assert_eq!(record.asset_owner, new_owner);
    }
}
