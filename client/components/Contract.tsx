"use client";

import { useState, useCallback, useEffect } from "react";
import {
  getToken,
  getTicketPrice,
  getPlayerCount,
  getPlayers,
  getPot,
  getRoundStart,
  canDraw,
  ledgersUntilDraw,
  getTotalRounds,
  getTotalPrizes,
  hasEntered,
  getMinPlayers,
  getMinRoundDuration,
  enterLottery,
  drawWinner,
  initLottery,
  CONTRACT_ADDRESS,
} from "@/hooks/contract";
import { AnimatedCard } from "@/components/ui/animated-card";
import { Spotlight } from "@/components/ui/spotlight";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ── Icons ────────────────────────────────────────────────────

function SpinnerIcon() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function TicketIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M13 5v2" />
      <path d="M13 17v2" />
      <path d="M13 11v2" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function CoinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v12" />
      <path d="M8 10h8" />
      <path d="M8 14h8" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  );
}

// ── Stat Card ────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
  pulse,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color: string;
  pulse?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 transition-all hover:border-white/[0.1]">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-wider text-white/30">{label}</p>
        <div className="flex items-baseline gap-1.5">
          <p className="text-base font-bold font-mono text-white/90 truncate">{value}</p>
          {sub && <p className="text-[10px] text-white/25">{sub}</p>}
        </div>
      </div>
      {pulse && (
        <div className="relative h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: color }} />
          <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: color }} />
        </div>
      )}
    </div>
  );
}

// ── Method Signature ─────────────────────────────────────────

function MethodSignature({
  name,
  params,
  returns,
  color,
}: {
  name: string;
  params: string;
  returns?: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3 font-mono text-sm">
      <span style={{ color }} className="font-semibold">fn</span>
      <span className="text-white/70">{name}</span>
      <span className="text-white/20 text-xs">{params}</span>
      {returns && (
        <span className="ml-auto text-white/15 text-[10px]">{returns}</span>
      )}
    </div>
  );
}

// ── Lottery Contract UI ─────────────────────────────────────

interface ContractUIProps {
  walletAddress: string | null;
  onConnect: () => void;
  isConnecting: boolean;
}

interface LotteryState {
  isInitialized: boolean;
  token: string | null;
  ticketPrice: bigint | null;
  playerCount: number;
  players: string[];
  pot: bigint;
  roundStart: number;
  cndraw: boolean;
  ledgersUntilDraw: number;
  totalRounds: number;
  totalPrizes: bigint;
  minPlayers: number;
  minDuration: number;
  hasEnteredThisRound: boolean;
}

