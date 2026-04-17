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
    pub token_contract: Option<Address>,
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
            token_contract: None,
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

    /// Records tokenization details (Tokenizer only).
    pub fn record_tokenization(
        env: Env,
        asset_id: u32,
        token_contract: Address,
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
        record.token_contract = Some(token_contract.clone());
        record.total_shares = total_shares;
        record.price_per_share = price_per_share;
        record.tokenized_at = env.ledger().timestamp();

        env.storage().persistent().set(&DataKey::Asset(asset_id), &record);

        env.events().publish(
            (symbol_short!("tok_ast"), asset_id, token_contract),
            (total_shares, price_per_share),
        );
    }

    /// Increments the sold shares counter (Tokenizer only).
    pub fn record_shares_sold(env: Env, asset_id: u32, shares_delta: i128) {
        let tokenizer: Address = env.storage().instance().get(&DataKey::Tokenizer).expect("not initialized");
        tokenizer.require_auth();

        if shares_delta <= 0 {
            panic!("invalid delta");
        }

        let mut record: AssetRecord = env.storage().persistent().get(&DataKey::Asset(asset_id)).expect("not found");
        record.sold_shares += shares_delta;

        env.storage().persistent().set(&DataKey::Asset(asset_id), &record);
        env.events().publish(
            (symbol_short!("sold_upd"), asset_id),
            record.sold_shares,
        );
    }

    /// Closes an asset (Admin or Tokenizer only).
    pub fn close_asset(env: Env, asset_id: u32, caller: Address) {
        caller.require_auth();
        let admin: Address = env.storage().instance().get(&DataKey::Admin).expect("not initialized");
        let tokenizer: Address = env.storage().instance().get(&DataKey::Tokenizer).expect("not initialized");

        if caller != admin && caller != tokenizer {
            panic!("unauthorized");
        }

        let mut record: AssetRecord = env.storage().persistent().get(&DataKey::Asset(asset_id)).expect("not found");

        if record.state == AssetState::Pending || record.state == AssetState::Closed {
            panic!("invalid transition");
        }

        record.state = AssetState.Closed;
        env.storage().persistent().set(&DataKey::Asset(asset_id), &record);

        env.events().publish((symbol_short!("cls_ast"), asset_id), caller);
    }

    /// Transfers asset ownership (Tokenizer only).
    pub fn transfer_asset_ownership(env: Env, asset_id: u32, new_owner: Address) {
        let tokenizer: Address = env.storage().instance().get(&DataKey::Tokenizer).expect("not initialized");
        tokenizer.require_auth();

        let mut record: AssetRecord = env.storage().persistent().get(&DataKey::Asset(asset_id)).expect("not found");
        let prev_owner = record.asset_owner;

        if prev_owner == new_owner {
            return;
        }

        // Update Registry
        record.asset_owner = new_owner.clone();
        env.storage().persistent().set(&DataKey::Asset(asset_id), &record);

        // Update Owner Asset Lists
        let mut prev_list: Vec<u32> = env.storage().persistent().get(&DataKey::OwnerAssets(prev_owner.clone())).unwrap();
        let mut new_list: Vec<u32> = env.storage().persistent().get(&DataKey::OwnerAssets(new_owner.clone())).unwrap_or(Vec::new(&env));

        let mut index = None;
        for i in 0..prev_list.len() {
            if prev_list.get(i).unwrap() == asset_id {
                index = Some(i);
                break;
            }
        }
        if let Some(i) = index {
            prev_list.remove(i);
        }
        new_list.push_back(asset_id);

        env.storage().persistent().set(&DataKey::OwnerAssets(prev_owner.clone()), &prev_list);
        env.storage().persistent().set(&DataKey::OwnerAssets(new_owner.clone()), &new_list);

        env.events().publish((symbol_short!("own_trsf"), asset_id), (prev_owner, new_owner));
    }

    /// Relists a closed fractional asset.
    pub fn relist_asset(env: Env, asset_id: u32, new_valuation: i128, new_metadata_uri: String) {
        let tokenizer: Address = env.storage().instance().get(&DataKey::Tokenizer).expect("not initialized");
        tokenizer.require_auth();

        let mut record: AssetRecord = env.storage().persistent().get(&DataKey::Asset(asset_id)).expect("not found");

        if record.state != AssetState::Closed {
            panic!("not closed");
        }
        if record.model != OwnershipModel::Fractional {
            panic!("model mismatch");
        }

        record.state = AssetState.Relisted;
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
            (symbol_short!("rel_ast"), asset_id),
            (record.asset_owner.clone(), new_valuation, record.relist_count),
        );
    }

    /// Relists a whole asset back to active.
    pub fn relist_whole_asset(env: Env, asset_id: u32, new_valuation: i128, new_metadata_uri: String) {
        let tokenizer: Address = env.storage().instance().get(&DataKey::Tokenizer).expect("not initialized");
        tokenizer.require_auth();

        let mut record: AssetRecord = env.storage().persistent().get(&DataKey::Asset(asset_id)).expect("not found");

        if record.state != AssetState::Closed {
            panic!("not closed");
        }
        if record.model != OwnershipModel::WholeOwnership {
            panic!("model mismatch");
        }

        record.state = AssetState.Active;
        record.valuation = new_valuation;
        record.metadata_uri = new_metadata_uri;

        env.storage().persistent().set(&DataKey::Asset(asset_id), &record);
        env.events().publish((symbol_short!("rel_whl"), asset_id), new_valuation);
    }

    /// Getters
    
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

    pub fn total_assets(env: Env) -> u32 {
        let counter: u32 = env.storage().instance().get(&DataKey::AssetCounter).unwrap();
        counter - 1
    }
}
