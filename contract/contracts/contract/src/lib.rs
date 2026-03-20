#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token, Address, Env, Vec,
};

#[contracttype]
#[derive(Clone)]
pub struct InitEvent {
    pub token: Address,
    pub ticket_price: i128,
}

#[contracttype]
#[derive(Clone)]
pub struct EnterEvent {
    pub player: Address,
    pub player_count: u32,
    pub pot: i128,
}

#[contracttype]
#[derive(Clone)]
pub struct DrawEvent {
    pub winner: Address,
    pub pot: i128,
    pub round: u64,
}

/// Contract errors for better error handling
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum LotteryError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    InvalidTicketPrice = 3,
    AlreadyEntered = 4,
    NotEnoughPlayers = 5,
    RoundNotReady = 6,
}

/// Minimum number of players required to draw
const MIN_PLAYERS: u32 = 2;

/// Minimum time (in ledger sequence numbers) between draws
/// ~5 minutes assuming ~5 seconds per ledger
const MIN_ROUND_DURATION: u32 = 60;

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// The token used for ticket purchases and prizes
    Token,
    /// Price per lottery ticket
    TicketPrice,
    /// List of players in current round
    Players,
    /// Total pot for current round
    Pot,
    /// Ledger sequence when current round started
    RoundStart,
    /// Total number of rounds completed
    TotalRounds,
    /// Total prizes distributed (all time)
    TotalPrizes,
}

#[contract]
pub struct LotteryContract;

#[contractimpl]
impl LotteryContract {
    // ==================== INITIALIZATION ====================
    // Note: This is NOT an admin function - it simply sets initial params
    // and can only be called once. After init, contract is fully permissionless.

    /// Initialize the lottery with token and ticket price.
    /// Can only be called once. After this, the contract is fully permissionless.
    pub fn init(env: Env, token: Address, ticket_price: i128) {
        // Ensure not already initialized
        if env.storage().instance().has(&DataKey::Token) {
            panic!("already initialized");
        }

        if ticket_price <= 0 {
            panic!("ticket price must be positive");
        }

        // Set immutable configuration
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage()
            .instance()
            .set(&DataKey::TicketPrice, &ticket_price);

        // Initialize round state
        env.storage()
            .instance()
            .set(&DataKey::Players, &Vec::<Address>::new(&env));
        env.storage().instance().set(&DataKey::Pot, &0i128);
        env.storage()
            .instance()
            .set(&DataKey::RoundStart, &env.ledger().sequence());
        env.storage().instance().set(&DataKey::TotalRounds, &0u64);
        env.storage().instance().set(&DataKey::TotalPrizes, &0i128);

        // Emit initialization event
        env.events().publish(
            (symbol_short!("init"),),
            InitEvent {
                token,
                ticket_price,
            },
        );
    }

    // ==================== PERMISSIONLESS ACTIONS ====================

    /// Enter the lottery by purchasing a ticket.
    /// Anyone can call this - just needs to pay the ticket price.
    /// The player must have approved the contract to transfer tokens.
    pub fn enter(env: Env, player: Address) {
        // Player must authorize this action
        player.require_auth();

        // Get config
        let token: Address = env
            .storage()
            .instance()
            .get(&DataKey::Token)
            .expect("not initialized");
        let ticket_price: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TicketPrice)
            .expect("not initialized");

