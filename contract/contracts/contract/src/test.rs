#![cfg(test)]

use crate::{LotteryContract, LotteryContractClient};
use soroban_sdk::{
    testutils::{Address as _, Ledger, LedgerInfo},
    token, Address, Env,
};

// Helper to create a test token
fn create_token<'a>(env: &Env, admin: &Address) -> token::Client<'a> {
    let token_address = env.register_stellar_asset_contract_v2(admin.clone());
    token::Client::new(env, &token_address.address())
}

// Helper to setup the test environment
fn setup_test() -> (
    Env,
    LotteryContractClient<'static>,
    token::Client<'static>,
    Address,
) {
    let env = Env::default();
    env.mock_all_auths();

    // Register the lottery contract
    let contract_id = env.register(LotteryContract, ());
    let client = LotteryContractClient::new(&env, &contract_id);

    // Create token and admin
    let token_admin = Address::generate(&env);
    let token = create_token(&env, &token_admin);

    (env, client, token, token_admin)
}

// Helper to mint tokens to an address
fn mint_tokens(env: &Env, token: &token::Client, _admin: &Address, to: &Address, amount: i128) {
    let admin_client = token::StellarAssetClient::new(env, &token.address);
    admin_client.mint(to, &amount);
}

// Helper to create a ledger info with the correct protocol version
fn make_ledger_info(sequence_number: u32) -> LedgerInfo {
    LedgerInfo {
        timestamp: 0,
        protocol_version: 25,
        sequence_number,
        network_id: Default::default(),
        base_reserve: 10,
        min_temp_entry_ttl: 100,
        min_persistent_entry_ttl: 100,
        max_entry_ttl: 1000,
    }
}

// ==================== INITIALIZATION TESTS ====================

#[test]
fn test_init() {
    let (_env, client, token, _admin) = setup_test();
    let ticket_price: i128 = 100;

    client.init(&token.address, &ticket_price);

    assert_eq!(client.get_token(), token.address);
    assert_eq!(client.get_ticket_price(), ticket_price);
    assert_eq!(client.get_player_count(), 0);
    assert_eq!(client.get_pot(), 0);
    assert_eq!(client.get_total_rounds(), 0);
    assert_eq!(client.get_total_prizes(), 0);
}

#[test]
#[should_panic(expected = "already initialized")]
fn test_cannot_init_twice() {
    let (_env, client, token, _admin) = setup_test();

    client.init(&token.address, &100);
    client.init(&token.address, &200); // Should panic
}

#[test]
#[should_panic(expected = "ticket price must be positive")]
fn test_init_requires_positive_price() {
    let (_env, client, token, _admin) = setup_test();

    client.init(&token.address, &0); // Should panic
}

// ==================== ENTRY TESTS ====================

#[test]
fn test_enter_lottery() {
    let (env, client, token, admin) = setup_test();
    let ticket_price: i128 = 100;

    client.init(&token.address, &ticket_price);

    let player1 = Address::generate(&env);
    let player2 = Address::generate(&env);

    // Mint tokens to players
    mint_tokens(&env, &token, &admin, &player1, 1000);
    mint_tokens(&env, &token, &admin, &player2, 1000);

    // Enter lottery
    client.enter(&player1);
    assert_eq!(client.get_player_count(), 1);
    assert_eq!(client.get_pot(), ticket_price);
    assert!(client.has_entered(&player1));
    assert!(!client.has_entered(&player2));

    client.enter(&player2);
    assert_eq!(client.get_player_count(), 2);
    assert_eq!(client.get_pot(), ticket_price * 2);
    assert!(client.has_entered(&player2));

    // Verify token transfers
    assert_eq!(token.balance(&player1), 1000 - ticket_price);
    assert_eq!(token.balance(&player2), 1000 - ticket_price);
    assert_eq!(token.balance(&client.address), ticket_price * 2);
}

#[test]
#[should_panic(expected = "already entered this round")]
fn test_cannot_enter_twice_same_round() {
    let (env, client, token, admin) = setup_test();

    client.init(&token.address, &100);

    let player = Address::generate(&env);
    mint_tokens(&env, &token, &admin, &player, 1000);

    client.enter(&player);
    client.enter(&player); // Should panic
}

