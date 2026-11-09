#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, token, Address, BytesN, Env, Vec, symbol_short,
};

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

#[contracttype]
#[derive(Clone, Debug)]
pub struct YieldRound {
    pub asset_id: u32,
    pub total_yield: i128,
    pub total_shares_snapshot: i128,
    pub deposited_at: u64,
    pub round_index: u32,
}

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

        if amount <= 0 {
            panic!("invalid yield amount");
        }
        if total_shares_outstanding <= 0 {
            panic!("no shares outstanding");
        }

        let payment_addr: Address =
            env.storage().instance().get(&DataKey::PaymentToken).unwrap();
        let payment_client = token::Client::new(&env, &payment_addr);
        payment_client.transfer(&caller, &env.current_contract_address(), &amount);

        let round_count: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::YieldRoundCount(asset_id))
            .unwrap_or(0);
        let yield_round = YieldRound {
            asset_id,
            total_yield: amount,
            total_shares_snapshot: total_shares_outstanding,
            deposited_at: env.ledger().timestamp(),
            round_index: round_count,
        };

        env.storage()
            .persistent()
            .set(&DataKey::YieldRound(asset_id, round_count), &yield_round);
        env.storage()
            .persistent()
            .set(&DataKey::YieldRoundCount(asset_id), &(round_count + 1));

        env.events().publish((symbol_short!("yld_dep"), asset_id, caller), amount);
    }

    pub fn claim_yield(env: Env, investor: Address, asset_id: u32, round_index: u32) {
        investor.require_auth();

        let ur_addr: Address =
            env.storage().instance().get(&DataKey::UserRegistry).unwrap();
        let ur_client = user_registry::Client::new(&env, &ur_addr);
        if !ur_client.is_verified(&investor) {
            panic!("investor not KYC verified");
        }

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

        let im_addr: Address =
            env.storage().instance().get(&DataKey::InvestmentManager).unwrap();
        let im_client = investment_manager::Client::new(&env, &im_addr);
        let investor_shares = im_client.get_investor_holdings(&asset_id, &investor);

        if investor_shares <= 0 {
            panic!("no shares held");
        }

        let investor_yield =
            (investor_shares * yield_round.total_yield) / yield_round.total_shares_snapshot;
        if investor_yield <= 0 {
            panic!("yield too small");
        }

        env.storage()
            .persistent()
            .set(&DataKey::Claimed(asset_id, round_index, investor.clone()), &true);

        let payment_addr: Address =
            env.storage().instance().get(&DataKey::PaymentToken).unwrap();
        let payment_client = token::Client::new(&env, &payment_addr);
        payment_client.transfer(&env.current_contract_address(), &investor, &investor_yield);

        env.events().publish(
            (symbol_short!("yld_clm"), asset_id, investor),
            investor_yield,
        );
    }

    pub fn claim_all_yield(env: Env, investor: Address, asset_id: u32) -> i128 {
        investor.require_auth();

        let ur_addr: Address =
            env.storage().instance().get(&DataKey::UserRegistry).unwrap();
        let ur_client = user_registry::Client::new(&env, &ur_addr);
        if !ur_client.is_verified(&investor) {
            panic!("investor not KYC verified");
        }

        let round_count: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::YieldRoundCount(asset_id))
            .unwrap_or(0);
        if round_count == 0 {
            return 0;
        }

        let im_addr: Address =
            env.storage().instance().get(&DataKey::InvestmentManager).unwrap();
        let im_client = investment_manager::Client::new(&env, &im_addr);
        let investor_shares = im_client.get_investor_holdings(&asset_id, &investor);
        if investor_shares <= 0 {
            panic!("no shares held");
        }

        let payment_addr: Address =
            env.storage().instance().get(&DataKey::PaymentToken).unwrap();
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
                .unwrap();
            let investor_yield =
                (investor_shares * yield_round.total_yield) / yield_round.total_shares_snapshot;

            if investor_yield > 0 {
                env.storage()
                    .persistent()
                    .set(&DataKey::Claimed(asset_id, i, investor.clone()), &true);
                payment_client.transfer(
                    &env.current_contract_address(),
                    &investor,
                    &investor_yield,
                );
                total_claimed += investor_yield;
            }
        }
        env.events()
            .publish((symbol_short!("yld_all"), asset_id, investor), total_claimed);
        total_claimed
    }

    pub fn get_yield_round_count(env: Env, asset_id: u32) -> u32 {
        env.storage()
            .persistent()
            .get(&DataKey::YieldRoundCount(asset_id))
            .unwrap_or(0)
    }

    pub fn get_claimable_yield(env: Env, asset_id: u32, investor: Address) -> i128 {
        let round_count: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::YieldRoundCount(asset_id))
            .unwrap_or(0);
        let im_addr: Address =
            env.storage().instance().get(&DataKey::InvestmentManager).unwrap();
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
            if !claimed {
                let round: YieldRound = env
                    .storage()
                    .persistent()
                    .get(&DataKey::YieldRound(asset_id, i))
                    .unwrap();
                total += (investor_shares * round.total_yield) / round.total_shares_snapshot;
            }
        }
        total
    }

    pub fn set_admins(env: Env, caller: Address, new_admins: Vec<Address>) {
        caller.require_auth();
        let admins: Vec<Address> =
            env.storage().instance().get(&DataKey::Admins).expect("not initialized");
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
        let admins: Vec<Address> =
            env.storage().instance().get(&DataKey::Admins).expect("not initialized");
        if !admins.contains(&caller) {
            panic!("not an admin");
        }
        env.deployer().update_current_contract_wasm(new_wasm_hash);
    }

    pub fn get_admins(env: Env) -> Vec<Address> {
        env.storage().instance().get(&DataKey::Admins).expect("not initialized")
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    #[contract]
    struct MockUserRegistry;
    #[contractimpl]
    impl MockUserRegistry {
        pub fn is_verified(_env: Env, _user: Address) -> bool {
            true
        }
    }

    #[contract]
    struct MockInvestmentManager;
    #[contractimpl]
    impl MockInvestmentManager {
        pub fn get_investor_holdings(env: Env, asset_id: u32, investor: Address) -> i128 {
            env.storage()
                .persistent()
                .get(&(asset_id, investor))
                .unwrap_or(0i128)
        }
        pub fn set_holdings(env: Env, asset_id: u32, investor: Address, amount: i128) {
            env.storage().persistent().set(&(asset_id, investor), &amount);
        }
    }

    #[contract]
    struct MockToken;
    #[contractimpl]
    impl MockToken {
        pub fn transfer(_env: Env, _from: Address, _to: Address, _amount: i128) {}
        pub fn balance(_env: Env, _addr: Address) -> i128 { 1_000_000_000_i128 }
    }

    fn setup(env: &Env) -> (VaulticDividendManagerClient, Address, Address, Address) {
        env.mock_all_auths();
        let admin = Address::generate(env);
        let im_id = env.register_contract(None, MockInvestmentManager);
        let ur_id = env.register_contract(None, MockUserRegistry);
        let tok_id = env.register_contract(None, MockToken);

        let dm_id = env.register_contract(None, VaulticDividendManager);
        let client = VaulticDividendManagerClient::new(env, &dm_id);
        client.initialize(
            &soroban_sdk::vec![env, admin.clone()],
            &im_id,
            &ur_id,
            &tok_id,
        );
        (client, admin, im_id, tok_id)
    }

    #[test]
    fn test_initialize_stores_admins() {
        let env = Env::default();
        let (client, admin, _, _) = setup(&env);
        let admins = client.get_admins();
        assert_eq!(admins.len(), 1);
        assert_eq!(admins.get(0).unwrap(), admin);
    }

    #[test]
    #[should_panic(expected = "already initialized")]
    fn test_double_initialize_panics() {
        let env = Env::default();
        let (client, admin, im, tok) = setup(&env);
        let ur = env.register_contract(None, MockUserRegistry);
        client.initialize(&soroban_sdk::vec![&env, admin], &im, &ur, &tok);
    }

    #[test]
    fn test_yield_round_count_starts_at_zero() {
        let env = Env::default();
        let (client, _, _, _) = setup(&env);
        assert_eq!(client.get_yield_round_count(&1u32), 0u32);
    }

    #[test]
    fn test_deposit_yield_increments_round_count() {
        let env = Env::default();
        let (client, admin, _, _) = setup(&env);
        client.deposit_yield(&admin, &1u32, &1_000_0000000i128, &10_000i128);
        assert_eq!(client.get_yield_round_count(&1u32), 1u32);
    }

    #[test]
    fn test_claimable_yield_math() {
        let env = Env::default();
        let (client, admin, im_id, _) = setup(&env);

        let investor = Address::generate(&env);
        let im_client = MockInvestmentManagerClient::new(&env, &im_id);
        im_client.set_holdings(&1u32, &investor, &500i128);

        client.deposit_yield(&admin, &1u32, &10_000_0000000i128, &10_000i128);

        let claimable = client.get_claimable_yield(&1u32, &investor);
        assert_eq!(claimable, 500_0000000i128);
    }

    #[test]
    #[should_panic(expected = "already claimed")]
    fn test_double_claim_rejection() {
        let env = Env::default();
        let (client, admin, im_id, _) = setup(&env);

        let investor = Address::generate(&env);
        let im_client = MockInvestmentManagerClient::new(&env, &im_id);
        im_client.set_holdings(&1u32, &investor, &1_000i128);

        client.deposit_yield(&admin, &1u32, &10_000_0000000i128, &10_000i128);

        client.claim_yield(&investor, &1u32, &0u32);
        client.claim_yield(&investor, &1u32, &0u32);
    }

    #[test]
    fn test_multi_round_claiming() {
        let env = Env::default();
        let (client, admin, im_id, _) = setup(&env);

        let investor = Address::generate(&env);
        let im_client = MockInvestmentManagerClient::new(&env, &im_id);
        im_client.set_holdings(&1u32, &investor, &1_000i128);

        client.deposit_yield(&admin, &1u32, &10_000_0000000i128, &10_000i128);
        client.deposit_yield(&admin, &1u32, &5_000_0000000i128, &10_000i128);

        assert_eq!(client.get_yield_round_count(&1u32), 2u32);

        let total = client.claim_all_yield(&investor, &1u32);
        let expected = (1_000i128 * 10_000_0000000i128) / 10_000i128
            + (1_000i128 * 5_000_0000000i128) / 10_000i128;
        assert_eq!(total, expected);

        assert_eq!(client.get_claimable_yield(&1u32, &investor), 0i128);
    }

    #[test]
    fn test_claimable_zero_after_claim_all() {
        let env = Env::default();
        let (client, admin, im_id, _) = setup(&env);

        let investor = Address::generate(&env);
        let im_client = MockInvestmentManagerClient::new(&env, &im_id);
        im_client.set_holdings(&1u32, &investor, &2_000i128);

        client.deposit_yield(&admin, &1u32, &20_000_0000000i128, &10_000i128);
        client.claim_all_yield(&investor, &1u32);

        assert_eq!(client.get_claimable_yield(&1u32, &investor), 0i128);
    }
}
