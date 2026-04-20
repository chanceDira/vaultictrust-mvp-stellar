#![no_std]
use soroban_sdk::{
    auth::{ContractContext, InvokerContractAuthEntry, SubContractInvocation},
    contract, contractimpl, contracttype, token, Address, Env, IntoVal, Symbol, Vec, symbol_short,
    vec,
};

// ---------------------------------------------------------------------------
// Cross-contract registry interface
// ---------------------------------------------------------------------------
mod registry {
    soroban_sdk::contractimport!(
        file = "../../target/wasm32-unknown-unknown/release/vaultic_asset_registry.wasm"
    );
}

mod user_registry {
    soroban_sdk::contractimport!(
        file = "../../target/wasm32-unknown-unknown/release/vaultic_user_registry.wasm"
    );
}

// ---------------------------------------------------------------------------
// Structs
// ---------------------------------------------------------------------------

/// Per-asset investment pool state for the current offering round.
/// Hybrid model: USDC payments tracked on-contract, RWA distribution via Native Stellar Asset.
#[contracttype]
#[derive(Clone, Debug)]
pub struct AssetInvestmentPool {
    /// Total fractional shares issued (matches native asset supply).
    pub total_shares: i128,
    /// Shares sold in current round.
    pub sold_shares: i128,
    /// USDC price per share (7 decimal places).
    pub price_per_share: i128,
    /// Max shares an investor can hold (0 = uncapped).
    pub investor_cap: i128,
    /// Stellar Native Asset issuer account for the RWA token.
    pub rwa_issuer: Address,
    /// Stellar Native Asset code (e.g. "VTGOLD").
    pub rwa_asset_code: soroban_sdk::String,
    /// Whether this offering round is fully subscribed.
    pub is_fully_subscribed: bool,
    /// Net proceeds collected from investors (after fee deduction).
    pub proceeds_collected: i128,
    /// Net proceeds already withdrawn by asset owner.
    pub proceeds_withdrawn: i128,
}

// ---------------------------------------------------------------------------
// Storage Keys
// ---------------------------------------------------------------------------

#[contracttype]
pub enum DataKey {
    Admin,
    Registry,
    UserRegistry,
    PaymentToken,   // Testnet USDC contract address
    FeeTreasury,
    ProtocolFeeBps,
    AccumulatedFees,
    Pool(u32),
    InvestorHoldings(u32, Address),
    InvestorList(u32),
}

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

#[contract]
pub struct VaulticInvestmentManager;

const BPS_DENOMINATOR: i128 = 10_000;

#[contractimpl]
impl VaulticInvestmentManager {
    // -----------------------------------------------------------------------
    // Initialization
    // -----------------------------------------------------------------------