        // Get current players
        let mut players: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Players)
            .unwrap_or(Vec::new(&env));

        // Check player hasn't already entered this round
        for p in players.iter() {
            if p == player {
                panic!("already entered this round");
            }
        }

        // Transfer ticket price from player to contract
        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&player, &env.current_contract_address(), &ticket_price);

        // Add player to list
        players.push_back(player.clone());

        // Update pot
        let pot: i128 = env.storage().instance().get(&DataKey::Pot).unwrap_or(0);
        let new_pot = pot + ticket_price;

        // Save state
        env.storage().instance().set(&DataKey::Players, &players);
        env.storage().instance().set(&DataKey::Pot, &new_pot);

        // If this is the first player, start a new round timer
        if players.len() == 1 {
            env.storage()
                .instance()
                .set(&DataKey::RoundStart, &env.ledger().sequence());
        }

        // Emit entry event
        env.events().publish(
            (symbol_short!("enter"),),
            EnterEvent {
                player,
                player_count: players.len(),
                pot: new_pot,
            },
        );
    }

    /// Draw a winner and distribute the prize.
    /// Anyone can call this when conditions are met:
    /// 1. At least MIN_PLAYERS have entered
    /// 2. At least MIN_ROUND_DURATION ledgers have passed since round start
    pub fn draw(env: Env) -> Address {
        let players: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Players)
            .unwrap_or(Vec::new(&env));

        // Check minimum players
        if players.len() < MIN_PLAYERS {
            panic!("need at least 2 players");
        }

        // Check minimum time has passed
        let round_start: u32 = env
            .storage()
            .instance()
            .get(&DataKey::RoundStart)
            .unwrap_or(0);
        let current_ledger = env.ledger().sequence();

        if current_ledger < round_start + MIN_ROUND_DURATION {
            panic!("round not ready for draw yet");
        }

        // Get pot and token
        let pot: i128 = env.storage().instance().get(&DataKey::Pot).unwrap_or(0);
        let token: Address = env
            .storage()
            .instance()
            .get(&DataKey::Token)
            .expect("not initialized");

        // Select winner using PRNG
        let random_index: u64 = env.prng().gen_range(0..players.len() as u64);
        let winner = players.get(random_index as u32).unwrap();

        // Transfer prize to winner
        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&env.current_contract_address(), &winner, &pot);

        // Update statistics
        let total_rounds: u64 = env
            .storage()
            .instance()
            .get(&DataKey::TotalRounds)
            .unwrap_or(0);
        let total_prizes: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalPrizes)
            .unwrap_or(0);

        env.storage()
            .instance()
            .set(&DataKey::TotalRounds, &(total_rounds + 1));
        env.storage()
            .instance()
            .set(&DataKey::TotalPrizes, &(total_prizes + pot));

        // Reset for next round
        env.storage()
            .instance()
            .set(&DataKey::Players, &Vec::<Address>::new(&env));
        env.storage().instance().set(&DataKey::Pot, &0i128);
        env.storage()
            .instance()
            .set(&DataKey::RoundStart, &env.ledger().sequence());

        // Emit draw event
        env.events().publish(
            (symbol_short!("draw"),),
            DrawEvent {
                winner: winner.clone(),
                pot,
                round: total_rounds + 1,
            },
        );

        winner
    }

    // ==================== VIEW FUNCTIONS ====================

    /// Get the token address used for this lottery
    pub fn get_token(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Token)
            .expect("not initialized")
    }

    /// Get the ticket price
    pub fn get_ticket_price(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::TicketPrice)
            .expect("not initialized")
    }

    /// Get the current number of players
    pub fn get_player_count(env: Env) -> u32 {
        let players: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Players)
            .unwrap_or(Vec::new(&env));
        players.len()
    }

    /// Get the list of current players
    pub fn get_players(env: Env) -> Vec<Address> {
        env.storage()
            .instance()
            .get(&DataKey::Players)
            .unwrap_or(Vec::new(&env))
    }

    /// Get the current pot size
    pub fn get_pot(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::Pot).unwrap_or(0)
    }

    /// Get the ledger sequence when the current round started
    pub fn get_round_start(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::RoundStart)
            .unwrap_or(0)
    }

    /// Check if the draw can be called
    /// Returns true if enough players AND enough time has passed
    pub fn can_draw(env: Env) -> bool {
        let players: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Players)
            .unwrap_or(Vec::new(&env));

        let round_start: u32 = env
            .storage()
            .instance()
            .get(&DataKey::RoundStart)
            .unwrap_or(0);

        let current_ledger = env.ledger().sequence();

        players.len() >= MIN_PLAYERS && current_ledger >= round_start + MIN_ROUND_DURATION
    }

    /// Get ledgers remaining until draw is allowed (0 if ready)
    pub fn ledgers_until_draw(env: Env) -> u32 {
        let round_start: u32 = env
            .storage()
            .instance()
            .get(&DataKey::RoundStart)
            .unwrap_or(0);

        let current_ledger = env.ledger().sequence();
        let target = round_start + MIN_ROUND_DURATION;

        if current_ledger >= target {
            0
        } else {
            target - current_ledger
        }
    }

    /// Get total number of completed rounds
    pub fn get_total_rounds(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::TotalRounds)
            .unwrap_or(0)
    }

    /// Get total prizes distributed (all time)
    pub fn get_total_prizes(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::TotalPrizes)
            .unwrap_or(0)
    }

    /// Check if a specific address has entered the current round
    pub fn has_entered(env: Env, player: Address) -> bool {
        let players: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Players)
            .unwrap_or(Vec::new(&env));

        for p in players.iter() {
            if p == player {
                return true;
            }
        }
        false
    }

    /// Get minimum players required for draw
    pub fn get_min_players(_env: Env) -> u32 {
        MIN_PLAYERS
    }

    /// Get minimum round duration in ledgers
    pub fn get_min_round_duration(_env: Env) -> u32 {
        MIN_ROUND_DURATION
    }
}

mod test;
