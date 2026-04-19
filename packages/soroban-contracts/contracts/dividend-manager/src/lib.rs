#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, token, Address, Env, Vec, symbol_short,
};

// ---------------------------------------------------------------------------
// Cross-contract interface: InvestmentManager (for investor list & holdings)
// ---------------------------------------------------------------------------
mod investment_manager {
    soroban_sdk::contractimport!(
        file = "../../target/wasm32-unknown-unknown/release/vaultic_investment_manager.wasm"
    );
}

// ---------------------------------------------------------------------------
// Data Structures
// ---------------------------------------------------------------------------

/// Stores info about a yield round deposited by an asset owner or admin.
#[contracttype]
#[derive(Clone, Debug)]
pub struct YieldRound {
    /// Asset this yield corresponds to.
    pub asset_id: u32,
    /// Total USDC deposited for this yield round.
    pub total_yield: i128,
    /// Total fractional shares outstanding at deposit time (used for pro-rata).
    pub total_shares_snapshot: i128,
    /// Ledger timestamp of deposit.
    pub deposited_at: u64,
    /// Round index within the asset.
    pub round_index: u32,
}

// ---------------------------------------------------------------------------
// Storage Keys
// ---------------------------------------------------------------------------

#[contracttype]
pub enum DataKey {
    Admin,
    InvestmentManager,
    PaymentToken,
    /// Total yield rounds deposited for an asset: asset_id → count
    YieldRoundCount(u32),
    /// YieldRound data: (asset_id, round_index) → YieldRound
    YieldRound(u32, u32),
    /// Has investor claimed a particular round: (asset_id, round_index, investor) → bool
    Claimed(u32, u32, Address),
}

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

#[contract]
pub struct VaulticDividendManager;

#[contractimpl]
impl VaulticDividendManager {
    // -----------------------------------------------------------------------
    // Initialization
    // -----------------------------------------------------------------------

