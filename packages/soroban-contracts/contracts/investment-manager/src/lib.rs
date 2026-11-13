#![no_std]
use soroban_sdk::{
    auth::{ContractContext, InvokerContractAuthEntry, SubContractInvocation},
    contract, contractimpl, contracttype, symbol_short, token, vec, Address, BytesN, Env, IntoVal,
    Symbol, Vec,
};

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

#[contracttype]
#[derive(Clone, Debug)]
pub struct AssetInvestmentPool {
    pub total_shares: i128,

    pub sold_shares: i128,

    pub price_per_share: i128,

    pub investor_cap: i128,

    pub rwa_issuer: Address,

    pub rwa_asset_code: soroban_sdk::String,

    pub is_fully_subscribed: bool,

    pub proceeds_collected: i128,

    pub proceeds_withdrawn: i128,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct ShareOffer {
    pub shares: i128,
    pub price_per_share: i128,
}

#[contracttype]
pub enum DataKey {
    Admins,
    Registry,
    UserRegistry,
    PaymentToken,
    FeeTreasury,
    ProtocolFeeBps,
    AccumulatedFees,
    Pool(u32),
    InvestorHoldings(u32, Address),
    InvestorList(u32),
    PurchasesPaused,
    ShareOffer(u32, Address),
    OfferSellers(u32),
    ShareToken(u32),
}

#[contract]
pub struct VaulticInvestmentManager;

const BPS_DENOMINATOR: i128 = 10_000;
// The share contract rejects an approval that lasts longer than this many ledgers.
const SHARE_ALLOWANCE_LEDGERS: u32 = 535_680;

fn approve_share_allowance(env: &Env, seller: &Address, asset_id: u32, amount: i128) {
    let share_token: Address = env
        .storage()
        .persistent()
        .get(&DataKey::ShareToken(asset_id))
        .expect("share token is not set");
    let share_client = token::Client::new(env, &share_token);
    let expiration = env
        .ledger()
        .sequence()
        .saturating_add(SHARE_ALLOWANCE_LEDGERS);
    share_client.approve(
        seller,
        &env.current_contract_address(),
        &amount,
        &expiration,
    );
}

fn purchases_are_paused(env: &Env) -> bool {
    env.storage()
        .instance()
        .get(&DataKey::PurchasesPaused)
        .unwrap_or(false)
}

fn require_verified(env: &Env, account: &Address) {
    let user_registry_addr: Address = env
        .storage()
        .instance()
        .get(&DataKey::UserRegistry)
        .unwrap();
    let user_registry_client = user_registry::Client::new(env, &user_registry_addr);
    if !user_registry_client.is_verified(account) {
        panic!("investor not KYC verified");
    }
}

fn apply_holding_transfer(
    env: &Env,
    asset_id: u32,
    seller: &Address,
    buyer: &Address,
    share_amount: i128,
) {
    if !env.storage().persistent().has(&DataKey::Pool(asset_id)) {
        panic!("no investment pool for this asset");
    }
    let pool: AssetInvestmentPool = env
        .storage()
        .persistent()
        .get(&DataKey::Pool(asset_id))
        .unwrap();

    let seller_holding: i128 = env
        .storage()
        .persistent()
        .get(&DataKey::InvestorHoldings(asset_id, seller.clone()))
        .unwrap_or(0);
    if seller_holding < share_amount {
        panic!("insufficient holdings");
    }

    let buyer_holding: i128 = env
        .storage()
        .persistent()
        .get(&DataKey::InvestorHoldings(asset_id, buyer.clone()))
        .unwrap_or(0);
    if pool.investor_cap > 0 && buyer_holding + share_amount > pool.investor_cap {
        panic!("investor cap exceeded");
    }

    let seller_remaining = seller_holding - share_amount;
    env.storage().persistent().set(
        &DataKey::InvestorHoldings(asset_id, seller.clone()),
        &seller_remaining,
    );
    if buyer_holding == 0 {
        let mut investor_list: Vec<Address> = env
            .storage()
            .persistent()
            .get(&DataKey::InvestorList(asset_id))
            .unwrap_or(Vec::new(env));
        investor_list.push_back(buyer.clone());
        env.storage()
            .persistent()
            .set(&DataKey::InvestorList(asset_id), &investor_list);
    }
    env.storage().persistent().set(
        &DataKey::InvestorHoldings(asset_id, buyer.clone()),
        &(buyer_holding + share_amount),
    );

    if seller_remaining == 0 {
        let current: Vec<Address> = env
            .storage()
            .persistent()
            .get(&DataKey::InvestorList(asset_id))
            .unwrap_or(Vec::new(env));
        let mut remaining: Vec<Address> = Vec::new(env);
        for holder in current.iter() {
            if holder != seller.clone() {
                remaining.push_back(holder);
            }
        }
        env.storage()
            .persistent()
            .set(&DataKey::InvestorList(asset_id), &remaining);
    }
}

fn remember_offer_seller(env: &Env, asset_id: u32, seller: &Address) {
    let mut sellers: Vec<Address> = env
        .storage()
        .persistent()
        .get(&DataKey::OfferSellers(asset_id))
        .unwrap_or(Vec::new(env));
    if !sellers.contains(seller) {
        sellers.push_back(seller.clone());
        env.storage()
            .persistent()
            .set(&DataKey::OfferSellers(asset_id), &sellers);
    }
}

fn forget_offer_seller(env: &Env, asset_id: u32, seller: &Address) {
    let current: Vec<Address> = env
        .storage()
        .persistent()
        .get(&DataKey::OfferSellers(asset_id))
        .unwrap_or(Vec::new(env));
    let mut remaining: Vec<Address> = Vec::new(env);
    for holder in current.iter() {
        if holder != seller.clone() {
            remaining.push_back(holder);
        }
    }
    env.storage()
        .persistent()
        .set(&DataKey::OfferSellers(asset_id), &remaining);
}

#[contractimpl]
impl VaulticInvestmentManager {
    pub fn initialize(
        env: Env,
        admins: Vec<Address>,
        registry: Address,
        user_registry: Address,
        payment_token: Address,
        fee_treasury: Address,
        protocol_fee_bps: i128,
    ) {
        if env.storage().instance().has(&DataKey::Admins) {
            panic!("already initialized");
        }
        if admins.is_empty() {
            panic!("at least one admin required");
        }
        if protocol_fee_bps > 1_000 {
            panic!("fee exceeds max (10%)");
        }
        env.storage().instance().set(&DataKey::Admins, &admins);
        env.storage().instance().set(&DataKey::Registry, &registry);
        env.storage()
            .instance()
            .set(&DataKey::UserRegistry, &user_registry);
        env.storage()
            .instance()
            .set(&DataKey::PaymentToken, &payment_token);
        env.storage()
            .instance()
            .set(&DataKey::FeeTreasury, &fee_treasury);
        env.storage()
            .instance()
            .set(&DataKey::ProtocolFeeBps, &protocol_fee_bps);
        env.storage()
            .instance()
            .set(&DataKey::AccumulatedFees, &0i128);
    }

