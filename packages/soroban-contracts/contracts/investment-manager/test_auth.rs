use soroban_sdk::{Env, Address, Symbol, vec, auth::{InvokerContractAuthEntry, SubContractInvocation, ContractContext}, IntoVal};

fn fix(env: &Env, registry_addr: &Address, asset_id: u32, rwa_issuer: Address, total_shares: i128, price_per_share: i128) {
    env.authorize_as_current_contract(vec![
        &env,
        InvokerContractAuthEntry::Contract(SubContractInvocation {
            context: ContractContext {
                contract: registry_addr.clone(),
                fn_name: Symbol::new(&env, "record_tokenization"),
                args: (asset_id, rwa_issuer, total_shares, price_per_share).into_val(env),
            },
            sub_invocations: vec![&env],
        })
    ]);
}