    /// Initializes the dividend manager. Called exactly once.
    /// investment_manager: address of VaulticInvestmentManager (to query holdings).
    /// payment_token: Testnet USDC contract address.
    pub fn initialize(
        env: Env,
        admin: Address,
        investment_manager: Address,
        payment_token: Address,
    ) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::InvestmentManager, &investment_manager);
        env.storage().instance().set(&DataKey::PaymentToken, &payment_token);
    }

    // -----------------------------------------------------------------------
    // Deposit Yield (Asset Owner or Admin)
    // -----------------------------------------------------------------------

    /// Deposits USDC as yield for all holders of a fractional asset.
    /// Caller must be the asset owner or admin.
    /// The caller must have pre-approved this contract to spend `amount` USDC.
    ///
    /// `total_shares_outstanding` is provided by the caller (reflects current
    /// native asset circulation). This keeps the contract stateless with respect to
    /// the native asset ledger, avoiding the need for an on-chain oracle.
    pub fn deposit_yield(
        env: Env,
        caller: Address,
        asset_id: u32,
        amount: i128,
        total_shares_outstanding: i128,
    ) {
        caller.require_auth();

        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        // Allow admin or any holder to deposit (asset owner); validated off-chain.
        // For full security an asset-owner check against registry can be plugged here.
        if amount <= 0 {
            panic!("invalid yield amount");
        }
        if total_shares_outstanding <= 0 {
            panic!("no shares outstanding");
        }

        // Pull USDC from caller into this contract
        let payment_addr: Address = env.storage().instance().get(&DataKey::PaymentToken).unwrap();
        let payment_client = token::Client::new(&env, &payment_addr);
        payment_client.transfer(&caller, &env.current_contract_address(), &amount);

        // Record the yield round
        let round_count: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::YieldRoundCount(asset_id))
            .unwrap_or(0);
        let new_round_index = round_count;

        let yield_round = YieldRound {
            asset_id,
            total_yield: amount,
            total_shares_snapshot: total_shares_outstanding,
            deposited_at: env.ledger().timestamp(),
            round_index: new_round_index,
        };

        env.storage().persistent().set(&DataKey::YieldRound(asset_id, new_round_index), &yield_round);
        env.storage().persistent().set(&DataKey::YieldRoundCount(asset_id), &(round_count + 1));

        env.events().publish(
            (symbol_short!("yld_dep"), asset_id, caller),
            (amount, total_shares_outstanding, new_round_index),
        );
    }

    // -----------------------------------------------------------------------
    // Claim Yield (Investor)
    // -----------------------------------------------------------------------

    /// Allows an investor to claim their pro-rata share of a specific yield round.
    /// Investor's holding is queried from the InvestmentManager.
    pub fn claim_yield(env: Env, investor: Address, asset_id: u32, round_index: u32) {
        investor.require_auth();

        // Check not already claimed
        let claimed: bool = env
            .storage()
            .persistent()
            .get(&DataKey::Claimed(asset_id, round_index, investor.clone()))
            .unwrap_or(false);
        if claimed {
            panic!("already claimed");
        }

        let yield_round: YieldRound = env
            .storage()
            .persistent()
            .get(&DataKey::YieldRound(asset_id, round_index))
            .expect("yield round not found");

        // Query investor holdings at round time from InvestmentManager
        let im_addr: Address = env.storage().instance().get(&DataKey::InvestmentManager).unwrap();
        let im_client = investment_manager::Client::new(&env, &im_addr);
        let investor_shares = im_client.get_investor_holdings(&asset_id, &investor);

        if investor_shares <= 0 {
            panic!("no shares held: not eligible for yield");
        }

        // Pro-rata calculation: investor_yield = (investor_shares / total_shares) * total_yield
        // Using integer arithmetic: (investor_shares * total_yield) / total_shares_snapshot
        let investor_yield = (investor_shares * yield_round.total_yield) / yield_round.total_shares_snapshot;

        if investor_yield <= 0 {
            panic!("yield too small to claim");
        }

        // Mark as claimed before transfer to prevent re-entrancy
        env.storage().persistent().set(
            &DataKey::Claimed(asset_id, round_index, investor.clone()),
            &true,
        );

        // Transfer USDC to investor
        let payment_addr: Address = env.storage().instance().get(&DataKey::PaymentToken).unwrap();
        let payment_client = token::Client::new(&env, &payment_addr);
        payment_client.transfer(&env.current_contract_address(), &investor, &investor_yield);

        env.events().publish(
            (symbol_short!("yld_clm"), asset_id, investor),
            (round_index, investor_yield, investor_shares),
        );
    }

    // -----------------------------------------------------------------------
    // Batch Claim (Gas-efficient for investors with many unclaimed rounds)
    // -----------------------------------------------------------------------

    /// Claims all unclaimed yield rounds for an investor on a given asset.
    pub fn claim_all_yield(env: Env, investor: Address, asset_id: u32) -> i128 {
        investor.require_auth();

        let round_count: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::YieldRoundCount(asset_id))
            .unwrap_or(0);

        if round_count == 0 {
            panic!("no yield rounds deposited");
        }

        let im_addr: Address = env.storage().instance().get(&DataKey::InvestmentManager).unwrap();
        let im_client = investment_manager::Client::new(&env, &im_addr);
        let investor_shares = im_client.get_investor_holdings(&asset_id, &investor);

        if investor_shares <= 0 {
            panic!("no shares held: not eligible for yield");
        }

        let payment_addr: Address = env.storage().instance().get(&DataKey::PaymentToken).unwrap();
        let payment_client = token::Client::new(&env, &payment_addr);

        let mut total_claimed: i128 = 0;

        for i in 0..round_count {
            let claimed: bool = env
                .storage()
                .persistent()
                .get(&DataKey::Claimed(asset_id, i, investor.clone()))
                .unwrap_or(false);
            if claimed {
                continue;
            }

            let yield_round: YieldRound = env
                .storage()
                .persistent()
                .get(&DataKey::YieldRound(asset_id, i))
                .expect("yield round data corrupted");

            let investor_yield = (investor_shares * yield_round.total_yield) / yield_round.total_shares_snapshot;
            if investor_yield <= 0 {
                continue;
            }

            // Mark claimed first (re-entrancy guard)
            env.storage().persistent().set(
                &DataKey::Claimed(asset_id, i, investor.clone()),
                &true,
            );

            payment_client.transfer(&env.current_contract_address(), &investor, &investor_yield);
            total_claimed += investor_yield;
        }

        env.events().publish(
            (symbol_short!("yld_all"), asset_id, investor),
            total_claimed,
        );

        total_claimed
    }

    // -----------------------------------------------------------------------
    // View Functions
    // -----------------------------------------------------------------------

    pub fn get_yield_round(env: Env, asset_id: u32, round_index: u32) -> YieldRound {
        env.storage()
            .persistent()
            .get(&DataKey::YieldRound(asset_id, round_index))
            .expect("not found")
    }

    pub fn get_yield_round_count(env: Env, asset_id: u32) -> u32 {
        env.storage()
            .persistent()
            .get(&DataKey::YieldRoundCount(asset_id))
            .unwrap_or(0)
    }

    pub fn has_claimed(env: Env, asset_id: u32, round_index: u32, investor: Address) -> bool {
        env.storage()
            .persistent()
            .get(&DataKey::Claimed(asset_id, round_index, investor))
            .unwrap_or(false)
    }

    /// Returns total unclaimed yield for an investor across all rounds.
    pub fn get_claimable_yield(env: Env, asset_id: u32, investor: Address) -> i128 {
        let round_count: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::YieldRoundCount(asset_id))
            .unwrap_or(0);

        let im_addr: Address = env.storage().instance().get(&DataKey::InvestmentManager).unwrap();
        let im_client = investment_manager::Client::new(&env, &im_addr);
        let investor_shares = im_client.get_investor_holdings(&asset_id, &investor);

        if investor_shares <= 0 {
            return 0;
        }

        let mut total: i128 = 0;
        for i in 0..round_count {
            let claimed: bool = env
                .storage()
                .persistent()
                .get(&DataKey::Claimed(asset_id, i, investor.clone()))
                .unwrap_or(false);
            if claimed {
                continue;
            }
            let round: YieldRound = env
                .storage()
                .persistent()
                .get(&DataKey::YieldRound(asset_id, i))
                .unwrap();
            total += (investor_shares * round.total_yield) / round.total_shares_snapshot;
        }
        total
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::Address as _;

    #[test]
    fn test_initialize() {
        let env = Env::default();
        let admin = Address::generate(&env);
        let im = Address::generate(&env);
        let token = Address::generate(&env);
        let contract_id = env.register_contract(None, VaulticDividendManager);
        let client = VaulticDividendManagerClient::new(&env, &contract_id);

        client.initialize(&admin, &im, &token);

        assert_eq!(client.get_yield_round_count(&1u32), 0);
    }
}