    pub fn set_protocol_fee(env: Env, caller: Address, new_fee_bps: i128) {
        caller.require_auth();
        let admins: Vec<Address> = env.storage().instance().get(&DataKey::Admins).unwrap();
        if !admins.contains(&caller) {
            panic!("not an admin");
        }
        if new_fee_bps > 1_000 {
            panic!("fee exceeds max (10%)");
        }
        env.storage()
            .instance()
            .set(&DataKey::ProtocolFeeBps, &new_fee_bps);
    }

    pub fn set_fee_treasury(env: Env, caller: Address, new_treasury: Address) {
        caller.require_auth();
        let admins: Vec<Address> = env.storage().instance().get(&DataKey::Admins).unwrap();
        if !admins.contains(&caller) {
            panic!("not an admin");
        }
        env.storage()
            .instance()
            .set(&DataKey::FeeTreasury, &new_treasury);
    }

    pub fn set_admins(env: Env, caller: Address, new_admins: Vec<Address>) {
        caller.require_auth();
        let admins: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Admins)
            .expect("not initialized");
        if !admins.contains(&caller) {
            panic!("not an admin");
        }
        if new_admins.is_empty() {
            panic!("at least one admin required");
        }
        env.storage().instance().set(&DataKey::Admins, &new_admins);
        env.events()
            .publish((symbol_short!("adm_xfr"),), env.ledger().timestamp());
    }

