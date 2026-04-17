#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Symbol, Vec, symbol_short};

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum AssetState {
    Pending = 0,
    Active = 1,
    Tokenized = 2,
    Closed = 3,
    Relisted = 4,
}

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum OwnershipModel {
    WholeOwnership = 0,
    Fractional = 1,
}

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
    pub asset_code: String,       // NEW: Stellar Native Asset Code (e.g. VTGOLD)
    pub issuer: Option<Address>,  // NEW: Stellar Native Asset Issuer
    pub tokenized_at: u64,
    pub relist_count: u32,
    pub relisted_at: u64,
    pub asset_name: String,
    pub asset_category: String,
    pub metadata_uri: String,
}

#[contracttype]
pub enum DataKey {
    Admin,           // Address
    Tokenizer,       // Address
    AssetCounter,    // u32
    Asset(u32),      // AssetRecord
    OwnerAssets(Address), // Vec<u32>
}

#[contract]
pub struct VaulticAssetRegistry;

#[contractimpl]
impl VaulticAssetRegistry {
    /// Initializes the registry.
    pub fn initialize(env: Env, admin: Address, tokenizer: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Tokenizer, &tokenizer);
        env.storage().instance().set(&DataKey::AssetCounter, &1u32);
    }

    /// Update the tokenizer address.
    pub fn set_tokenizer(env: Env, new_tokenizer: Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).expect("not initialized");
        admin.require_auth();
        env.storage().instance().set(&DataKey::Tokenizer, &new_tokenizer);
    }

    /// Registers a new real-world asset.
    pub fn register_asset(
        env: Env,
        asset_owner: Address,
        asset_name: String,
        asset_category: String,
        asset_code: String, // NEW: Required at registration for native assets
        metadata_uri: String,
        valuation: i128,
        model: OwnershipModel,
    ) -> u32 {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).expect("not initialized");
        admin.require_auth();

        if valuation <= 0 {
            panic!("invalid valuation");
        }

        let mut counter: u32 = env.storage().instance().get(&DataKey::AssetCounter).unwrap();
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
            total_shares: 0,
            price_per_share: 0,
            sold_shares: 0,
            asset_code,
            issuer: None,
            tokenized_at: 0,
            relist_count: 0,
            relisted_at: 0,
            asset_name,
            asset_category,
            metadata_uri,
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

    /// Approves an asset (Pending -> Active).
    pub fn approve_asset(env: Env, asset_id: u32) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).expect("not initialized");
        admin.require_auth();

        let mut record: AssetRecord = env.storage().persistent().get(&DataKey::Asset(asset_id)).expect("not found");
        
        if record.state != AssetState::Pending {
            panic!("invalid transition");
        }

        record.state = AssetState.Active;
        env.storage().persistent().set(&DataKey::Asset(asset_id), &record);

        env.events().publish((symbol_short!("aprv_ast"), asset_id), admin);
    }

    /// Records tokenization details for NATIVE ASSETS (Tokenizer only).
    pub fn record_tokenization(
        env: Env,
        asset_id: u32,
        issuer: Address, // Stellar Native Issuer address
        total_shares: i128,
        price_per_share: i128,
    ) {
        let tokenizer: Address = env.storage().instance().get(&DataKey::Tokenizer).expect("not initialized");
        tokenizer.require_auth();

        let mut record: AssetRecord = env.storage().persistent().get(&DataKey::Asset(asset_id)).expect("not found");

        if record.model != OwnershipModel::Fractional {
            panic!("model mismatch");
        }
        if record.state != AssetState::Active && record.state != AssetState::Relisted {
            panic!("invalid state");
        }
        if total_shares <= 0 || price_per_share <= 0 {
            panic!("invalid inputs");
        }

        record.state = AssetState::Tokenized;
        record.issuer = Some(issuer.clone());
        record.total_shares = total_shares;
        record.price_per_share = price_per_share;
        record.tokenized_at = env.ledger().timestamp();

        env.storage().persistent().set(&DataKey::Asset(asset_id), &record);

        env.events().publish(
            (symbol_short!("tok_ast"), asset_id, issuer, record.asset_code),
            (total_shares, price_per_share),
        );
    }

    /// --- Rest of functions remain the same logic but use AssetRecord ---
    
    pub fn record_shares_sold(env: Env, asset_id: u32, shares_delta: i128) {
        let tokenizer: Address = env.storage().instance().get(&DataKey::Tokenizer).expect("not initialized");
        tokenizer.require_auth();

        let mut record: AssetRecord = env.storage().persistent().get(&DataKey::Asset(asset_id)).expect("not found");
        record.sold_shares += shares_delta;

        env.storage().persistent().set(&DataKey::Asset(asset_id), &record);
        env.events().publish((symbol_short!("sold_upd"), asset_id), record.sold_shares);
    }

    pub fn close_asset(env: Env, asset_id: u32, caller: Address) {
        caller.require_auth();
        let admin: Address = env.storage().instance().get(&DataKey::Admin).expect("not initialized");
        let tokenizer: Address = env.storage().instance().get(&DataKey::Tokenizer).expect("not initialized");

        if caller != admin && caller != tokenizer { panic!("unauthorized"); }

        let mut record: AssetRecord = env.storage().persistent().get(&DataKey::Asset(asset_id)).expect("not found");

        if record.state == AssetState::Pending || record.state == AssetState::Closed {
            panic!("invalid transition");
        }

        record.state = AssetState.Closed;
        env.storage().persistent().set(&DataKey::Asset(asset_id), &record);
    }

    pub fn get_asset(env: Env, asset_id: u32) -> AssetRecord {
        env.storage().persistent().get(&DataKey::Asset(asset_id)).expect("not found")
    }

    pub fn get_assets_by_owner(env: Env, owner: Address) -> Vec<u32> {
        env.storage().persistent().get(&DataKey::OwnerAssets(owner)).unwrap_or(Vec::new(&env))
    }

    pub fn total_assets(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::AssetCounter).unwrap_or(1) - 1
    }
}
