#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, token, Address, Env, Vec, symbol_short,
};

// ---------------------------------------------------------------------------
// Cross-contract interfaces
// ---------------------------------------------------------------------------
mod investment_manager {
    soroban_sdk::contractimport!(
        file = "../../target/wasm32-unknown-unknown/release/vaultic_investment_manager.wasm"
    );
}

mod user_registry {
    soroban_sdk::contractimport!(
        file = "../../target/wasm32-unknown-unknown/release/vaultic_user_registry.wasm"
    );
}

// ---------------------------------------------------------------------------
// Data Structures
// ---------------------------------------------------------------------------

#[contracttype]
#[derive(Clone, Debug)]
pub struct YieldRound {
    pub asset_id: u32,
    pub total_yield: i128,
    pub total_shares_snapshot: i128,
    pub deposited_at: u64,
    pub round_index: u32,
}

// ---------------------------------------------------------------------------
// Storage Keys
// ---------------------------------------------------------------------------

#[contracttype]
pub enum DataKey {
    Admins,
    InvestmentManager,
    UserRegistry,
    PaymentToken,
    YieldRoundCount(u32),
    YieldRound(u32, u32),
    Claimed(u32, u32, Address),
}

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

#[contract]
pub struct VaulticDividendManager;

#[contractimpl]
impl VaulticDividendManager {
    
    pub fn initialize(
        env: Env,
        admins: Vec<Address>,
        investment_manager: Address,
        user_registry: Address,
        payment_token: Address,
    ) {
        if env.storage().instance().has(&DataKey::Admins) {
            panic!("already initialized");
        }
        if admins.is_empty() {
            panic!("at least one admin required");
        }
        env.storage().instance().set(&DataKey::Admins, &admins);
        env.storage().instance().set(&DataKey::InvestmentManager, &investment_manager);
        env.storage().instance().set(&DataKey::UserRegistry, &user_registry);
        env.storage().instance().set(&DataKey::PaymentToken, &payment_token);
    }

    pub fn deposit_yield(
        env: Env,
        caller: Address,
        asset_id: u32,
        amount: i128,
        total_shares_outstanding: i128,
    ) {
        caller.require_auth();

        if amount <= 0 { panic!("invalid yield amount"); }
        if total_shares_outstanding <= 0 { panic!("no shares outstanding"); }

        let payment_addr: Address = env.storage().instance().get(&DataKey::PaymentToken).unwrap();
        let payment_client = token::Client::new(&env, &payment_addr);
        payment_client.transfer(&caller, &env.current_contract_address(), &amount);

        let round_count: u32 = env.storage().persistent().get(&DataKey::YieldRoundCount(asset_id)).unwrap_or(0);
        let yield_round = YieldRound {
            asset_id,
            total_yield: amount,
            total_shares_snapshot: total_shares_outstanding,
            deposited_at: env.ledger().timestamp(),
            round_index: round_count,
        };

        env.storage().persistent().set(&DataKey::YieldRound(asset_id, round_count), &yield_round);
        env.storage().persistent().set(&DataKey::YieldRoundCount(asset_id), &(round_count + 1));

        env.events().publish((symbol_short!("yld_dep"), asset_id, caller), amount);
    }

    pub fn claim_yield(env: Env, investor: Address, asset_id: u32, round_index: u32) {
        investor.require_auth();

        // KYC Gating
        let ur_addr: Address = env.storage().instance().get(&DataKey::UserRegistry).unwrap();
        let ur_client = user_registry::Client::new(&env, &ur_addr);
        if !ur_client.is_verified(&investor) {
            panic!("investor not KYC verified");
        }

        let claimed: bool = env.storage().persistent().get(&DataKey::Claimed(asset_id, round_index, investor.clone())).unwrap_or(false);
        if claimed { panic!("already claimed"); }

        let yield_round: YieldRound = env.storage().persistent().get(&DataKey::YieldRound(asset_id, round_index)).expect("yield round not found");

        let im_addr: Address = env.storage().instance().get(&DataKey::InvestmentManager).unwrap();
        let im_client = investment_manager::Client::new(&env, &im_addr);
        let investor_shares = im_client.get_investor_holdings(&asset_id, &investor);

        if investor_shares <= 0 { panic!("no shares held"); }

        let investor_yield = (investor_shares * yield_round.total_yield) / yield_round.total_shares_snapshot;
        if investor_yield <= 0 { panic!("yield too small"); }

        env.storage().persistent().set(&DataKey::Claimed(asset_id, round_index, investor.clone()), &true);

        let payment_addr: Address = env.storage().instance().get(&DataKey::PaymentToken).unwrap();
        let payment_client = token::Client::new(&env, &payment_addr);
        payment_client.transfer(&env.current_contract_address(), &investor, &investor_yield);

        env.events().publish((symbol_short!("yld_clm"), asset_id, investor), investor_yield);
    }

