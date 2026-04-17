#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Symbol, Vec, symbol_short};

// Cross-contract interfaces
mod registry {
    soroban_sdk::contractimport!(
        file = "../../target/wasm32-unknown-unknown/release/vaultic_asset_registry.wasm"
    );
}

mod token {
    soroban_sdk::contractimport!(
        file = "../../target/wasm32-unknown-unknown/release/vaultic_fractional_token.wasm"
    );
}

// Payment token interface (standard SEP-41 / Soroban Token)
mod payment {
    soroban_sdk::contractimport!(file = "../../lib/soroban_token_spec.wasm");
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct AssetInvestmentPool {
    pub total_shares: i128,
    pub sold_shares: i128,
    pub price_per_share: i128,
    pub investor_cap: i128,
    pub token_contract: Address,
    pub is_fully_subscribed: bool,
    pub proceeds_collected: i128,
    pub proceeds_withdrawn: i128,
}

#[contracttype]
pub enum DataKey {
    Admin,
    Registry,
    PaymentToken,
    TokenWasmHash,
    FeeTreasury,
    ProtocolFeeBps,
    AccumulatedFees,
    Pool(u32),
    InvestorHoldings(u32, Address),
    InvestorList(u32),
}

#[contract]
pub struct VaulticInvestmentManager;

const BPS_DENOMINATOR: i128 = 10_000;

#[contractimpl]
impl VaulticInvestmentManager {
    pub fn initialize(
        env: Env,
        admin: Address,
        registry: Address,
        payment_token: Address,
        token_wasm_hash: Symbol,
        fee_treasury: Address,
        protocol_fee_bps: i128,
    ) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Registry, &registry);
        env.storage().instance().set(&DataKey::PaymentToken, &payment_token);
        env.storage().instance().set(&DataKey::TokenWasmHash, &token_wasm_hash);
        env.storage().instance().set(&DataKey::FeeTreasury, &fee_treasury);
        env.storage().instance().set(&DataKey::ProtocolFeeBps, &protocol_fee_bps);
        env.storage().instance().set(&DataKey::AccumulatedFees, &0i128);
    }

    pub fn tokenize_asset(
        env: Env,
        asset_id: u32,
        total_shares: i128,
        price_per_share: i128,
        investor_cap: i128,
        token_addr: Address, // Simplified for 1:1 logic; real Soroban would deploy here
    ) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        let registry_addr: Address = env.storage().instance().get(&DataKey::Registry).unwrap();
        let registry_client = registry::Client::new(&env, &registry_addr);
        let asset = registry_client.get_asset(&asset_id);
        
        let token_client = token::Client::new(&env, &token_addr);
        token_client.initialize(
            &admin,
            &env.current_contract_address(),
            &asset_id,
            &asset.asset_name,
            &total_shares,
            &env.current_contract_address(),
        );

        let pool = AssetInvestmentPool {
            total_shares,
            sold_shares: 0,
            price_per_share,
            investor_cap,
            token_contract: token_addr.clone(),
            is_fully_subscribed: false,
            proceeds_collected: 0,
            proceeds_withdrawn: 0,
        };

        env.storage().persistent().set(&DataKey::Pool(asset_id), &pool);
        registry_client.record_tokenization(&asset_id, &token_addr, &total_shares, &price_per_share);

        env.events().publish((symbol_short!("tokenized"), asset_id), token_addr);
    }

    pub fn purchase_shares(env: Env, investor: Address, asset_id: u32, share_amount: i128) {
        investor.require_auth();

        let mut pool: AssetInvestmentPool = env.storage().persistent().get(&DataKey::Pool(asset_id)).expect("no pool");
        if pool.is_fully_subscribed {
            panic!("sold out");
        }

        let remaining = pool.total_shares - pool.sold_shares;
        if share_amount > remaining {
            panic!("insufficient shares");
        }

        if pool.investor_cap > 0 {
            let current_holding: i128 = env.storage().persistent().get(&DataKey::InvestorHoldings(asset_id, investor.clone())).unwrap_or(0);
            if current_holding + share_amount > pool.investor_cap {
                panic!("cap exceeded");
            }
        }

        let gross_cost = pool.price_per_share * share_amount;
        let fee_bps: i128 = env.storage().instance().get(&DataKey::ProtocolFeeBps).unwrap();
        let fee = (gross_cost * fee_bps) / BPS_DENOMINATOR;
        let net_cost = gross_cost - fee;

        pool.sold_shares += share_amount;
        pool.proceeds_collected += net_cost;
        if pool.sold_shares == pool.total_shares {
            pool.is_fully_subscribed = true;
        }
        
        // Fee Tracking
        let mut fees: i128 = env.storage().instance().get(&DataKey::AccumulatedFees).unwrap();
        fees += fee;
        env.storage().instance().set(&DataKey::AccumulatedFees, &fees);

        // Holdings
        let current_holding: i128 = env.storage().persistent().get(&DataKey::InvestorHoldings(asset_id, investor.clone())).unwrap_or(0);
        env.storage().persistent().set(&DataKey::InvestorHoldings(asset_id, investor.clone()), &(current_holding + share_amount));

        // Registry update
        let registry_addr: Address = env.storage().instance().get(&DataKey::Registry).unwrap();
        let registry_client = registry::Client::new(&env, &registry_addr);
        registry_client.record_shares_sold(&asset_id, &share_amount);

        // Payment Transfer
        let payment_addr: Address = env.storage().instance().get(&DataKey::PaymentToken).unwrap();
        let payment_client = payment::Client::new(&env, &payment_addr);
        payment_client.transfer(&investor, &env.current_contract_address(), &gross_cost);
        
        // Share Dispatch
        let token_client = token::Client::new(&env, &pool.token_contract);
        token_client.dispatch_shares(&investor, &share_amount);

        env.storage().persistent().set(&DataKey::Pool(asset_id), &pool);
        
        if pool.is_fully_subscribed {
            registry_client.close_asset(&asset_id, &env.current_contract_address());
        }

        env.events().publish((symbol_short!("buy_sh"), asset_id, investor), share_amount);
    }

    pub fn purchase_whole_asset(env: Env, buyer: Address, asset_id: u32) {
        buyer.require_auth();

        let registry_addr: Address = env.storage().instance().get(&DataKey::Registry).unwrap();
        let registry_client = registry::Client::new(&env, &registry_addr);
        let asset = registry_client.get_asset(&asset_id);

        let gross_payment = asset.valuation;
        let fee_bps: i128 = env.storage().instance().get(&DataKey::ProtocolFeeBps).unwrap();
        let fee = (gross_payment * fee_bps) / BPS_DENOMINATOR;
        let net_to_seller = gross_payment - fee;

        let mut fees: i128 = env.storage().instance().get(&DataKey::AccumulatedFees).unwrap();
        fees += fee;
        env.storage().instance().set(&DataKey::AccumulatedFees, &fees);

        let payment_addr: Address = env.storage().instance().get(&DataKey::PaymentToken).unwrap();
        let payment_client = payment::Client::new(&env, &payment_addr);
        
        // Buyer pays InvestmentManager, Manager pays Seller net and keeps fee
        payment_client.transfer(&buyer, &env.current_contract_address(), &gross_payment);
        payment_client.transfer(&env.current_contract_address(), &asset.asset_owner, &net_to_seller);

        registry_client.transfer_asset_ownership(&asset_id, &buyer);
        registry_client.close_asset(&asset_id, &env.current_contract_address());

        env.events().publish((symbol_short!("buy_whl"), asset_id, buyer), gross_payment);
    }

    pub fn withdraw_proceeds(env: Env, asset_id: u32) {
        let registry_addr: Address = env.storage().instance().get(&DataKey::Registry).unwrap();
        let registry_client = registry::Client::new(&env, &registry_addr);
        let asset = registry_client.get_asset(&asset_id);
        
        asset.asset_owner.require_auth();

        let mut pool: AssetInvestmentPool = env.storage().persistent().get(&DataKey::Pool(asset_id)).expect("no pool");
        let withdrawable = pool.proceeds_collected - pool.proceeds_withdrawn;
        
        if withdrawable <= 0 {
            panic!("no proceeds");
        }

        pool.proceeds_withdrawn += withdrawable;
        env.storage().persistent().set(&DataKey::Pool(asset_id), &pool);

        let payment_addr: Address = env.storage().instance().get(&DataKey::PaymentToken).unwrap();
        let payment_client = payment::Client::new(&env, &payment_addr);
        payment_client.transfer(&env.current_contract_address(), &asset.asset_owner, &withdrawable);

        env.events().publish((symbol_short!("withdrw"), asset_id, asset.asset_owner), withdrawable);
    }

    pub fn sweep_fees(env: Env) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        let fees: i128 = env.storage().instance().get(&DataKey::AccumulatedFees).unwrap();
        if fees <= 0 {
            panic!("no fees");
        }

        env.storage().instance().set(&DataKey::AccumulatedFees, &0i128);

        let treasury: Address = env.storage().instance().get(&DataKey::FeeTreasury).unwrap();
        let payment_addr: Address = env.storage().instance().get(&DataKey::PaymentToken).unwrap();
        let payment_client = payment::Client::new(&env, &payment_addr);
        payment_client.transfer(&env.current_contract_address(), &treasury, &fees);

        env.events().publish(symbol_short!("sweep"), fees);
    }

    // --- Query Functions ---

    pub fn get_pool(env: Env, asset_id: u32) -> AssetInvestmentPool {
        env.storage().persistent().get(&DataKey::Pool(asset_id)).expect("not found")
    }

    pub fn get_withdrawable_proceeds(env: Env, asset_id: u32) -> i128 {
        let pool: AssetInvestmentPool = env.storage().persistent().get(&DataKey::Pool(asset_id)).unwrap();
        pool.proceeds_collected - pool.proceeds_withdrawn
    }
}