    /// Initializes the investment manager. Must be called exactly once.
    /// payment_token is the Testnet USDC contract address.
    pub fn initialize(
        env: Env,
        admin: Address,
        registry: Address,
        user_registry: Address,
        payment_token: Address,
        fee_treasury: Address,
        protocol_fee_bps: i128,
    ) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        if protocol_fee_bps > 1_000 {
            panic!("fee exceeds max (10%)");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Registry, &registry);
        env.storage().instance().set(&DataKey::UserRegistry, &user_registry);
        env.storage().instance().set(&DataKey::PaymentToken, &payment_token);
        env.storage().instance().set(&DataKey::FeeTreasury, &fee_treasury);
        env.storage().instance().set(&DataKey::ProtocolFeeBps, &protocol_fee_bps);
        env.storage().instance().set(&DataKey::AccumulatedFees, &0i128);
    }

    // -----------------------------------------------------------------------
    // Admin governance
    // -----------------------------------------------------------------------

    pub fn set_protocol_fee(env: Env, new_fee_bps: i128) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        if new_fee_bps > 1_000 {
            panic!("fee exceeds max (10%)");
        }
        env.storage().instance().set(&DataKey::ProtocolFeeBps, &new_fee_bps);
    }

    pub fn set_fee_treasury(env: Env, new_treasury: Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        env.storage().instance().set(&DataKey::FeeTreasury, &new_treasury);
    }

    /// Transfers administrative power to a new address. Admin only.
    pub fn set_admin(env: Env, new_admin: Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).expect("not initialized");
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &new_admin);
        env.events().publish((symbol_short!("adm_xfr"),), new_admin);
    }

    // -----------------------------------------------------------------------
    // Tokenization: Activate Investment Pool (Active → Open for investment)
    // -----------------------------------------------------------------------

    /// Opens an investment pool for a FRACTIONAL asset that has been marked Active in the registry.
    /// The caller (admin) provides the rwa_issuer & rwa_asset_code which represent the
    /// Stellar Native Asset that will be distributed to investors.
    /// The InvestmentManager account must be the native asset's distribution account.
    pub fn tokenize_asset(
        env: Env,
        asset_id: u32,
        total_shares: i128,
        price_per_share: i128,
        investor_cap: i128,
        rwa_issuer: Address,
        rwa_asset_code: soroban_sdk::String,
    ) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        if total_shares <= 0 {
            panic!("invalid share supply");
        }
        if price_per_share <= 0 {
            panic!("invalid price");
        }

        // Notify registry of tokenization
        let registry_addr: Address = env.storage().instance().get(&DataKey::Registry).unwrap();
        
        // Authorize this current contract for the call to the registry
        env.authorize_as_current_contract(vec![
            &env,
            InvokerContractAuthEntry::Contract(SubContractInvocation {
                context: ContractContext {
                    contract: registry_addr.clone(),
                    fn_name: Symbol::new(&env, "record_tokenization"),
                    args: (asset_id, rwa_issuer.clone(), total_shares, price_per_share).into_val(&env),
                },
                sub_invocations: vec![&env],
            }),
        ]);

        let registry_client = registry::Client::new(&env, &registry_addr);
        registry_client.record_tokenization(
            &asset_id,
            &rwa_issuer,
            &total_shares,
            &price_per_share,
        );

        let pool = AssetInvestmentPool {
            total_shares,
            sold_shares: 0,
            price_per_share,
            investor_cap,
            rwa_issuer: rwa_issuer.clone(),
            rwa_asset_code: rwa_asset_code.clone(),
            is_fully_subscribed: false,
            proceeds_collected: 0,
            proceeds_withdrawn: 0,
        };

        env.storage().persistent().set(&DataKey::Pool(asset_id), &pool);
        env.events().publish((symbol_short!("tokenized"), asset_id, rwa_issuer), total_shares);
    }

    // -----------------------------------------------------------------------
    // Investment: Purchase Fractional Shares
    // -----------------------------------------------------------------------

    /// Atomically: investor pays USDC → InvestmentManager records → Stellar Native RWA
    /// tokens must be transferred separately by the distribution account (or via trustline setup).
    ///
    /// In the full native asset model the distribution of RWA tokens happens via a separate
    /// Stellar Horizon payment transaction signed by the distribution account. This function
    /// handles the USDC leg and registry tracking.
    pub fn purchase_shares(env: Env, investor: Address, asset_id: u32, share_amount: i128) {
        investor.require_auth();

        // KYC Gating
        let user_registry_addr: Address = env.storage().instance().get(&DataKey::UserRegistry).unwrap();
        let user_registry_client = user_registry::Client::new(&env, &user_registry_addr);
        if !user_registry_client.is_verified(&investor) {
            panic!("investor not KYC verified");
        }

        if share_amount <= 0 {
            panic!("zero purchase amount");
        }

        let mut pool: AssetInvestmentPool = env
            .storage()
            .persistent()
            .get(&DataKey::Pool(asset_id))
            .expect("no investment pool for this asset");

        if pool.is_fully_subscribed {
            panic!("offering fully subscribed");
        }

        let remaining = pool.total_shares - pool.sold_shares;
        if share_amount > remaining {
            panic!("insufficient shares available");
        }

        if pool.investor_cap > 0 {
            let current_holding: i128 = env
                .storage()
                .persistent()
                .get(&DataKey::InvestorHoldings(asset_id, investor.clone()))
                .unwrap_or(0);
            if current_holding + share_amount > pool.investor_cap {
                panic!("investor cap exceeded");
            }
        }

        let gross_cost = pool.price_per_share * share_amount;
        let fee_bps: i128 = env.storage().instance().get(&DataKey::ProtocolFeeBps).unwrap();
        let fee = (gross_cost * fee_bps) / BPS_DENOMINATOR;
        let net_cost = gross_cost - fee;

        // Transfer USDC from investor → InvestmentManager (gross amount)
        let payment_addr: Address = env.storage().instance().get(&DataKey::PaymentToken).unwrap();
        let payment_client = token::Client::new(&env, &payment_addr);
        payment_client.transfer(&investor, &env.current_contract_address(), &gross_cost);

        // Update pool state
        pool.sold_shares += share_amount;
        pool.proceeds_collected += net_cost;
        if pool.sold_shares >= pool.total_shares {
            pool.is_fully_subscribed = true;
        }

        // Fee tracking
        let mut fees: i128 = env.storage().instance().get(&DataKey::AccumulatedFees).unwrap();
        fees += fee;
        env.storage().instance().set(&DataKey::AccumulatedFees, &fees);

        // Investor holdings tracking (for cap enforcement & dividend eligibility)
        let current_holding: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::InvestorHoldings(asset_id, investor.clone()))
            .unwrap_or(0);
        if current_holding == 0 {
            // First purchase: add to investor list
            let mut investor_list: Vec<Address> = env
                .storage()
                .persistent()
                .get(&DataKey::InvestorList(asset_id))
                .unwrap_or(Vec::new(&env));
            investor_list.push_back(investor.clone());
            env.storage().persistent().set(&DataKey::InvestorList(asset_id), &investor_list);
        }
        env.storage().persistent().set(
            &DataKey::InvestorHoldings(asset_id, investor.clone()),
            &(current_holding + share_amount),
        );

        // Notify registry of shares sold
        let registry_addr: Address = env.storage().instance().get(&DataKey::Registry).unwrap();

        env.authorize_as_current_contract(vec![
            &env,
            InvokerContractAuthEntry::Contract(SubContractInvocation {
                context: ContractContext {
                    contract: registry_addr.clone(),
                    fn_name: Symbol::new(&env, "record_shares_sold"),
                    args: (asset_id, share_amount).into_val(&env),
                },
                sub_invocations: vec![&env],
            }),
        ]);

        let registry_client = registry::Client::new(&env, &registry_addr);
        registry_client.record_shares_sold(&asset_id, &share_amount);

        env.storage().persistent().set(&DataKey::Pool(asset_id), &pool);

        // If fully subscribed, close the asset in registry
        if pool.is_fully_subscribed {
            env.authorize_as_current_contract(vec![
                &env,
                InvokerContractAuthEntry::Contract(SubContractInvocation {
                    context: ContractContext {
                        contract: registry_addr.clone(),
                        fn_name: Symbol::new(&env, "close_asset"),
                        args: (asset_id, env.current_contract_address()).into_val(&env),
                    },
                    sub_invocations: vec![&env],
                }),
            ]);
            registry_client.close_asset(&asset_id, &env.current_contract_address());
        }

        env.events().publish(
            (symbol_short!("buy_sh"), asset_id, investor),
            (share_amount, gross_cost, fee),
        );
    }

    // -----------------------------------------------------------------------
    // Investment: Purchase Whole Asset
    // -----------------------------------------------------------------------

    /// Purchases a WHOLE_OWNERSHIP asset for its full valuation.
    /// Buyer pays USDC in full; seller receives net (minus protocol fee).
    pub fn purchase_whole_asset(env: Env, buyer: Address, asset_id: u32) {
        buyer.require_auth();

        // KYC Gating
        let user_registry_addr: Address = env.storage().instance().get(&DataKey::UserRegistry).unwrap();
        let user_registry_client = user_registry::Client::new(&env, &user_registry_addr);
        if !user_registry_client.is_verified(&buyer) {
            panic!("buyer not KYC verified");
        }

        let registry_addr: Address = env.storage().instance().get(&DataKey::Registry).unwrap();
        let registry_client = registry::Client::new(&env, &registry_addr);
        let asset = registry_client.get_asset(&asset_id);

        if asset.valuation <= 0 {
            panic!("invalid valuation");
        }

        let gross_payment = asset.valuation;
        let fee_bps: i128 = env.storage().instance().get(&DataKey::ProtocolFeeBps).unwrap();
        let fee = (gross_payment * fee_bps) / BPS_DENOMINATOR;
        let net_to_seller = gross_payment - fee;

        // Fee accounting
        let mut fees: i128 = env.storage().instance().get(&DataKey::AccumulatedFees).unwrap();
        fees += fee;
        env.storage().instance().set(&DataKey::AccumulatedFees, &fees);

        // Buyer pays InvestmentManager
        let payment_addr: Address = env.storage().instance().get(&DataKey::PaymentToken).unwrap();
        let payment_client = token::Client::new(&env, &payment_addr);
        payment_client.transfer(&buyer, &env.current_contract_address(), &gross_payment);
        // Manager pays seller net
        payment_client.transfer(&env.current_contract_address(), &asset.asset_owner, &net_to_seller);

        // Transfer ownership and close in registry
        env.authorize_as_current_contract(vec![
            &env,
            InvokerContractAuthEntry::Contract(SubContractInvocation {
                context: ContractContext {
                    contract: registry_addr.clone(),
                    fn_name: Symbol::new(&env, "transfer_asset_ownership"),
                    args: (asset_id, buyer.clone()).into_val(&env),
                },
                sub_invocations: vec![&env],
            }),
            InvokerContractAuthEntry::Contract(SubContractInvocation {
                context: ContractContext {
                    contract: registry_addr.clone(),
                    fn_name: Symbol::new(&env, "close_asset"),
                    args: (asset_id, env.current_contract_address()).into_val(&env),
                },
                sub_invocations: vec![&env],
            }),
        ]);
        registry_client.transfer_asset_ownership(&asset_id, &buyer);
        registry_client.close_asset(&asset_id, &env.current_contract_address());

        env.events().publish(
            (symbol_short!("buy_whl"), asset_id, buyer),
            (gross_payment, fee),
        );
    }

    // -----------------------------------------------------------------------
    // Proceeds & Fees
    // -----------------------------------------------------------------------

    /// Withdraws accumulated net proceeds to the registered asset owner. Pull-over-push pattern.
    pub fn withdraw_proceeds(env: Env, asset_id: u32) {
        let registry_addr: Address = env.storage().instance().get(&DataKey::Registry).unwrap();
        let registry_client = registry::Client::new(&env, &registry_addr);
        let asset = registry_client.get_asset(&asset_id);

        asset.asset_owner.require_auth();

        let mut pool: AssetInvestmentPool = env
            .storage()
            .persistent()
            .get(&DataKey::Pool(asset_id))
            .expect("no pool");

        let withdrawable = pool.proceeds_collected - pool.proceeds_withdrawn;
        if withdrawable <= 0 {
            panic!("no proceeds to withdraw");
        }

        pool.proceeds_withdrawn += withdrawable;
        env.storage().persistent().set(&DataKey::Pool(asset_id), &pool);

        let payment_addr: Address = env.storage().instance().get(&DataKey::PaymentToken).unwrap();
        let payment_client = token::Client::new(&env, &payment_addr);
        payment_client.transfer(&env.current_contract_address(), &asset.asset_owner, &withdrawable);

        env.events().publish(
            (symbol_short!("withdrw"), asset_id, asset.asset_owner),
            withdrawable,
        );
    }

    /// Sweeps accumulated protocol fees to the fee treasury. Admin only.
    pub fn sweep_fees(env: Env) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        let fees: i128 = env.storage().instance().get(&DataKey::AccumulatedFees).unwrap();
        if fees <= 0 {
            panic!("no fees to sweep");
        }

        env.storage().instance().set(&DataKey::AccumulatedFees, &0i128);

        let treasury: Address = env.storage().instance().get(&DataKey::FeeTreasury).unwrap();
        let payment_addr: Address = env.storage().instance().get(&DataKey::PaymentToken).unwrap();
        let payment_client = token::Client::new(&env, &payment_addr);
        payment_client.transfer(&env.current_contract_address(), &treasury, &fees);

        env.events().publish((symbol_short!("sweep"),), fees);
    }

    // -----------------------------------------------------------------------
    // Relisting a CLOSED asset
    // -----------------------------------------------------------------------

    /// Allows the registered asset owner to relist a CLOSED FRACTIONAL asset for a new round.
    pub fn relist_asset(
        env: Env,
        caller: Address,
        asset_id: u32,
        new_total_shares: i128,
        new_price_per_share: i128,
        new_valuation: i128,
        new_metadata_uri: soroban_sdk::String,
        new_investor_cap: i128,
        new_rwa_issuer: Address,
        new_rwa_asset_code: soroban_sdk::String,
    ) {
        caller.require_auth();

        if new_total_shares <= 0 { panic!("invalid share supply"); }
        if new_price_per_share <= 0 { panic!("invalid price"); }

        let registry_addr: Address = env.storage().instance().get(&DataKey::Registry).unwrap();
        let registry_client = registry::Client::new(&env, &registry_addr);
        let asset = registry_client.get_asset(&asset_id);

        if caller != asset.asset_owner {
            panic!("not asset owner");
        }

        // Ask registry to relist
        env.authorize_as_current_contract(vec![
            &env,
            InvokerContractAuthEntry::Contract(SubContractInvocation {
                context: ContractContext {
                    contract: registry_addr.clone(),
                    fn_name: Symbol::new(&env, "relist_asset"),
                    args: (asset_id, new_valuation, new_metadata_uri.clone()).into_val(&env),
                },
                sub_invocations: vec![&env],
            }),
        ]);
        registry_client.relist_asset(&asset_id, &new_valuation, &new_metadata_uri);

        // Reset the local pool
        let pool = AssetInvestmentPool {
            total_shares: new_total_shares,
            sold_shares: 0,
            price_per_share: new_price_per_share,
            investor_cap: new_investor_cap,
            rwa_issuer: new_rwa_issuer,
            rwa_asset_code: new_rwa_asset_code,
            is_fully_subscribed: false,
            proceeds_collected: 0,
            proceeds_withdrawn: 0,
        };
        env.storage().persistent().set(&DataKey::Pool(asset_id), &pool);

        // Clear investor list for new round
        env.storage().persistent().set(&DataKey::InvestorList(asset_id), &Vec::<Address>::new(&env));

        // Record tokenization in registry
        registry_client.record_tokenization(
            &asset_id,
            &pool.rwa_issuer,
            &new_total_shares,
            &new_price_per_share,
        );

        let relist_count = registry_client.get_relist_count(&asset_id);
        env.events().publish(
            (symbol_short!("relist"), asset_id, caller),
            (new_total_shares, new_price_per_share, relist_count),
        );
    }

    // -----------------------------------------------------------------------
    // View Functions
    // -----------------------------------------------------------------------

    pub fn get_pool(env: Env, asset_id: u32) -> AssetInvestmentPool {
        env.storage().persistent().get(&DataKey::Pool(asset_id)).expect("not found")
    }

    pub fn get_withdrawable_proceeds(env: Env, asset_id: u32) -> i128 {
        let pool: AssetInvestmentPool = env.storage().persistent().get(&DataKey::Pool(asset_id)).unwrap();
        pool.proceeds_collected - pool.proceeds_withdrawn
    }

    pub fn get_investor_holdings(env: Env, asset_id: u32, investor: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::InvestorHoldings(asset_id, investor))
            .unwrap_or(0)
    }

    pub fn get_investor_list(env: Env, asset_id: u32) -> Vec<Address> {
        env.storage()
            .persistent()
            .get(&DataKey::InvestorList(asset_id))
            .unwrap_or(Vec::new(&env))
    }

    pub fn available_shares(env: Env, asset_id: u32) -> i128 {
        let pool: AssetInvestmentPool = env.storage().persistent().get(&DataKey::Pool(asset_id)).unwrap();
        pool.total_shares - pool.sold_shares
    }

    pub fn quote_purchase(env: Env, asset_id: u32, share_amount: i128) -> (i128, i128, i128) {
        let pool: AssetInvestmentPool = env.storage().persistent().get(&DataKey::Pool(asset_id)).unwrap();
        let gross_cost = pool.price_per_share * share_amount;
        let fee_bps: i128 = env.storage().instance().get(&DataKey::ProtocolFeeBps).unwrap();
        let fee = (gross_cost * fee_bps) / BPS_DENOMINATOR;
        let net_cost = gross_cost - fee;
        (gross_cost, fee, net_cost)
    }

    pub fn accumulated_fees(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::AccumulatedFees).unwrap_or(0)
    }
}