    pub fn claim_all_yield(env: Env, investor: Address, asset_id: u32) -> i128 {
        investor.require_auth();

        // KYC Gating
        let ur_addr: Address = env.storage().instance().get(&DataKey::UserRegistry).unwrap();
        let ur_client = user_registry::Client::new(&env, &ur_addr);
        if !ur_client.is_verified(&investor) {
            panic!("investor not KYC verified");
        }

        let round_count: u32 = env.storage().persistent().get(&DataKey::YieldRoundCount(asset_id)).unwrap_or(0);
        if round_count == 0 { return 0; }

        let im_addr: Address = env.storage().instance().get(&DataKey::InvestmentManager).unwrap();
        let im_client = investment_manager::Client::new(&env, &im_addr);
        let investor_shares = im_client.get_investor_holdings(&asset_id, &investor);
        if investor_shares <= 0 { panic!("no shares held"); }

        let payment_addr: Address = env.storage().instance().get(&DataKey::PaymentToken).unwrap();
        let payment_client = token::Client::new(&env, &payment_addr);

        let mut total_claimed: i128 = 0;
        for i in 0..round_count {
            let claimed: bool = env.storage().persistent().get(&DataKey::Claimed(asset_id, i, investor.clone())).unwrap_or(false);
            if claimed { continue; }

            let yield_round: YieldRound = env.storage().persistent().get(&DataKey::YieldRound(asset_id, i)).unwrap();
            let investor_yield = (investor_shares * yield_round.total_yield) / yield_round.total_shares_snapshot;
            
            if investor_yield > 0 {
                env.storage().persistent().set(&DataKey::Claimed(asset_id, i, investor.clone()), &true);
                payment_client.transfer(&env.current_contract_address(), &investor, &investor_yield);
                total_claimed += investor_yield;
            }
        }
        env.events().publish((symbol_short!("yld_all"), asset_id, investor), total_claimed);
        total_claimed
    }

    pub fn get_yield_round_count(env: Env, asset_id: u32) -> u32 {
        env.storage().persistent().get(&DataKey::YieldRoundCount(asset_id)).unwrap_or(0)
    }

    pub fn get_claimable_yield(env: Env, asset_id: u32, investor: Address) -> i128 {
        let round_count: u32 = env.storage().persistent().get(&DataKey::YieldRoundCount(asset_id)).unwrap_or(0);
        let im_addr: Address = env.storage().instance().get(&DataKey::InvestmentManager).unwrap();
        let im_client = investment_manager::Client::new(&env, &im_addr);
        let investor_shares = im_client.get_investor_holdings(&asset_id, &investor);
        if investor_shares <= 0 { return 0; }

        let mut total: i128 = 0;
        for i in 0..round_count {
            let claimed: bool = env.storage().persistent().get(&DataKey::Claimed(asset_id, i, investor.clone())).unwrap_or(false);
            if !claimed {
                let round: YieldRound = env.storage().persistent().get(&DataKey::YieldRound(asset_id, i)).unwrap();
                total += (investor_shares * round.total_yield) / round.total_shares_snapshot;
            }
        }
        total
    }

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

    pub fn get_admins(env: Env) -> Vec<Address> {
        env.storage().instance().get(&DataKey::Admins).expect("not initialized")
    }
}