#[test]
fn test_get_players_list() {
    let (env, client, token, admin) = setup_test();

    client.init(&token.address, &100);

    let player1 = Address::generate(&env);
    let player2 = Address::generate(&env);
    let player3 = Address::generate(&env);

    mint_tokens(&env, &token, &admin, &player1, 1000);
    mint_tokens(&env, &token, &admin, &player2, 1000);
    mint_tokens(&env, &token, &admin, &player3, 1000);

    client.enter(&player1);
    client.enter(&player2);
    client.enter(&player3);

    let players = client.get_players();
    assert_eq!(players.len(), 3);
    assert_eq!(players.get(0).unwrap(), player1);
    assert_eq!(players.get(1).unwrap(), player2);
    assert_eq!(players.get(2).unwrap(), player3);
}

// ==================== DRAW TESTS ====================

#[test]
#[should_panic(expected = "need at least 2 players")]
fn test_cannot_draw_without_enough_players() {
    let (env, client, token, admin) = setup_test();

    client.init(&token.address, &100);

    let player = Address::generate(&env);
    mint_tokens(&env, &token, &admin, &player, 1000);

    client.enter(&player);

    // Advance ledger past min duration
    env.ledger().set(make_ledger_info(100));

    client.draw(); // Should panic - only 1 player
}

#[test]
#[should_panic(expected = "round not ready for draw yet")]
fn test_cannot_draw_too_early() {
    let (env, client, token, admin) = setup_test();

    client.init(&token.address, &100);

    let player1 = Address::generate(&env);
    let player2 = Address::generate(&env);

    mint_tokens(&env, &token, &admin, &player1, 1000);
    mint_tokens(&env, &token, &admin, &player2, 1000);

    client.enter(&player1);
    client.enter(&player2);

    // Don't advance ledger - should fail
    client.draw();
}

#[test]
fn test_draw_winner() {
    let (env, client, token, admin) = setup_test();
    let ticket_price: i128 = 100;

    client.init(&token.address, &ticket_price);

    let player1 = Address::generate(&env);
    let player2 = Address::generate(&env);
    let player3 = Address::generate(&env);

    mint_tokens(&env, &token, &admin, &player1, 1000);
    mint_tokens(&env, &token, &admin, &player2, 1000);
    mint_tokens(&env, &token, &admin, &player3, 1000);

    client.enter(&player1);
    client.enter(&player2);
    client.enter(&player3);

    let pot_before_draw = client.get_pot();
    assert_eq!(pot_before_draw, ticket_price * 3);

    // Advance ledger past min duration (60 ledgers)
    env.ledger().set(make_ledger_info(100));

    let winner = client.draw();

    // Winner should be one of the players
    assert!(winner == player1 || winner == player2 || winner == player3);

    // Winner should have received the pot
    let winner_balance = token.balance(&winner);
    // Winner started with 1000, paid 100, won 300 = 1200
    assert_eq!(winner_balance, 1000 - ticket_price + pot_before_draw);

    // Lottery should be reset
    assert_eq!(client.get_player_count(), 0);
    assert_eq!(client.get_pot(), 0);
    assert_eq!(client.get_total_rounds(), 1);
    assert_eq!(client.get_total_prizes(), pot_before_draw);
}

#[test]
fn test_can_draw_check() {
    let (env, client, token, admin) = setup_test();

    client.init(&token.address, &100);

    // No players - can't draw
    assert!(!client.can_draw());

    let player1 = Address::generate(&env);
    let player2 = Address::generate(&env);

    mint_tokens(&env, &token, &admin, &player1, 1000);
    mint_tokens(&env, &token, &admin, &player2, 1000);

    client.enter(&player1);
    // 1 player, not enough time - can't draw
    assert!(!client.can_draw());

    client.enter(&player2);
    // 2 players but not enough time - can't draw
    assert!(!client.can_draw());

    // Advance ledger
    env.ledger().set(make_ledger_info(100));

    // Now can draw
    assert!(client.can_draw());
}