export default function ContractUI({ walletAddress, onConnect, isConnecting }: ContractUIProps) {
  const [error, setError] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<string | null>(null);

  const [initToken, setInitToken] = useState("");
  const [initPrice, setInitPrice] = useState("100");
  const [isInitializing, setIsInitializing] = useState(false);

  const [isEntering, setIsEntering] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [lastPot, setLastPot] = useState<bigint>(0n);

  const [state, setState] = useState<LotteryState>({
    isInitialized: false,
    token: null,
    ticketPrice: null,
    playerCount: 0,
    players: [],
    pot: 0n,
    roundStart: 0,
    cndraw: false,
    ledgersUntilDraw: 0,
    totalRounds: 0,
    totalPrizes: 0n,
    minPlayers: 2,
    minDuration: 60,
    hasEnteredThisRound: false,
  });

  const truncate = (addr: string) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "—";
  const fmtAmount = (n: bigint | number) => {
    const val = typeof n === "bigint" ? Number(n) : n;
    return val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val >= 1000 ? `${(val / 1000).toFixed(1)}K` : val.toLocaleString();
  };

  // Refresh all lottery state
  const refreshState = useCallback(async () => {
    try {
      const [token, ticketPrice, playerCount, players, pot, roundStart, cndraw, luds, totalRounds, totalPrizes, minPlayers, minDuration] = await Promise.all([
        getToken(),
        getTicketPrice(),
        getPlayerCount(),
        getPlayers(),
        getPot(),
        getRoundStart(),
        canDraw(),
        ledgersUntilDraw(),
        getTotalRounds(),
        getTotalPrizes(),
        getMinPlayers(),
        getMinRoundDuration(),
      ]);

      let userHasEntered = false;
      if (walletAddress) {
        userHasEntered = (await hasEntered(walletAddress)) as boolean;
      }

      setState({
        isInitialized: !!token,
        token: token as string,
        ticketPrice: ticketPrice as bigint,
        playerCount: playerCount as number,
        players: (players as string[]) || [],
        pot: BigInt(pot || 0),
        roundStart: roundStart as number || 0,
        cndraw: cndraw as boolean,
        ledgersUntilDraw: luds as number || 0,
        totalRounds: totalRounds as number || 0,
        totalPrizes: BigInt(totalPrizes || 0),
        minPlayers: minPlayers as number || 2,
        minDuration: minDuration as number || 60,
        hasEnteredThisRound: userHasEntered,
      });
    } catch (e) {
      // Contract might not be initialized yet — that's ok
    }
  }, [walletAddress]);

  // Poll state every 5 seconds
  useEffect(() => {
    refreshState();
    const interval = setInterval(refreshState, 5000);
    return () => clearInterval(interval);
  }, [refreshState]);

  const handleInit = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");
    if (!initToken.trim()) return setError("Enter a token address");
    const price = parseInt(initPrice);
    if (isNaN(price) || price <= 0) return setError("Enter a valid ticket price");
    setError(null);
    setIsInitializing(true);
    setTxStatus("Initializing lottery...");
    try {
      await initLottery(walletAddress, initToken.trim(), BigInt(price));
      setTxStatus("Lottery initialized! Contract is now fully permissionless.");
      setTimeout(() => setTxStatus(null), 5000);
      await refreshState();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Initialization failed");
      setTxStatus(null);
    } finally {
      setIsInitializing(false);
    }
  }, [walletAddress, initToken, initPrice, refreshState]);

  const handleEnter = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");
    setError(null);
    setIsEntering(true);
    setTxStatus("Awaiting signature...");
    try {
      await enterLottery(walletAddress);
      setTxStatus("Ticket purchased! Good luck!");
      setTimeout(() => setTxStatus(null), 5000);
      await refreshState();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to enter lottery");
      setTxStatus(null);
    } finally {
      setIsEntering(false);
    }
  }, [walletAddress, refreshState]);

  const handleDraw = useCallback(async () => {
    setError(null);
    setIsDrawing(true);
    setTxStatus("Drawing winner...");
    try {
      const result = await drawWinner(walletAddress || undefined);
      // Extract winner from result if available
      const resultAny = result as any;
      if (resultAny.trackingData?.transactionData?.result?.results) {
        const winnerBytes = resultAny.trackingData.transactionData.result.results[0]?.value?.address;
        if (winnerBytes) {
          setWinner(winnerBytes);
        }
      }
      setLastPot(state.pot);
      setTxStatus("Winner drawn! Prize distributed!");
      setWinner(null);
      setTimeout(() => { setTxStatus(null); setWinner(null); }, 8000);
      await refreshState();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Draw failed");
      setTxStatus(null);
    } finally {
      setIsDrawing(false);
    }
  }, [walletAddress, state.pot, refreshState]);

  const notInitialized = !state.isInitialized;
  const canEnter = state.isInitialized && walletAddress && !state.hasEnteredThisRound;
  const alreadyEntered = state.isInitialized && walletAddress && state.hasEnteredThisRound;

  return (
    <div className="w-full max-w-2xl animate-fade-in-up-delayed">
      {/* Toasts */}
      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-[#f87171]/15 bg-[#f87171]/[0.05] px-4 py-3 backdrop-blur-sm animate-slide-down">
          <span className="mt-0.5 text-[#f87171]"><AlertIcon /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[#f87171]/90">Error</p>
            <p className="text-xs text-[#f87171]/50 mt-0.5 break-all">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="shrink-0 text-[#f87171]/30 hover:text-[#f87171]/70 text-lg leading-none">&times;</button>
        </div>
      )}

      {txStatus && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#34d399]/15 bg-[#34d399]/[0.05] px-4 py-3 backdrop-blur-sm shadow-[0_0_30px_rgba(52,211,153,0.05)] animate-slide-down">
          <span className="text-[#34d399]">
            {txStatus.includes("drawn") || txStatus.includes("initialized") || txStatus.includes("purchased") || txStatus.includes("Winner") ? <CheckIcon /> : <SpinnerIcon />}
          </span>
          <span className="text-sm text-[#34d399]/90">{txStatus}</span>
        </div>
      )}

      {/* Main Card */}
      <Spotlight className="rounded-2xl">
        <AnimatedCard className="p-0" containerClassName="rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#f59e0b]/20 to-[#ef4444]/20 border border-white/[0.06]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#f59e0b]">
                  <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                  <path d="M13 5v2" />
                  <path d="M13 17v2" />
                  <path d="M13 11v2" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white/90">Decentralized Lottery</h3>
                <p className="text-[10px] text-white/25 font-mono mt-0.5">{truncate(CONTRACT_ADDRESS)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {state.isInitialized ? (
                <Badge variant="success">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#34d399] animate-pulse" />
                  Live
                </Badge>
              ) : (
                <Badge variant="warning">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#fbbf24]" />
                  Setup
                </Badge>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 border-b border-white/[0.06] p-4">
            <StatCard
              icon={<CoinIcon />}
              label="Prize Pool"
              value={fmtAmount(state.pot)}
              sub="XLM"
              color="#f59e0b"
              pulse={state.pot > 0n}
            />
            <StatCard
              icon={<UsersIcon />}
              label="Players"
              value={String(state.playerCount)}
              sub={`min ${state.minPlayers}`}
              color="#4fc3f7"
            />
            <StatCard
              icon={<SparkleIcon />}
              label="Total Rounds"
              value={String(state.totalRounds)}
              color="#7c6cf0"
            />
            <StatCard
              icon={<TrophyIcon />}
              label="Total Won"
              value={fmtAmount(state.totalPrizes)}
              sub="XLM"
              color="#34d399"
            />
          </div>

          {/* Countdown or Ready banner */}
          {state.isInitialized && (
            <div className="px-4 py-3 border-b border-white/[0.06]">
              {state.cndraw ? (
                <div className="flex items-center justify-between rounded-lg bg-[#34d399]/[0.05] border border-[#34d399]/15 px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#34d399] opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-[#34d399]" />
                    </span>
                    <span className="text-xs font-medium text-[#34d399]/90">Ready to draw!</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#34d399]/50">{state.playerCount} players &middot; {state.ledgersUntilDraw === 0 ? "~5s finality" : `${state.ledgersUntilDraw} ledgers`}</span>
                </div>
              ) : state.playerCount >= state.minPlayers ? (
                <div className="flex items-center gap-2 rounded-lg bg-[#fbbf24]/[0.05] border border-[#fbbf24]/15 px-4 py-2">
                  <span className="text-[#fbbf24]/70"><ClockIcon /></span>
                  <span className="text-xs font-medium text-[#fbbf24]/90">
                    Draw in {state.ledgersUntilDraw} ledgers (~{Math.round(state.ledgersUntilDraw * 5 / 60)}min)
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg bg-white/[0.02] border border-white/[0.06] px-4 py-2">
                  <span className="text-xs text-white/30">
                    Need {state.minPlayers - state.playerCount} more player{state.minPlayers - state.playerCount !== 1 ? "s" : ""} to start countdown
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Tab Content */}
          <div className="p-6 space-y-5">
            {notInitialized ? (
              // ── Setup Tab ──
              <div className="space-y-5">
                <div className="rounded-xl border border-[#fbbf24]/15 bg-[#fbbf24]/[0.03] px-4 py-3">
                  <p className="text-xs text-[#fbbf24]/60 leading-relaxed">
                    <strong>One-time setup.</strong> Anyone can initialize this lottery. After that, the contract is <strong>fully permissionless</strong> — no admin, no owner, anyone can enter and anyone can draw.
                  </p>
                </div>

                <MethodSignature name="init" params="(token: Address, ticket_price: i128)" color="#fbbf24" />

                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="block text-[11px] font-medium uppercase tracking-wider text-white/30">Token Address</label>
                    <div className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-px transition-all focus-within:border-[#fbbf24]/30 focus-within:shadow-[0_0_20px_rgba(251,191,36,0.08)]">
                      <input
                        value={initToken}
                        onChange={(e) => setInitToken(e.target.value)}
                        placeholder="G... (native XLM) or token contract address"
                        className="w-full rounded-[11px] bg-transparent px-4 py-3 font-mono text-sm text-white/90 placeholder:text-white/15 outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[11px] font-medium uppercase tracking-wider text-white/30">Ticket Price</label>
                    <div className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-px transition-all focus-within:border-[#fbbf24]/30 focus-within:shadow-[0_0_20px_rgba(251,191,36,0.08)]">
                      <input
                        type="number"
                        value={initPrice}
                        onChange={(e) => setInitPrice(e.target.value)}
                        placeholder="100"
                        className="w-full rounded-[11px] bg-transparent px-4 py-3 font-mono text-sm text-white/90 placeholder:text-white/15 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {walletAddress ? (
                  <ShimmerButton onClick={handleInit} disabled={isInitializing} shimmerColor="#fbbf24" className="w-full">
                    {isInitializing ? <><SpinnerIcon /> Initializing...</> : <><PlayIcon /> Initialize Lottery</>}
                  </ShimmerButton>
                ) : (
                  <button
                    onClick={onConnect}
                    disabled={isConnecting}
                    className="w-full rounded-xl border border-dashed border-[#fbbf24]/20 bg-[#fbbf24]/[0.03] py-4 text-sm text-[#fbbf24]/60 hover:border-[#fbbf24]/30 hover:text-[#fbbf24]/80 active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    Connect wallet to initialize
                  </button>
                )}
              </div>
            ) : (
              // ── Live Lottery Tabs ──
              <div className="space-y-5">
                {/* Prize Pool Display */}
                <div className="rounded-xl border border-[#f59e0b]/20 bg-gradient-to-br from-[#f59e0b]/[0.04] to-[#ef4444]/[0.04] p-5 text-center">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-[#f59e0b]/50 mb-2">Current Prize Pool</p>
                  <p className="text-4xl font-bold font-mono text-[#f59e0b]">
                    {fmtAmount(state.pot)}
                  </p>
                  <p className="text-xs text-white/25 mt-1">
                    {state.playerCount} player{state.playerCount !== 1 ? "s" : ""} &middot; {state.ticketPrice ? fmtAmount(state.ticketPrice) : "—"} per ticket
                  </p>
                </div>

                {/* Winner Banner */}
                {winner && lastPot > 0n && (
                  <div className="rounded-xl border border-[#34d399]/20 bg-gradient-to-br from-[#34d399]/[0.05] to-[#4fc3f7]/[0.03] p-5 text-center animate-fade-in-up">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-[#34d399]/50 mb-2">🎉 Winner</p>
                    <p className="text-base font-bold font-mono text-[#34d399]">{truncate(winner)}</p>
                    <p className="text-sm font-mono text-[#34d399]/70 mt-1">+{fmtAmount(lastPot)} XLM</p>
                  </div>
                )}

                {/* Players List */}
                {state.players.length > 0 && (
                  <div className="space-y-2">
                    <label className="block text-[11px] font-medium uppercase tracking-wider text-white/30">Players</label>
                    <div className="flex flex-wrap gap-2">
                      {state.players.map((p, i) => {
                        const isYou = walletAddress && p === walletAddress;
                        return (
                          <div key={i} className={cn(
                            "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-mono transition-all",
                            isYou
                              ? "border-[#7c6cf0]/30 bg-[#7c6cf0]/[0.06] text-[#7c6cf0]/90"
                              : "border-white/[0.06] bg-white/[0.02] text-white/50"
                          )}>
                            <span className="text-[10px] text-white/20">{i + 1}</span>
                            {truncate(p)}
                            {isYou && <span className="text-[9px] text-[#7c6cf0]/50">(you)</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-3">
                  {canEnter && (
                    <>
                      <MethodSignature name="enter" params="(player: Address) — transfers ticket price to pot" color="#34d399" />
                      <ShimmerButton onClick={handleEnter} disabled={isEntering} shimmerColor="#34d399" className="w-full">
                        {isEntering ? <><SpinnerIcon /> Purchasing ticket...</> : <><TicketIcon /> Buy Ticket &middot; {state.ticketPrice ? fmtAmount(state.ticketPrice) : "—"} XLM</>}
                      </ShimmerButton>
                    </>
                  )}

                  {alreadyEntered && (
                    <div className="flex items-center justify-center gap-2 rounded-xl border border-[#34d399]/15 bg-[#34d399]/[0.03] px-4 py-3">
                      <span className="text-[#34d399]/70"><CheckIcon /></span>
                      <span className="text-sm text-[#34d399]/70">You have entered this round</span>
                    </div>
                  )}

                  {state.cndraw && (
                    <>
                      <MethodSignature name="draw" params="() — selects random winner, pays pot" returns="-> Address" color="#7c6cf0" />
                      <ShimmerButton onClick={handleDraw} disabled={isDrawing} shimmerColor="#7c6cf0" className="w-full">
                        {isDrawing ? <><SpinnerIcon /> Drawing winner...</> : <><TrophyIcon /> Draw Winner</>}
                      </ShimmerButton>
                    </>
                  )}

                  {!walletAddress && (
                    <button
                      onClick={onConnect}
                      disabled={isConnecting}
                      className="w-full rounded-xl border border-dashed border-[#34d399]/20 bg-[#34d399]/[0.03] py-4 text-sm text-[#34d399]/60 hover:border-[#34d399]/30 hover:text-[#34d399]/80 active:scale-[0.99] transition-all disabled:opacity-50"
                    >
                      Connect wallet to play
                    </button>
                  )}
                </div>

                {/* Info */}
                <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] px-4 py-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/25">Ticket Price</span>
                    <span className="font-mono text-xs text-white/50">{state.ticketPrice ? fmtAmount(state.ticketPrice) : "—"} XLM</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/25">Token</span>
                    <span className="font-mono text-xs text-white/50">{truncate(state.token || "")}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/25">Round Duration</span>
                    <span className="font-mono text-xs text-white/50">~{Math.round(state.minDuration * 5 / 60)} minutes</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-white/[0.04] px-6 py-3 flex items-center justify-between">
            <p className="text-[10px] text-white/15">Decentralized Lottery &middot; Soroban</p>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 font-mono text-[9px] text-white/15">
                <span className="h-1.5 w-1.5 rounded-full bg-[#34d399]/50" />Permissionless
              </span>
              <span className="text-white/10 text-[8px]">&middot;</span>
              <span className="flex items-center gap-1.5 font-mono text-[9px] text-white/15">
                <span className="h-1.5 w-1.5 rounded-full bg-[#7c6cf0]/50" />Auto-reset
              </span>
            </div>
          </div>
        </AnimatedCard>
      </Spotlight>
    </div>
  );
}
