"use client";

import {
  Contract,
  Networks,
  TransactionBuilder,
  Keypair,
  xdr,
  Address,
  nativeToScVal,
  scValToNative,
  rpc,
} from "@stellar/stellar-sdk";
import {
  isConnected,
  getAddress,
  signTransaction,
  setAllowed,
  isAllowed,
  requestAccess,
} from "@stellar/freighter-api";

// ============================================================
// CONSTANTS — Update these for your contract
// ============================================================

/** Your deployed Soroban contract ID */
export const CONTRACT_ADDRESS =
  "CDJVMAX34YRCQ5JFC6SIOQOVSUY6XWEFYJOLF3SBCKU7CMI3IAP6HPWN";

/** Network passphrase (testnet by default) */
export const NETWORK_PASSPHRASE = Networks.TESTNET;

/** Soroban RPC URL */
export const RPC_URL = "https://soroban-testnet.stellar.org";

/** Horizon URL */
export const HORIZON_URL = "https://horizon-testnet.stellar.org";

/** Network name for Freighter */
export const NETWORK = "TESTNET";

// ============================================================
// RPC Server Instance
// ============================================================

const server = new rpc.Server(RPC_URL);

// ============================================================
// Wallet Helpers
// ============================================================

export async function checkConnection(): Promise<boolean> {
  const result = await isConnected();
  return result.isConnected;
}

export async function connectWallet(): Promise<string> {
  const connResult = await isConnected();
  if (!connResult.isConnected) {
    throw new Error("Freighter extension is not installed or not available.");
  }

  const allowedResult = await isAllowed();
  if (!allowedResult.isAllowed) {
    await setAllowed();
    await requestAccess();
  }

  const { address } = await getAddress();
  if (!address) {
    throw new Error("Could not retrieve wallet address from Freighter.");
  }
  return address;
}

export async function getWalletAddress(): Promise<string | null> {
  try {
    const connResult = await isConnected();
    if (!connResult.isConnected) return null;

    const allowedResult = await isAllowed();
    if (!allowedResult.isAllowed) return null;

    const { address } = await getAddress();
    return address || null;
  } catch {
    return null;
  }
}

// ============================================================
// Contract Interaction Helpers
// ============================================================

/**
 * Build, simulate, and optionally sign + submit a Soroban contract call.
 *
 * @param method   - The contract method name to invoke
 * @param params   - Array of xdr.ScVal parameters for the method
 * @param caller   - The public key (G...) of the calling account
 * @param sign     - If true, signs via Freighter and submits. If false, only simulates.
 * @returns        The result of the simulation or submission
 */
export async function callContract(
  method: string,
  params: xdr.ScVal[] = [],
  caller: string,
  sign: boolean = true
) {
  const contract = new Contract(CONTRACT_ADDRESS);
  const account = await server.getAccount(caller);

  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...params))
    .setTimeout(30)
    .build();

  const simulated = await server.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(simulated)) {
    throw new Error(
      `Simulation failed: ${(simulated as rpc.Api.SimulateTransactionErrorResponse).error}`
    );
  }

  if (!sign) {
    // Read-only call — just return the simulation result
    return simulated;
  }

  // Prepare the transaction with the simulation result
  const prepared = rpc.assembleTransaction(tx, simulated).build();

  // Sign with Freighter
  const { signedTxXdr } = await signTransaction(prepared.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  const txToSubmit = TransactionBuilder.fromXDR(
    signedTxXdr,
    NETWORK_PASSPHRASE
  );

  const result = await server.sendTransaction(txToSubmit);

  if (result.status === "ERROR") {
    throw new Error(`Transaction submission failed: ${result.status}`);
  }

  // Poll for confirmation
  let getResult = await server.getTransaction(result.hash);
  while (getResult.status === "NOT_FOUND") {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    getResult = await server.getTransaction(result.hash);
  }

  if (getResult.status === "FAILED") {
    throw new Error("Transaction failed on chain.");
  }

  return getResult;
}

/**
 * Read-only contract call (does not require signing).
 */
