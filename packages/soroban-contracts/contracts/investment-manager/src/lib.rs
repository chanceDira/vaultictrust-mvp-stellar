#![no_std]
use soroban_sdk::{
    auth::{ContractContext, InvokerContractAuthEntry, SubContractInvocation},
    contract, contractimpl, contracttype, token, Address, BytesN, Env, IntoVal, Symbol, Vec, symbol_short,
    vec,
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
}

#[contract]
pub struct VaulticInvestmentManager;

const BPS_DENOMINATOR: i128 = 10_000;

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
        env.storage().instance().set(&DataKey::UserRegistry, &user_registry);
        env.storage().instance().set(&DataKey::PaymentToken, &payment_token);
        env.storage().instance().set(&DataKey::FeeTreasury, &fee_treasury);
        env.storage().instance().set(&DataKey::ProtocolFeeBps, &protocol_fee_bps);
        env.storage().instance().set(&DataKey::AccumulatedFees, &0i128);
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
        env.storage().instance().set(&DataKey::ProtocolFeeBps, &new_fee_bps);
    }

    pub fn set_fee_treasury(env: Env, caller: Address, new_treasury: Address) {
        caller.require_auth();
        let admins: Vec<Address> = env.storage().instance().get(&DataKey::Admins).unwrap();
        if !admins.contains(&caller) {
            panic!("not an admin");
        }
        env.storage().instance().set(&DataKey::FeeTreasury, &new_treasury);
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

    
    pub fn purchase_shares(env: Env, investor: Address, asset_id: u32, share_amount: i128) {
        investor.require_auth();

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

        let payment_addr: Address = env.storage().instance().get(&DataKey::PaymentToken).unwrap();
        let payment_client = token::Client::new(&env, &payment_addr);
        payment_client.transfer(&investor, &env.current_contract_address(), &gross_cost);

        pool.sold_shares += share_amount;
        pool.proceeds_collected += net_cost;
        if pool.sold_shares >= pool.total_shares {
            pool.is_fully_subscribed = true;
        }

        let mut fees: i128 = env.storage().instance().get(&DataKey::AccumulatedFees).unwrap();
        fees += fee;
        env.storage().instance().set(&DataKey::AccumulatedFees, &fees);

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
            env.storage().persistent().set(&DataKey::InvestorList(asset_id), &investor_list);
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

        env.storage().persistent().set(&DataKey::Pool(asset_id), &pool);

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

        let mut fees: i128 = env.storage().instance().get(&DataKey::AccumulatedFees).unwrap();
        fees += fee;
        env.storage().instance().set(&DataKey::AccumulatedFees, &fees);

        let payment_addr: Address = env.storage().instance().get(&DataKey::PaymentToken).unwrap();
        let payment_client = token::Client::new(&env, &payment_addr);
        payment_client.transfer(&buyer, &env.current_contract_address(), &gross_payment);
        payment_client.transfer(&env.current_contract_address(), &asset.asset_owner, &net_to_seller);

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
        env.storage().persistent().set(&DataKey::Pool(asset_id), &pool);

        let payment_addr: Address = env.storage().instance().get(&DataKey::PaymentToken).unwrap();
        let payment_client = token::Client::new(&env, &payment_addr);
        payment_client.transfer(&env.current_contract_address(), &asset.asset_owner, &withdrawable);

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
        env.storage().persistent().set(&DataKey::Pool(asset_id), &pool);

        env.storage().persistent().set(&DataKey::InvestorList(asset_id), &Vec::<Address>::new(&env));

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

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{
        testutils::Address as _,
        Env, String,
    };

    #[contract]
    struct MockUserRegistry;
    #[contractimpl]
    impl MockUserRegistry {
        pub fn is_verified(_env: Env, _user: Address) -> bool {
            true
        }
    }

    #[contract]
    struct MockAssetRegistry;
    #[contractimpl]
    impl MockAssetRegistry {
        pub fn record_tokenization(_env: Env, _asset_id: u32, _rwa_issuer: Address, _total_shares: i128, _price_per_share: i128) {}
        pub fn record_shares_sold(_env: Env, _asset_id: u32, _share_amount: i128) {}
        pub fn close_asset(_env: Env, _asset_id: u32, _caller: Address) {}
        pub fn relist_asset(_env: Env, _asset_id: u32, _valuation: i128, _metadata_uri: String) {}
        pub fn get_relist_count(_env: Env, _asset_id: u32) -> u32 { 1 }
    }

    #[contract]
    struct MockToken;
    #[contractimpl]
    impl MockToken {
        pub fn transfer(_env: Env, _from: Address, _to: Address, _amount: i128) {}
        pub fn balance(_env: Env, _addr: Address) -> i128 { 1_000_000_000_i128 }
    }

    fn setup(env: &Env) -> (VaulticInvestmentManagerClient, Address, Address, Address, Address) {
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

    fn open_pool(client: &VaulticInvestmentManagerClient, env: &Env, admin: &Address, asset_id: u32, total_shares: i128, price: i128, cap: i128) {
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
    #[should_panic(expected = "not an admin")]
    fn test_set_protocol_fee_non_admin_panics() {
        let env = Env::default();
        let (client, _, _, _, _) = setup(&env);
        let stranger = Address::generate(&env);
        client.set_protocol_fee(&stranger, &100i128);
    }
}
