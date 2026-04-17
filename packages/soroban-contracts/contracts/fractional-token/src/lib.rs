#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Symbol, Vec, symbol_short};

#[contracttype]
pub enum DataKey {
    Admin,           // Address
    Minter,          // Address
    AssetId,         // u32
    AssetName,       // String
    Balance(Address), // i128
    TotalSupply,     // i128
}

#[contract]
pub struct VaulticFractionalToken;

#[contractimpl]
impl VaulticFractionalToken {
    /// Initializes the token for a specific RWA. 
    /// Mints full supply to initial_holder (InvestmentManager).
    pub fn initialize(
        env: Env,
        admin: Address,
        minter: Address,
        asset_id: u32,
        asset_name: String,
        total_supply: i128,
        initial_holder: Address,
    ) {
        if env.storage().instance().has(&DataKey::AssetId) {
            panic!("already initialized");
        }
        if total_supply <= 0 {
            panic!("invalid supply");
        }

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Minter, &minter);
        env.storage().instance().set(&DataKey::AssetId, &asset_id);
        env.storage().instance().set(&DataKey::AssetName, &asset_name);
        env.storage().instance().set(&DataKey::TotalSupply, &total_supply);

        // Mint initial supply
        env.storage().persistent().set(&DataKey::Balance(initial_holder.clone()), &total_supply);

        env.events().publish(
            (symbol_short!("mint"), asset_id, initial_holder),
            total_supply,
        );
    }

    /// Dispatches shares from the minter's balance to an investor.
    pub fn dispatch_shares(env: Env, investor: Address, amount: i128) {
        let minter: Address = env.storage().instance().get(&DataKey::Minter).unwrap();
        minter.require_auth();

        if amount <= 0 {
            panic!("invalid amount");
        }

        let mut minter_balance: i128 = env.storage().persistent().get(&DataKey::Balance(minter.clone())).unwrap_or(0);
        if minter_balance < amount {
            panic!("insufficient balance");
        }

        let mut investor_balance: i128 = env.storage().persistent().get(&DataKey::Balance(investor.clone())).unwrap_or(0);

        minter_balance -= amount;
        investor_balance += amount;

        env.storage().persistent().set(&DataKey::Balance(minter.clone()), &minter_balance);
        env.storage().persistent().set(&DataKey::Balance(investor.clone()), &investor_balance);

        env.events().publish(
            (symbol_short!("dispatch"), investor),
            amount,
        );
    }

    /// Reclaims all shares from the given holders back to the minter.
    pub fn reclaim_shares(env: Env, holders: Vec<Address>) -> i128 {
        let minter: Address = env.storage().instance().get(&DataKey::Minter).unwrap();
        minter.require_auth();

        let mut total_reclaimed: i128 = 0;
        let mut minter_balance: i128 = env.storage().persistent().get(&DataKey::Balance(minter.clone())).unwrap_or(0);

        for holder in holders.iter() {
            let balance: i128 = env.storage().persistent().get(&DataKey::Balance(holder.clone())).unwrap_or(0);
            if balance > 0 {
                env.storage().persistent().set(&DataKey::Balance(holder.clone()), &0i128);
                minter_balance += balance;
                total_reclaimed += balance;
            }
        }

        env.storage().persistent().set(&DataKey::Balance(minter), &minter_balance);
        
        env.events().publish(symbol_short!("reclaim"), total_reclaimed);
        total_reclaimed
    }

    /// Change the authorized minter.
    pub fn set_minter(env: Env, new_minter: Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        env.storage().instance().set(&DataKey::Minter, &new_minter);
    }

    // --- Standard Token View Functions (Subset for Parity) ---

    pub fn balance_of(env: Env, owner: Address) -> i128 {
        env.storage().persistent().get(&DataKey::Balance(owner)).unwrap_or(0)
    }

    pub fn total_supply(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::TotalSupply).unwrap_or(0)
    }

    pub fn decimals(_env: Env) -> u32 {
        0 // Whole shares only as per Solidity original
    }

    pub fn name(env: Env) -> String {
        env.storage().instance().get(&DataKey::AssetName).unwrap()
    }
}
