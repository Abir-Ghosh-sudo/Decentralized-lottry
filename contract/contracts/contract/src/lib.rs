#![no_std]

use soroban_sdk::{contract, contractimpl, Env, Vec, Address, symbol_short};

#[contract]
pub struct LotteryContract;

#[contractimpl]
impl LotteryContract {

    pub fn init(env: Env, admin: Address) {
        admin.require_auth();
        env.storage().instance().set(&symbol_short!("ADMIN"), &admin);
    }

    pub fn enter(env: Env, user: Address) {
        user.require_auth();

        let key = symbol_short!("PLAYERS");
        let mut players: Vec<Address> = env
            .storage()
            .instance()
            .get(&key)
            .unwrap_or(Vec::new(&env));

        players.push_back(user);
        env.storage().instance().set(&key, &players);
    }

    pub fn get_players(env: Env) -> Vec<Address> {
        env.storage()
            .instance()
            .get(&symbol_short!("PLAYERS"))
            .unwrap_or(Vec::new(&env))
    }

    pub fn pick_winner(env: Env) -> Option<Address> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&symbol_short!("ADMIN"))
            .unwrap();

        admin.require_auth();

        let players: Vec<Address> = env
            .storage()
            .instance()
            .get(&symbol_short!("PLAYERS"))
            .unwrap_or(Vec::new(&env));

        if players.is_empty() {
            return None;
        }

        let winner = players.get(0).unwrap();

        // ✅ FIXED LINE
        env.storage().instance().set(&symbol_short!("PLAYERS"), &Vec::<Address>::new(&env));

        Some(winner)
    }
}