    pub fn upgrade(env: Env, caller: Address, new_wasm_hash: BytesN<32>) {
        caller.require_auth();
        let admins: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Admins)
            .expect("not initialized");
        if !admins.contains(&caller) {
            panic!("not an admin");
        }
        env.deployer().update_current_contract_wasm(new_wasm_hash);
    }

    pub fn get_admins(env: Env) -> Vec<Address> {
        env.storage()
            .instance()
            .get(&DataKey::Admins)
            .expect("not initialized")
    }

    pub fn tokenize_asset(
        env: Env,
        caller: Address,
        asset_id: u32,
        total_shares: i128,
        price_per_share: i128,
        investor_cap: i128,
        rwa_issuer: Address,
        rwa_asset_code: soroban_sdk::String,
    ) {
        caller.require_auth();
        let admins: Vec<Address> = env.storage().instance().get(&DataKey::Admins).unwrap();
        if !admins.contains(&caller) {
            panic!("not an admin");
        }

        if total_shares <= 0 {
            panic!("invalid share supply");
        }
        if price_per_share <= 0 {
            panic!("invalid price");
        }

        let registry_addr: Address = env.storage().instance().get(&DataKey::Registry).unwrap();

        env.authorize_as_current_contract(vec![
            &env,
            InvokerContractAuthEntry::Contract(SubContractInvocation {
                context: ContractContext {
                    contract: registry_addr.clone(),
                    fn_name: Symbol::new(&env, "record_tokenization"),
                    args: (asset_id, rwa_issuer.clone(), total_shares, price_per_share)
                        .into_val(&env),
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

        env.storage()
            .persistent()
            .set(&DataKey::Pool(asset_id), &pool);
        env.events().publish(
            (symbol_short!("tokenized"), asset_id, rwa_issuer),
            total_shares,
        );
    }

    pub fn purchase_shares(env: Env, investor: Address, asset_id: u32, share_amount: i128) {
        investor.require_auth();
        if purchases_are_paused(&env) {
            panic!("purchases are paused");
        }

        let user_registry_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::UserRegistry)
            .unwrap();
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
        let fee_bps: i128 = env
            .storage()
            .instance()
            .get(&DataKey::ProtocolFeeBps)
            .unwrap();
        let fee = (gross_cost * fee_bps) / BPS_DENOMINATOR;
        let net_cost = gross_cost - fee;

        let payment_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::PaymentToken)
            .unwrap();
        let payment_client = token::Client::new(&env, &payment_addr);
        payment_client.transfer(&investor, &env.current_contract_address(), &gross_cost);

        pool.sold_shares += share_amount;
        pool.proceeds_collected += net_cost;
        if pool.sold_shares >= pool.total_shares {
            pool.is_fully_subscribed = true;
        }

        let mut fees: i128 = env
            .storage()
            .instance()
            .get(&DataKey::AccumulatedFees)
            .unwrap();
        fees += fee;
        env.storage()
            .instance()
            .set(&DataKey::AccumulatedFees, &fees);

        let current_holding: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::InvestorHoldings(asset_id, investor.clone()))
            .unwrap_or(0);
        if current_holding == 0 {
            let mut investor_list: Vec<Address> = env
                .storage()
                .persistent()
                .get(&DataKey::InvestorList(asset_id))
                .unwrap_or(Vec::new(&env));
            investor_list.push_back(investor.clone());
            env.storage()
                .persistent()
                .set(&DataKey::InvestorList(asset_id), &investor_list);
        }
        env.storage().persistent().set(
            &DataKey::InvestorHoldings(asset_id, investor.clone()),
            &(current_holding + share_amount),
        );

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

        env.storage()
            .persistent()
            .set(&DataKey::Pool(asset_id), &pool);

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

    pub fn purchase_whole_asset(env: Env, buyer: Address, asset_id: u32) {
        buyer.require_auth();
        if purchases_are_paused(&env) {
            panic!("purchases are paused");
        }

        let user_registry_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::UserRegistry)
            .unwrap();
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
        let fee_bps: i128 = env
            .storage()
            .instance()
            .get(&DataKey::ProtocolFeeBps)
            .unwrap();
        let fee = (gross_payment * fee_bps) / BPS_DENOMINATOR;
        let net_to_seller = gross_payment - fee;

        let mut fees: i128 = env
            .storage()
            .instance()
            .get(&DataKey::AccumulatedFees)
            .unwrap();
        fees += fee;
        env.storage()
            .instance()
            .set(&DataKey::AccumulatedFees, &fees);

        let payment_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::PaymentToken)
            .unwrap();
        let payment_client = token::Client::new(&env, &payment_addr);
        payment_client.transfer(&buyer, &env.current_contract_address(), &gross_payment);
        payment_client.transfer(
            &env.current_contract_address(),
            &asset.asset_owner,
            &net_to_seller,
        );

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
        env.storage()
            .persistent()
            .set(&DataKey::Pool(asset_id), &pool);

        let payment_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::PaymentToken)
            .unwrap();
        let payment_client = token::Client::new(&env, &payment_addr);
        payment_client.transfer(
            &env.current_contract_address(),
            &asset.asset_owner,
            &withdrawable,
        );

        env.events().publish(
            (symbol_short!("withdrw"), asset_id, asset.asset_owner),
            withdrawable,
        );
    }

    pub fn sweep_fees(env: Env, caller: Address) {
        caller.require_auth();
        let admins: Vec<Address> = env.storage().instance().get(&DataKey::Admins).unwrap();
        if !admins.contains(&caller) {
            panic!("not an admin");
        }

        let fees: i128 = env
            .storage()
            .instance()
            .get(&DataKey::AccumulatedFees)
            .unwrap();
        if fees <= 0 {
            panic!("no fees to sweep");
        }

        env.storage()
            .instance()
            .set(&DataKey::AccumulatedFees, &0i128);

        let treasury: Address = env.storage().instance().get(&DataKey::FeeTreasury).unwrap();
        let payment_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::PaymentToken)
            .unwrap();
        let payment_client = token::Client::new(&env, &payment_addr);
        payment_client.transfer(&env.current_contract_address(), &treasury, &fees);

        env.events().publish((symbol_short!("sweep"),), fees);
    }

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

        if new_total_shares <= 0 {
            panic!("invalid share supply");
        }
        if new_price_per_share <= 0 {
            panic!("invalid price");
        }

        let registry_addr: Address = env.storage().instance().get(&DataKey::Registry).unwrap();
        let registry_client = registry::Client::new(&env, &registry_addr);
        let asset = registry_client.get_asset(&asset_id);

        if caller != asset.asset_owner {
            panic!("not asset owner");
        }

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
        env.storage()
            .persistent()
            .set(&DataKey::Pool(asset_id), &pool);

        env.storage()
            .persistent()
            .set(&DataKey::InvestorList(asset_id), &Vec::<Address>::new(&env));

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

    pub fn transfer_investor_holdings(
        env: Env,
        seller: Address,
        buyer: Address,
        asset_id: u32,
        share_amount: i128,
    ) {
        seller.require_auth();
        buyer.require_auth();

        if seller == buyer {
            panic!("seller and buyer are the same");
        }
        if share_amount <= 0 {
            panic!("zero transfer amount");
        }

        require_verified(&env, &seller);
        require_verified(&env, &buyer);
        apply_holding_transfer(&env, asset_id, &seller, &buyer, share_amount);

        // The share asset and the USDC payment move in the resale fill, not here.
        env.events().publish(
            (symbol_short!("hold_mv"), asset_id, seller),
            (buyer, share_amount),
        );
    }

    pub fn set_share_token(env: Env, caller: Address, asset_id: u32, token: Address) {
        caller.require_auth();
        let admins: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Admins)
            .expect("not initialized");
        if !admins.contains(&caller) {
            panic!("not an admin");
        }
        if !env.storage().persistent().has(&DataKey::Pool(asset_id)) {
            panic!("no investment pool for this asset");
        }
        env.storage()
            .persistent()
            .set(&DataKey::ShareToken(asset_id), &token);
    }

    pub fn get_share_token(env: Env, asset_id: u32) -> Option<Address> {
        env.storage()
            .persistent()
            .get(&DataKey::ShareToken(asset_id))
    }

    pub fn create_share_offer(
        env: Env,
        seller: Address,
        asset_id: u32,
        shares: i128,
        price_per_share: i128,
    ) {
        seller.require_auth();
        if purchases_are_paused(&env) {
            panic!("purchases are paused");
        }
        if shares <= 0 {
            panic!("zero offer amount");
        }
        if price_per_share <= 0 {
            panic!("invalid price");
        }
        require_verified(&env, &seller);
        let holding: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::InvestorHoldings(asset_id, seller.clone()))
            .unwrap_or(0);
        if holding < shares {
            panic!("insufficient holdings");
        }
        if env
            .storage()
            .persistent()
            .has(&DataKey::ShareOffer(asset_id, seller.clone()))
        {
            panic!("offer already open");
        }

        approve_share_allowance(&env, &seller, asset_id, shares);

        env.storage().persistent().set(
            &DataKey::ShareOffer(asset_id, seller.clone()),
            &ShareOffer {
                shares,
                price_per_share,
            },
        );
        remember_offer_seller(&env, asset_id, &seller);
        env.events().publish(
            (symbol_short!("off_new"), asset_id, seller),
            (shares, price_per_share),
        );
    }

    pub fn cancel_share_offer(env: Env, seller: Address, asset_id: u32) {
        seller.require_auth();
        let offer: ShareOffer = env
            .storage()
            .persistent()
            .get(&DataKey::ShareOffer(asset_id, seller.clone()))
            .expect("offer not found");
        approve_share_allowance(&env, &seller, asset_id, 0);
        env.storage()
            .persistent()
            .remove(&DataKey::ShareOffer(asset_id, seller.clone()));
        forget_offer_seller(&env, asset_id, &seller);
        env.events()
            .publish((symbol_short!("off_can"), asset_id, seller), offer.shares);
    }

    pub fn fill_share_offer(
        env: Env,
        buyer: Address,
        seller: Address,
        asset_id: u32,
        share_amount: i128,
    ) {
        // The seller approved these shares when the offer opened, so only the buyer signs.
        buyer.require_auth();
        if purchases_are_paused(&env) {
            panic!("purchases are paused");
        }
        if buyer == seller {
            panic!("seller and buyer are the same");
        }
        if share_amount <= 0 {
            panic!("zero transfer amount");
        }
        require_verified(&env, &seller);
        require_verified(&env, &buyer);

        let offer: ShareOffer = env
            .storage()
            .persistent()
            .get(&DataKey::ShareOffer(asset_id, seller.clone()))
            .expect("offer not found");
        if share_amount > offer.shares {
            panic!("insufficient offer");
        }

        let share_token: Address = env
            .storage()
            .persistent()
            .get(&DataKey::ShareToken(asset_id))
            .expect("share token is not set");

        let gross = offer.price_per_share * share_amount;
        let fee_bps: i128 = env
            .storage()
            .instance()
            .get(&DataKey::ProtocolFeeBps)
            .unwrap();
        let fee = (gross * fee_bps) / BPS_DENOMINATOR;
        let net_to_seller = gross - fee;

        let payment_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::PaymentToken)
            .unwrap();
        let payment_client = token::Client::new(&env, &payment_addr);
        payment_client.transfer(&buyer, &env.current_contract_address(), &gross);

        env.authorize_as_current_contract(vec![
            &env,
            InvokerContractAuthEntry::Contract(SubContractInvocation {
                context: ContractContext {
                    contract: payment_addr.clone(),
                    fn_name: Symbol::new(&env, "transfer"),
                    args: (
                        env.current_contract_address(),
                        seller.clone(),
                        net_to_seller,
                    )
                        .into_val(&env),
                },
                sub_invocations: vec![&env],
            }),
            InvokerContractAuthEntry::Contract(SubContractInvocation {
                context: ContractContext {
                    contract: share_token.clone(),
                    fn_name: Symbol::new(&env, "transfer_from"),
                    args: (
                        env.current_contract_address(),
                        seller.clone(),
                        buyer.clone(),
                        share_amount,
                    )
                        .into_val(&env),
                },
                sub_invocations: vec![&env],
            }),
        ]);
        payment_client.transfer(&env.current_contract_address(), &seller, &net_to_seller);
        let share_client = token::Client::new(&env, &share_token);
        share_client.transfer_from(
            &env.current_contract_address(),
            &seller,
            &buyer,
            &share_amount,
        );

        apply_holding_transfer(&env, asset_id, &seller, &buyer, share_amount);

        let shares_left = offer.shares - share_amount;
        if shares_left == 0 {
            env.storage()
                .persistent()
                .remove(&DataKey::ShareOffer(asset_id, seller.clone()));
            forget_offer_seller(&env, asset_id, &seller);
        } else {
            env.storage().persistent().set(
                &DataKey::ShareOffer(asset_id, seller.clone()),
                &ShareOffer {
                    shares: shares_left,
                    price_per_share: offer.price_per_share,
                },
            );
        }

        let mut fees: i128 = env
            .storage()
            .instance()
            .get(&DataKey::AccumulatedFees)
            .unwrap();
        fees += fee;
        env.storage()
            .instance()
            .set(&DataKey::AccumulatedFees, &fees);

        env.events().publish(
            (symbol_short!("sell_sh"), asset_id, seller, buyer),
            (share_amount, gross, fee),
        );
    }

    pub fn get_share_offer(env: Env, asset_id: u32, seller: Address) -> Option<ShareOffer> {
        env.storage()
            .persistent()
            .get(&DataKey::ShareOffer(asset_id, seller))
    }

    pub fn get_offer_sellers(env: Env, asset_id: u32) -> Vec<Address> {
        env.storage()
            .persistent()
            .get(&DataKey::OfferSellers(asset_id))
            .unwrap_or(Vec::new(&env))
    }

    pub fn get_pool(env: Env, asset_id: u32) -> AssetInvestmentPool {
        env.storage()
            .persistent()
            .get(&DataKey::Pool(asset_id))
            .expect("not found")
    }

    pub fn get_withdrawable_proceeds(env: Env, asset_id: u32) -> i128 {
        let pool: AssetInvestmentPool = env
            .storage()
            .persistent()
            .get(&DataKey::Pool(asset_id))
            .unwrap();
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
        let pool: AssetInvestmentPool = env
            .storage()
            .persistent()
            .get(&DataKey::Pool(asset_id))
            .unwrap();
        pool.total_shares - pool.sold_shares
    }

    pub fn quote_purchase(env: Env, asset_id: u32, share_amount: i128) -> (i128, i128, i128) {
        let pool: AssetInvestmentPool = env
            .storage()
            .persistent()
            .get(&DataKey::Pool(asset_id))
            .unwrap();
        let gross_cost = pool.price_per_share * share_amount;
        let fee_bps: i128 = env
            .storage()
            .instance()
            .get(&DataKey::ProtocolFeeBps)
            .unwrap();
        let fee = (gross_cost * fee_bps) / BPS_DENOMINATOR;
        let net_cost = gross_cost - fee;
        (gross_cost, fee, net_cost)
    }

    pub fn accumulated_fees(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::AccumulatedFees)
            .unwrap_or(0)
    }

    pub fn get_protocol_fee_bps(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::ProtocolFeeBps)
            .expect("not initialized")
    }

    pub fn set_purchases_paused(env: Env, caller: Address, paused: bool) {
        caller.require_auth();
        let admins: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Admins)
            .expect("not initialized");
        if !admins.contains(&caller) {
            panic!("not an admin");
        }
        env.storage()
            .instance()
            .set(&DataKey::PurchasesPaused, &paused);
        env.events().publish((symbol_short!("pause"),), paused);
    }

    pub fn get_purchases_paused(env: Env) -> bool {
        purchases_are_paused(&env)
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env, String};

    #[contract]
    struct MockUserRegistry;
    #[contractimpl]
    impl MockUserRegistry {
        pub fn is_verified(env: Env, user: Address) -> bool {
            env.storage().persistent().get(&user).unwrap_or(true)
        }
        pub fn set_verified(env: Env, user: Address, verified: bool) {
            env.storage().persistent().set(&user, &verified);
        }
    }

    #[contract]
    struct MockAssetRegistry;
    #[contractimpl]
    impl MockAssetRegistry {
        pub fn record_tokenization(
            _env: Env,
            _asset_id: u32,
            _rwa_issuer: Address,
            _total_shares: i128,
            _price_per_share: i128,
        ) {
        }
        pub fn record_shares_sold(_env: Env, _asset_id: u32, _share_amount: i128) {}
        pub fn close_asset(_env: Env, _asset_id: u32, _caller: Address) {}
        pub fn relist_asset(_env: Env, _asset_id: u32, _valuation: i128, _metadata_uri: String) {}
        pub fn get_relist_count(_env: Env, _asset_id: u32) -> u32 {
            1
        }
    }

    #[contract]
    struct MockToken;
    #[contractimpl]
    impl MockToken {
        pub fn approve(
            env: Env,
            from: Address,
            spender: Address,
            amount: i128,
            expiration_ledger: u32,
        ) {
            env.storage()
                .persistent()
                .set(&(from, spender), &(amount, expiration_ledger));
        }
        pub fn transfer_from(
            env: Env,
            _spender: Address,
            from: Address,
            to: Address,
            amount: i128,
        ) {
            Self::transfer(env, from, to, amount);
        }
        pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
            let count: u32 = env
                .storage()
                .instance()
                .get(&symbol_short!("xfers"))
                .unwrap_or(0);
            env.storage()
                .instance()
                .set(&symbol_short!("xfers"), &(count + 1));
            env.storage().instance().set(&symbol_short!("xfrom"), &from);
            env.storage().instance().set(&symbol_short!("xto"), &to);
            env.storage()
                .instance()
                .set(&symbol_short!("xamt"), &amount);
        }
        pub fn transfer_count(env: Env) -> u32 {
            env.storage()
                .instance()
                .get(&symbol_short!("xfers"))
                .unwrap_or(0)
        }
        pub fn last_transfer(env: Env) -> (Address, Address, i128) {
            (
                env.storage()
                    .instance()
                    .get(&symbol_short!("xfrom"))
                    .unwrap(),
                env.storage().instance().get(&symbol_short!("xto")).unwrap(),
                env.storage()
                    .instance()
                    .get(&symbol_short!("xamt"))
                    .unwrap(),
            )
        }
        pub fn balance(_env: Env, _addr: Address) -> i128 {
            1_000_000_000_i128
        }
    }

    fn setup(
        env: &Env,
    ) -> (
        VaulticInvestmentManagerClient,
        Address,
        Address,
        Address,
        Address,
    ) {
        env.mock_all_auths();
        let admin = Address::generate(env);
        let treasury = Address::generate(env);

        let registry_id = env.register_contract(None, MockAssetRegistry);
        let ur_id = env.register_contract(None, MockUserRegistry);
        let token_id = env.register_contract(None, MockToken);

        let im_id = env.register_contract(None, VaulticInvestmentManager);
        let client = VaulticInvestmentManagerClient::new(env, &im_id);
        client.initialize(
            &soroban_sdk::vec![env, admin.clone()],
            &registry_id,
            &ur_id,
            &token_id,
            &treasury,
            &250i128,
        );
        (client, admin, registry_id, ur_id, token_id)
    }

    fn open_pool(
        client: &VaulticInvestmentManagerClient,
        env: &Env,
        admin: &Address,
        asset_id: u32,
        total_shares: i128,
        price: i128,
        cap: i128,
    ) {
        let issuer = Address::generate(env);
        client.tokenize_asset(
            admin,
            &asset_id,
            &total_shares,
            &price,
            &cap,
            &issuer,
            &String::from_str(env, "VTGOLD"),
        );
    }

    #[test]
    fn test_initialize_stores_state() {
        let env = Env::default();
        let (client, admin, _, _, _) = setup(&env);
        let admins = client.get_admins();
        assert_eq!(admins.len(), 1);
        assert_eq!(admins.get(0).unwrap(), admin);
        assert_eq!(client.accumulated_fees(), 0);
    }

    #[test]
    #[should_panic(expected = "already initialized")]
    fn test_double_initialize_panics() {
        let env = Env::default();
        let (client, admin, reg, ur, tok) = setup(&env);
        let treasury = Address::generate(&env);
        client.initialize(
            &soroban_sdk::vec![&env, admin],
            &reg,
            &ur,
            &tok,
            &treasury,
            &100i128,
        );
    }

    #[test]
    #[should_panic(expected = "fee exceeds max (10%)")]
    fn test_fee_exceeds_max_on_initialize() {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let treasury = Address::generate(&env);
        let reg = env.register_contract(None, MockAssetRegistry);
        let ur = env.register_contract(None, MockUserRegistry);
        let tok = env.register_contract(None, MockToken);
        let im = env.register_contract(None, VaulticInvestmentManager);
        let client = VaulticInvestmentManagerClient::new(&env, &im);
        client.initialize(
            &soroban_sdk::vec![&env, admin],
            &reg,
            &ur,
            &tok,
            &treasury,
            &1_001i128,
        );
    }

    #[test]
    fn test_fee_math_quote_purchase() {
        let env = Env::default();
        let (client, admin, _, _, _) = setup(&env);
        open_pool(&client, &env, &admin, 1, 10_000, 100_0000000i128, 0);

        let (gross, fee, net) = client.quote_purchase(&1u32, &1i128);
        assert_eq!(gross, 100_0000000i128);
        assert_eq!(fee, 25_000000i128);
        assert_eq!(net, 975_000000i128);
    }

    #[test]
    fn test_available_shares_decrements_on_purchase() {
        let env = Env::default();
        let (client, admin, _, _, _) = setup(&env);
        open_pool(&client, &env, &admin, 1, 1_000, 10_0000000i128, 0);

        let investor = Address::generate(&env);
        client.purchase_shares(&investor, &1u32, &100i128);
        assert_eq!(client.available_shares(&1u32), 900i128);
    }

    #[test]
    #[should_panic(expected = "insufficient shares available")]
    fn test_over_subscription_panics() {
        let env = Env::default();
        let (client, admin, _, _, _) = setup(&env);
        open_pool(&client, &env, &admin, 1, 500, 10_0000000i128, 0);

        let investor = Address::generate(&env);
        client.purchase_shares(&investor, &1u32, &501i128);
    }

    #[test]
    #[should_panic(expected = "investor cap exceeded")]
    fn test_investor_cap_enforcement() {
        let env = Env::default();
        let (client, admin, _, _, _) = setup(&env);
        open_pool(&client, &env, &admin, 1, 10_000, 10_0000000i128, 100);

        let investor = Address::generate(&env);
        client.purchase_shares(&investor, &1u32, &101i128);
    }

    #[test]
    fn test_fully_subscribed_flag_set_on_last_share() {
        let env = Env::default();
        let (client, admin, _, _, _) = setup(&env);
        open_pool(&client, &env, &admin, 1, 10, 10_0000000i128, 0);

        let investor = Address::generate(&env);
        client.purchase_shares(&investor, &1u32, &10i128);
        let pool = client.get_pool(&1u32);
        assert!(pool.is_fully_subscribed);
    }

    #[test]
    fn test_accumulated_fees_after_purchase() {
        let env = Env::default();
        let (client, admin, _, _, _) = setup(&env);
        open_pool(&client, &env, &admin, 1, 10_000, 100_0000000i128, 0);

        let investor = Address::generate(&env);
        client.purchase_shares(&investor, &1u32, &1i128);
        assert_eq!(client.accumulated_fees(), 25_000000i128);
    }

    #[test]
    fn test_get_protocol_fee_bps() {
        let env = Env::default();
        let (client, admin, _, _, _) = setup(&env);
        assert_eq!(client.get_protocol_fee_bps(), 250i128);
        client.set_protocol_fee(&admin, &50i128);
        assert_eq!(client.get_protocol_fee_bps(), 50i128);
    }

    #[test]
    #[should_panic(expected = "not an admin")]
    fn test_set_protocol_fee_non_admin_panics() {
        let env = Env::default();
        let (client, _, _, _, _) = setup(&env);
        let stranger = Address::generate(&env);
        client.set_protocol_fee(&stranger, &100i128);
    }

    #[test]
    fn test_purchases_start_open_and_an_admin_can_resume_them() {
        let env = Env::default();
        let (client, admin, _, _, _) = setup(&env);
        assert!(!client.get_purchases_paused());
        client.set_purchases_paused(&admin, &true);
        assert!(client.get_purchases_paused());
        client.set_purchases_paused(&admin, &false);
        assert!(!client.get_purchases_paused());

        open_pool(&client, &env, &admin, 1, 10, 10_0000000i128, 0);
        let investor = Address::generate(&env);
        client.purchase_shares(&investor, &1u32, &1i128);
        assert_eq!(client.get_pool(&1u32).sold_shares, 1);
    }

    #[test]
    #[should_panic(expected = "purchases are paused")]
    fn test_paused_share_purchase_panics() {
        let env = Env::default();
        let (client, admin, _, _, _) = setup(&env);
        client.set_purchases_paused(&admin, &true);
        let investor = Address::generate(&env);
        client.purchase_shares(&investor, &1u32, &1i128);
    }

    #[test]
    #[should_panic(expected = "purchases are paused")]
    fn test_paused_whole_asset_purchase_panics() {
        let env = Env::default();
        let (client, admin, _, _, _) = setup(&env);
        client.set_purchases_paused(&admin, &true);
        let buyer = Address::generate(&env);
        client.purchase_whole_asset(&buyer, &1u32);
    }

    #[test]
    fn test_transfer_investor_holdings_moves_the_recorded_balance() {
        let env = Env::default();
        let (client, admin, _, _, _) = setup(&env);
        open_pool(&client, &env, &admin, 1, 1_000, 10_0000000i128, 0);
        let seller = Address::generate(&env);
        let buyer = Address::generate(&env);
        client.purchase_shares(&seller, &1u32, &100i128);

        client.transfer_investor_holdings(&seller, &buyer, &1u32, &40i128);

        assert_eq!(client.get_investor_holdings(&1u32, &seller), 60i128);
        assert_eq!(client.get_investor_holdings(&1u32, &buyer), 40i128);
        assert_eq!(client.available_shares(&1u32), 900i128);
        let holders = client.get_investor_list(&1u32);
        assert_eq!(holders.len(), 2);
    }

    #[test]
    fn test_transfer_investor_holdings_removes_a_seller_who_keeps_none() {
        let env = Env::default();
        let (client, admin, _, _, _) = setup(&env);
        open_pool(&client, &env, &admin, 1, 1_000, 10_0000000i128, 0);
        let seller = Address::generate(&env);
        let buyer = Address::generate(&env);
        client.purchase_shares(&seller, &1u32, &100i128);

        client.transfer_investor_holdings(&seller, &buyer, &1u32, &100i128);

        assert_eq!(client.get_investor_holdings(&1u32, &seller), 0i128);
        assert_eq!(client.get_investor_holdings(&1u32, &buyer), 100i128);
        let holders = client.get_investor_list(&1u32);
        assert_eq!(holders.len(), 1);
        assert_eq!(holders.get(0).unwrap(), buyer);
    }

    #[test]
    #[should_panic(expected = "insufficient holdings")]
    fn test_transfer_investor_holdings_cannot_exceed_the_balance() {
        let env = Env::default();
        let (client, admin, _, _, _) = setup(&env);
        open_pool(&client, &env, &admin, 1, 1_000, 10_0000000i128, 0);
        let seller = Address::generate(&env);
        let buyer = Address::generate(&env);
        client.purchase_shares(&seller, &1u32, &100i128);
        client.transfer_investor_holdings(&seller, &buyer, &1u32, &101i128);
    }

    #[test]
    #[should_panic(expected = "investor cap exceeded")]
    fn test_transfer_investor_holdings_respects_the_cap() {
        let env = Env::default();
        let (client, admin, _, _, _) = setup(&env);
        open_pool(&client, &env, &admin, 1, 1_000, 10_0000000i128, 50);
        let seller = Address::generate(&env);
        let buyer = Address::generate(&env);
        client.purchase_shares(&seller, &1u32, &40i128);
        client.purchase_shares(&buyer, &1u32, &20i128);
        client.transfer_investor_holdings(&seller, &buyer, &1u32, &31i128);
    }

    #[test]
    #[should_panic(expected = "investor not KYC verified")]
    fn test_transfer_investor_holdings_rejects_an_unverified_buyer() {
        let env = Env::default();
        let (client, admin, _, ur_id, _) = setup(&env);
        open_pool(&client, &env, &admin, 1, 1_000, 10_0000000i128, 0);
        let seller = Address::generate(&env);
        let buyer = Address::generate(&env);
        client.purchase_shares(&seller, &1u32, &100i128);
        MockUserRegistryClient::new(&env, &ur_id).set_verified(&buyer, &false);
        client.transfer_investor_holdings(&seller, &buyer, &1u32, &10i128);
    }

    fn open_resale(
        env: &Env,
        client: &VaulticInvestmentManagerClient,
        admin: &Address,
    ) -> (Address, Address) {
        open_pool(client, env, admin, 1, 1_000, 10_0000000i128, 0);
        let share_token = env.register_contract(None, MockToken);
        client.set_share_token(admin, &1u32, &share_token);
        let seller = Address::generate(env);
        let buyer = Address::generate(env);
        client.purchase_shares(&seller, &1u32, &100i128);
        (seller, buyer)
    }

    #[test]
    fn test_share_offer_can_be_cancelled_without_moving_shares() {
        let env = Env::default();
        let (client, admin, _, _, _) = setup(&env);
        let (seller, _) = open_resale(&env, &client, &admin);
        client.create_share_offer(&seller, &1u32, &40i128, &1_000i128);

        let offer = client.get_share_offer(&1u32, &seller).unwrap();
        assert_eq!(offer.shares, 40);
        assert_eq!(offer.price_per_share, 1_000);
        assert_eq!(client.get_investor_holdings(&1u32, &seller), 100);
        assert_eq!(client.get_offer_sellers(&1u32).len(), 1);

        client.cancel_share_offer(&seller, &1u32);
        assert!(client.get_share_offer(&1u32, &seller).is_none());
        assert_eq!(client.get_offer_sellers(&1u32).len(), 0);
        assert_eq!(client.get_investor_holdings(&1u32, &seller), 100);
    }

    #[test]
    fn test_fill_share_offer_pays_the_seller_and_moves_the_recorded_shares() {
        let env = Env::default();
        let (client, admin, _, _, token_id) = setup(&env);
        let (seller, buyer) = open_resale(&env, &client, &admin);
        client.create_share_offer(&seller, &1u32, &80i128, &1_000i128);
        let fees_before = client.accumulated_fees();
        let payment = MockTokenClient::new(&env, &token_id);
        let payment_before = payment.transfer_count();
        let share_token = client.get_share_token(&1u32).unwrap();
        let shares = MockTokenClient::new(&env, &share_token);

        client.fill_share_offer(&buyer, &seller, &1u32, &30i128);

        assert_eq!(client.get_investor_holdings(&1u32, &seller), 70);
        assert_eq!(client.get_investor_holdings(&1u32, &buyer), 30);
        assert_eq!(client.get_share_offer(&1u32, &seller).unwrap().shares, 50);
        assert_eq!(client.available_shares(&1u32), 900);
        assert_eq!(client.accumulated_fees(), fees_before + 750);
        assert_eq!(payment.transfer_count(), payment_before + 2);
        let (from, to, amount) = payment.last_transfer();
        assert_eq!(from, client.address);
        assert_eq!(to, seller);
        assert_eq!(amount, 29_250);
        let (share_from, share_to, share_amount) = shares.last_transfer();
        assert_eq!(share_from, seller);
        assert_eq!(share_to, buyer);
        assert_eq!(share_amount, 30);
    }

    #[test]
    fn test_fill_share_offer_removes_a_completed_offer() {
        let env = Env::default();
        let (client, admin, _, _, _) = setup(&env);
        let (seller, buyer) = open_resale(&env, &client, &admin);
        client.create_share_offer(&seller, &1u32, &40i128, &1_000i128);
        client.fill_share_offer(&buyer, &seller, &1u32, &40i128);
        assert!(client.get_share_offer(&1u32, &seller).is_none());
        assert_eq!(client.get_offer_sellers(&1u32).len(), 0);
        assert_eq!(client.get_investor_holdings(&1u32, &buyer), 40);
    }

    #[test]
    #[should_panic(expected = "insufficient offer")]
    fn test_fill_share_offer_cannot_exceed_the_offer() {
        let env = Env::default();
        let (client, admin, _, _, _) = setup(&env);
        let (seller, buyer) = open_resale(&env, &client, &admin);
        client.create_share_offer(&seller, &1u32, &10i128, &1_000i128);
        client.fill_share_offer(&buyer, &seller, &1u32, &11i128);
    }

    #[test]
    #[should_panic(expected = "insufficient holdings")]
    fn test_fill_share_offer_fails_when_the_seller_no_longer_holds_the_shares() {
        let env = Env::default();
        let (client, admin, _, _, _) = setup(&env);
        let (seller, buyer) = open_resale(&env, &client, &admin);
        let other = Address::generate(&env);
        client.create_share_offer(&seller, &1u32, &100i128, &1_000i128);
        client.transfer_investor_holdings(&seller, &other, &1u32, &90i128);
        client.fill_share_offer(&buyer, &seller, &1u32, &20i128);
    }

    #[test]
    #[should_panic(expected = "offer already open")]
    fn test_create_share_offer_rejects_a_second_open_offer() {
        let env = Env::default();
        let (client, admin, _, _, _) = setup(&env);
        let (seller, _) = open_resale(&env, &client, &admin);
        client.create_share_offer(&seller, &1u32, &10i128, &1_000i128);
        client.create_share_offer(&seller, &1u32, &10i128, &2_000i128);
    }

    #[test]
    #[should_panic(expected = "purchases are paused")]
    fn test_fill_share_offer_respects_the_pause() {
        let env = Env::default();
        let (client, admin, _, _, _) = setup(&env);
        let (seller, buyer) = open_resale(&env, &client, &admin);
        client.create_share_offer(&seller, &1u32, &10i128, &1_000i128);
        client.set_purchases_paused(&admin, &true);
        client.fill_share_offer(&buyer, &seller, &1u32, &10i128);
    }

    #[test]
    #[should_panic(expected = "share token is not set")]
    fn test_fill_share_offer_requires_the_share_token() {
        let env = Env::default();
        let (client, admin, _, _, _) = setup(&env);
        open_pool(&client, &env, &admin, 1, 1_000, 10_0000000i128, 0);
        let seller = Address::generate(&env);
        let buyer = Address::generate(&env);
        client.purchase_shares(&seller, &1u32, &100i128);
        client.create_share_offer(&seller, &1u32, &10i128, &1_000i128);
        client.fill_share_offer(&buyer, &seller, &1u32, &10i128);
    }

    #[test]
    #[should_panic(expected = "not an admin")]
    fn test_set_purchases_paused_non_admin_panics() {
        let env = Env::default();
        let (client, _, _, _, _) = setup(&env);
        let stranger = Address::generate(&env);
        client.set_purchases_paused(&stranger, &true);
    }
}