export async function readContract(
  method: string,
  params: xdr.ScVal[] = [],
  caller?: string
) {
  const account =
    caller || Keypair.random().publicKey(); // Use a random keypair for read-only
  const sim = await callContract(method, params, account, false);
  if (
    rpc.Api.isSimulationSuccess(sim as rpc.Api.SimulateTransactionResponse) &&
    (sim as rpc.Api.SimulateTransactionSuccessResponse).result
  ) {
    return scValToNative(
      (sim as rpc.Api.SimulateTransactionSuccessResponse).result!.retval
    );
  }
  return null;
}

// ============================================================
// ScVal Conversion Helpers
// ============================================================

export function toScValString(value: string): xdr.ScVal {
  return nativeToScVal(value, { type: "string" });
}

export function toScValU32(value: number): xdr.ScVal {
  return nativeToScVal(value, { type: "u32" });
}

export function toScValI128(value: bigint): xdr.ScVal {
  return nativeToScVal(value, { type: "i128" });
}

export function toScValAddress(address: string): xdr.ScVal {
  return new Address(address).toScVal();
}

export function toScValBool(value: boolean): xdr.ScVal {
  return nativeToScVal(value, { type: "bool" });
}

// ============================================================
// Lottery Dapp — Contract Methods
// ============================================================

/**
 * Initialize the lottery with a token and ticket price.
 * Can only be called once. After initialization, the contract is fully permissionless.
 * Only needs to be called once — anyone can call it.
 */
export async function initLottery(
  caller: string,
  token: string,
  ticketPrice: bigint
) {
  return callContract(
    "init",
    [toScValAddress(token), toScValI128(ticketPrice)],
    caller,
    true
  );
}

/**
 * Enter the lottery by purchasing a ticket.
 * Anyone can call this — just needs to have approved the contract to transfer tokens.
 */
export async function enterLottery(caller: string) {
  return callContract("enter", [toScValAddress(caller)], caller, true);
}

/**
 * Draw a winner and distribute the prize pool.
 * Anyone can call this when conditions are met:
 * - At least 2 players have entered
 * - At least 60 ledgers (~5 min) have passed since round start
 */
export async function drawWinner(caller?: string) {
  const who = caller || Keypair.random().publicKey();
  return callContract("draw", [], who, true);
}

// ── Read-only methods ────────────────────────────────────────

/** Get the token address used for this lottery */
export async function getToken(caller?: string) {
  return readContract("get_token", [], caller);
}

/** Get the ticket price */
export async function getTicketPrice(caller?: string) {
  return readContract("get_ticket_price", [], caller);
}

/** Get the current number of players */
export async function getPlayerCount(caller?: string) {
  return readContract("get_player_count", [], caller);
}

/** Get the list of current players */
export async function getPlayers(caller?: string) {
  return readContract("get_players", [], caller);
}

/** Get the current pot size */
export async function getPot(caller?: string) {
  return readContract("get_pot", [], caller);
}

/** Get the ledger sequence when the current round started */
export async function getRoundStart(caller?: string) {
  return readContract("get_round_start", [], caller);
}

/** Check if the draw can be called (enough players + enough time passed) */
export async function canDraw(caller?: string) {
  return readContract("can_draw", [], caller);
}

/** Get number of ledgers remaining until draw is allowed (0 if ready) */
export async function ledgersUntilDraw(caller?: string) {
  return readContract("ledgers_until_draw", [], caller);
}

/** Get total number of completed rounds */
export async function getTotalRounds(caller?: string) {
  return readContract("get_total_rounds", [], caller);
}

/** Get total prizes distributed (all time) */
export async function getTotalPrizes(caller?: string) {
  return readContract("get_total_prizes", [], caller);
}

/** Check if a specific address has entered the current round */
export async function hasEntered(address: string, caller?: string) {
  return readContract("has_entered", [toScValAddress(address)], caller);
}

/** Get minimum players required for draw */
export async function getMinPlayers(caller?: string) {
  return readContract("get_min_players", [], caller);
}

/** Get minimum round duration in ledgers */
export async function getMinRoundDuration(caller?: string) {
  return readContract("get_min_round_duration", [], caller);
}

export { nativeToScVal, scValToNative, Address, xdr };
