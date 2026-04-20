#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Vec, symbol_short};


#[contracttype]
pub enum DataKey {
    Admins,
    Minter,
    AssetId,
    AssetName,
    Balance(Address),
    TotalSupply,
    IsFrozen(Address),
}

#[contract]
pub struct VaulticFractionalToken;

#[contractimpl]
impl VaulticFractionalToken {
    /* @notice Initializes the record token for a specific RWA asset.
     * @param env The Soroban environment.
     * @param admins A vector of administrative addresses.
     * @param minter The address of the minter (InvestmentManager).
     * @param asset_id The ID of the asset.
     * @param asset_name The name of the asset.
     * @param total_supply The total supply of shares.
     * @param initial_holder The address initially holding all shares.
     */
    pub fn initialize(
        env: Env,
        admins: Vec<Address>,
        minter: Address,
        asset_id: u32,
        asset_name: String,
        total_supply: i128,
        initial_holder: Address,
    ) {
        if env.storage().instance().has(&DataKey::AssetId) {
            panic!("already initialized");
        }
        if admins.is_empty() {
            panic!("at least one admin required");
        }
        if total_supply <= 0 {
            panic!("invalid supply");
        }

        env.storage().instance().set(&DataKey::Admins, &admins);
        env.storage().instance().set(&DataKey::Minter, &minter);
        env.storage().instance().set(&DataKey::AssetId, &asset_id);
        env.storage().instance().set(&DataKey::AssetName, &asset_name);
        env.storage().instance().set(&DataKey::TotalSupply, &total_supply);

        env.storage().persistent().set(&DataKey::Balance(initial_holder.clone()), &total_supply);

        env.events().publish(
            (symbol_short!("mint"), asset_id, initial_holder),
            total_supply,
        );
    }

    /* @notice Records transfer of shares from minter to investor. */
    pub fn dispatch_shares(env: Env, investor: Address, amount: i128) {
        let minter: Address = env.storage().instance().get(&DataKey::Minter).unwrap();
        minter.require_auth();

        if amount <= 0 {
            panic!("invalid amount");
        }

        let mut minter_balance: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::Balance(minter.clone()))
            .unwrap_or(0);

        if minter_balance < amount {
            panic!("insufficient minter balance");
        }

        let mut investor_balance: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::Balance(investor.clone()))
            .unwrap_or(0);

        minter_balance -= amount;
        investor_balance += amount;

        env.storage().persistent().set(&DataKey::Balance(minter.clone()), &minter_balance);
        env.storage().persistent().set(&DataKey::Balance(investor.clone()), &investor_balance);

        env.events().publish((symbol_short!("dispatch"), investor), amount);
    }

    /* @notice Reclaims all shares from holders back to the minter. */
    pub fn reclaim_shares(env: Env, holders: Vec<Address>) -> i128 {
        let minter: Address = env.storage().instance().get(&DataKey::Minter).unwrap();
        minter.require_auth();

        let mut total_reclaimed: i128 = 0;
        let mut minter_balance: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::Balance(minter.clone()))
            .unwrap_or(0);

        for holder in holders.iter() {
            let balance: i128 = env
                .storage()
                .persistent()
                .get(&DataKey::Balance(holder.clone()))
                .unwrap_or(0);
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

    pub fn freeze_account(env: Env, caller: Address, account: Address) {
        caller.require_auth();
        let admins: Vec<Address> = env.storage().instance().get(&DataKey::Admins).unwrap();
        if !admins.contains(&caller) {
            panic!("not an admin");
        }
        env.storage().persistent().set(&DataKey::IsFrozen(account), &true);
    }

    pub fn unfreeze_account(env: Env, caller: Address, account: Address) {
        caller.require_auth();
        let admins: Vec<Address> = env.storage().instance().get(&DataKey::Admins).unwrap();
        if !admins.contains(&caller) {
            panic!("not an admin");
        }
        env.storage().persistent().set(&DataKey::IsFrozen(account), &false);
    }

    pub fn set_admins(env: Env, caller: Address, new_admins: Vec<Address>) {
        caller.require_auth();
        let admins: Vec<Address> = env.storage().instance().get(&DataKey::Admins).unwrap();
        if !admins.contains(&caller) {
            panic!("not an admin");
        }
        if new_admins.is_empty() {
            panic!("at least one admin required");
        }
        env.storage().instance().set(&DataKey::Admins, &new_admins);
    }

    pub fn get_admins(env: Env) -> Vec<Address> {
        env.storage().instance().get(&DataKey::Admins).unwrap()
    }


    pub fn balance_of(env: Env, owner: Address) -> i128 {
        env.storage().persistent().get(&DataKey::Balance(owner)).unwrap_or(0)
    }

    pub fn total_supply(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::TotalSupply).unwrap_or(0)
    }

    pub fn decimals(_env: Env) -> u32 {
        0
    }

    pub fn name(env: Env) -> String {
        env.storage().instance().get(&DataKey::AssetName).unwrap()
    }
}