#[test]
fn test_ledgers_until_draw() {
    let (env, client, token, admin) = setup_test();

    // Set initial ledger
    env.ledger().set(make_ledger_info(10));

    client.init(&token.address, &100);

    let player = Address::generate(&env);
    mint_tokens(&env, &token, &admin, &player, 1000);

    client.enter(&player);

    // Round started at ledger 10, min duration is 60
    // So need to reach ledger 70
    assert_eq!(client.ledgers_until_draw(), 60);

    // Advance to ledger 50
    env.ledger().set(make_ledger_info(50));

    assert_eq!(client.ledgers_until_draw(), 20);

    // Advance past target
    env.ledger().set(make_ledger_info(100));

    assert_eq!(client.ledgers_until_draw(), 0);
}

// ==================== MULTIPLE ROUNDS TESTS ====================

#[test]
fn test_multiple_rounds() {
    let (env, client, token, admin) = setup_test();
    let ticket_price: i128 = 100;

    client.init(&token.address, &ticket_price);

    let player1 = Address::generate(&env);
    let player2 = Address::generate(&env);

    mint_tokens(&env, &token, &admin, &player1, 10000);
    mint_tokens(&env, &token, &admin, &player2, 10000);

    // Round 1
    client.enter(&player1);
    client.enter(&player2);

    env.ledger().set(make_ledger_info(100));

    let _winner1 = client.draw();
    assert_eq!(client.get_total_rounds(), 1);
    assert_eq!(client.get_total_prizes(), ticket_price * 2);

    // Round 2 - same players can enter again
    client.enter(&player1);
    client.enter(&player2);
    assert_eq!(client.get_player_count(), 2);

    env.ledger().set(make_ledger_info(200));

    let _winner2 = client.draw();
    assert_eq!(client.get_total_rounds(), 2);
    assert_eq!(client.get_total_prizes(), ticket_price * 4);
    assert_eq!(client.get_player_count(), 0);
}

// ==================== VIEW FUNCTION TESTS ====================

#[test]
fn test_get_min_players() {
    let (_env, client, token, _admin) = setup_test();
    client.init(&token.address, &100);
    assert_eq!(client.get_min_players(), 2);
}

#[test]
fn test_get_min_round_duration() {
    let (_env, client, token, _admin) = setup_test();
    client.init(&token.address, &100);
    assert_eq!(client.get_min_round_duration(), 60);
}

// ==================== PERMISSIONLESS VERIFICATION ====================

#[test]
fn test_anyone_can_trigger_draw() {
    let (env, client, token, admin) = setup_test();
    let ticket_price: i128 = 100;

    client.init(&token.address, &ticket_price);

    let player1 = Address::generate(&env);
    let player2 = Address::generate(&env);
    let _random_caller = Address::generate(&env); // Someone who didn't enter

    mint_tokens(&env, &token, &admin, &player1, 1000);
    mint_tokens(&env, &token, &admin, &player2, 1000);

    client.enter(&player1);
    client.enter(&player2);

    env.ledger().set(make_ledger_info(100));

    // Draw doesn't require auth - anyone can call it
    // The draw function doesn't take a caller address, it's truly permissionless
    let winner = client.draw();
    assert!(winner == player1 || winner == player2);
}

#[test]
fn test_statistics_accumulate() {
    let (env, client, token, admin) = setup_test();
    let ticket_price: i128 = 50;

    client.init(&token.address, &ticket_price);

    let player1 = Address::generate(&env);
    let player2 = Address::generate(&env);
    let player3 = Address::generate(&env);

    mint_tokens(&env, &token, &admin, &player1, 100000);
    mint_tokens(&env, &token, &admin, &player2, 100000);
    mint_tokens(&env, &token, &admin, &player3, 100000);

    let mut total_distributed: i128 = 0;

    // Run 5 rounds with varying players
    for round in 0..5u32 {
        let num_players = 2 + (round % 3); // 2, 3, 4, 2, 3 players

        client.enter(&player1);
        client.enter(&player2);
        if num_players >= 3 {
            client.enter(&player3);
        }

        let pot = client.get_pot();
        total_distributed += pot;

        env.ledger().set(make_ledger_info((round + 1) * 100));

        client.draw();
    }

    assert_eq!(client.get_total_rounds(), 5);
    assert_eq!(client.get_total_prizes(), total_distributed);
}
