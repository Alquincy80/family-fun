// Pitty Pat game engine — 5-card pairing game (3 pairs wins the hand).
// Points-only house incentives:
//   - "First Porter": first player to hold 2 pairs earns +10 bonus points.
//   - "Last Low": whoever was dealt the lowest rank on the 5th (last) dealt
//     card of the hand earns +10 bonus points.
//
// No real-money gambling or cash prizes; points are earned by playing only.

import {
  buildDeck,
  castById,
  cardId,
  cardLabel,
  DEFAULT_RULES,
  INCENTIVE_BONUS,
  RANK_LABEL,
  shuffle,
  sortHand,
  START_POINTS,
  SUIT_SYMBOL,
  type CardT,
  type TunkPlayer,
} from "./tunk";

export const PITTY_PAT_TARGET_1V1 = 150;
export const PITTY_PAT_TARGET_4P = 300;
export const PITTY_PAT_WIN_STAKE = 15;

export interface PittyPatRules {
  include8910: boolean;
  firstPorterBonus: boolean;
  lastLowBonus: boolean;
}

export const DEFAULT_PITTY_PAT_RULES: PittyPatRules = {
  include8910: DEFAULT_RULES.include8910,
  firstPorterBonus: false,
  lastLowBonus: false,
};

export interface PittyPatDelta {
  playerId: string;
  name: string;
  delta: number;
  note: string;
}

export interface PittyPatState {
  players: TunkPlayer[];
  stock: CardT[];
  discardPile: CardT[];
  turn: number;
  phase: "draw" | "discard" | "over";
  lastAction: string;
  winnerIndex: number | null;
  deltas: PittyPatDelta[];
  matchTarget: number;
  handNumber: number;
  rules: PittyPatRules;
  /** First player index to reach 2 pairs in this hand. */
  firstPorterIndex: number | null;
  /** Player index who received the lowest rank on the 5th card dealt. */
  lastLowIndex: number | null;
  /** The 5th dealt card that determined Last Low. */
  lastLowCard: CardT | null;
}

/** Group cards by rank and return pairs + leftover singletons. */
export function partitionPairs(hand: CardT[]): {
  pairs: [CardT, CardT][];
  singles: CardT[];
} {
  const byRank = new Map<number, CardT[]>();
  for (const c of hand) {
    const list = byRank.get(c.rank) ?? [];
    list.push(c);
    byRank.set(c.rank, list);
  }
  const pairs: [CardT, CardT][] = [];
  const singles: CardT[] = [];
  for (const [, group] of byRank) {
    const copy = [...group];
    while (copy.length >= 2) {
      const a = copy.shift() as CardT;
      const b = copy.shift() as CardT;
      pairs.push([a, b]);
    }
    singles.push(...copy);
  }
  return { pairs, singles };
}

export function pairCount(hand: CardT[]): number {
  return partitionPairs(hand).pairs.length;
}

export function hasWinningThreePairs(hand: CardT[]): boolean {
  return pairCount(hand) >= 3;
}

function rankText(rank: number): string {
  return RANK_LABEL[rank] ?? String(rank);
}

function makePlayers(playerCount: 2 | 4, humanName: string): TunkPlayer[] {
  const opponents =
    playerCount === 2
      ? [castById("dee")]
      : [castById("marcus"), castById("dee"), castById("trey")];
  const players: TunkPlayer[] = [
    {
      id: "you",
      name: humanName,
      img: null,
      isHuman: true,
      hand: [],
      spreads: [],
      points: START_POINTS,
      matchPointsWon: 0,
    },
  ];
  for (const c of opponents) {
    players.push({
      id: c.id,
      name: c.name,
      img: c.img,
      isHuman: false,
      hand: [],
      spreads: [],
      points: START_POINTS,
      matchPointsWon: 0,
    });
  }
  return players;
}

export function dealPittyPatHand(
  players: TunkPlayer[],
  matchTarget: number,
  handNumber: number,
  rules: PittyPatRules = DEFAULT_PITTY_PAT_RULES,
): PittyPatState {
  const deck = shuffle(buildDeck(rules.include8910));
  const next = players.map((p) => ({
    ...p,
    hand: [] as CardT[],
    spreads: [] as CardT[][],
    points: p.points <= 0 ? START_POINTS : p.points,
  }));

  let lastLowIndex: number | null = null;
  let lastLowCard: CardT | null = null;

  for (let round = 0; round < 5; round++) {
    let roundLowestRank = Infinity;
    let roundLowestIdx: number | null = null;
    let roundLowestCard: CardT | null = null;

    for (let i = 0; i < next.length; i++) {
      const p = next[i] as TunkPlayer;
      const card = deck.pop() as CardT;
      p.hand.push(card);
      if (card.rank < roundLowestRank) {
        roundLowestRank = card.rank;
        roundLowestIdx = i;
        roundLowestCard = card;
      }
    }

    if (round === 4) {
      lastLowIndex = roundLowestIdx;
      lastLowCard = roundLowestCard;
    }
  }

  for (const p of next) {
    p.hand = sortHand(p.hand);
  }

  const porterIdx = next.findIndex((p) => pairCount(p.hand) >= 2);
  const firstPorterIndex = porterIdx >= 0 ? porterIdx : null;

  const discardPile = [deck.pop() as CardT];
  const stock = deck;

  const naturalWinner = next.findIndex((p) => hasWinningThreePairs(p.hand));
  const baseState: PittyPatState = {
    players: next,
    stock,
    discardPile,
    turn: 0,
    phase: "draw",
    lastAction: "Cards dealt — make 3 pairs to call Pitty Pat!",
    winnerIndex: null,
    deltas: [],
    matchTarget,
    handNumber,
    rules,
    firstPorterIndex,
    lastLowIndex,
    lastLowCard,
  };

  if (naturalWinner >= 0) {
    return scorePittyPatHand(baseState, naturalWinner, "dealt three pairs");
  }
  return baseState;
}

export function newPittyPatMatch(
  playerCount: 2 | 4,
  humanName: string,
  rules: PittyPatRules = DEFAULT_PITTY_PAT_RULES,
): PittyPatState {
  const players = makePlayers(playerCount, humanName);
  const target =
    playerCount === 2 ? PITTY_PAT_TARGET_1V1 : PITTY_PAT_TARGET_4P;
  return dealPittyPatHand(players, target, 1, rules);
}

export function scorePittyPatHand(
  state: PittyPatState,
  winnerIndex: number,
  winReason: string,
): PittyPatState {
  const players = state.players.map((p) => ({
    ...p,
    hand: [...p.hand],
    spreads: p.spreads.map((s) => [...s]),
  }));
  const winner = players[winnerIndex] as TunkPlayer;
  const deltas: PittyPatDelta[] = [];
  let winnerGain = 0;

  for (let i = 0; i < players.length; i++) {
    if (i === winnerIndex) continue;
    const loser = players[i] as TunkPlayer;
    const paid = Math.min(PITTY_PAT_WIN_STAKE, loser.points);
    loser.points -= paid;
    winnerGain += paid;
    deltas.push({
      playerId: loser.id,
      name: loser.name,
      delta: -paid,
      note: `${loser.name} paid ${paid} pts on the hand.`,
    });
  }

  winner.points += winnerGain;
  winner.matchPointsWon += winnerGain;

  deltas.unshift({
    playerId: winner.id,
    name: winner.name,
    delta: winnerGain,
    note: `${winner.name} called Pitty Pat (${winReason}) for +${winnerGain} pts.`,
  });

  if (state.rules.firstPorterBonus && state.firstPorterIndex !== null) {
    const porter = players[state.firstPorterIndex];
    if (porter) {
      porter.points += INCENTIVE_BONUS;
      porter.matchPointsWon += INCENTIVE_BONUS;
      const existing = deltas.find((d) => d.playerId === porter.id);
      if (existing) existing.delta += INCENTIVE_BONUS;
      deltas.push({
        playerId: `${porter.id}-first-porter`,
        name: `2x First Porter (${porter.name})`,
        delta: INCENTIVE_BONUS,
        note: `${porter.name} hit 2 pairs first ("First Porter") for +${INCENTIVE_BONUS} bonus pts.`,
      });
    }
  }

  if (state.rules.lastLowBonus && state.lastLowIndex !== null) {
    const lowPlayer = players[state.lastLowIndex];
    if (lowPlayer) {
      lowPlayer.points += INCENTIVE_BONUS;
      lowPlayer.matchPointsWon += INCENTIVE_BONUS;
      const existing = deltas.find((d) => d.playerId === lowPlayer.id);
      if (existing) existing.delta += INCENTIVE_BONUS;
      const cardDesc = state.lastLowCard
        ? `${rankText(state.lastLowCard.rank)}${SUIT_SYMBOL[state.lastLowCard.suit]}`
        : "lowest card";
      deltas.push({
        playerId: `${lowPlayer.id}-last-low`,
        name: `↓ Last Low (${lowPlayer.name})`,
        delta: INCENTIVE_BONUS,
        note: `${lowPlayer.name} got the lowest last dealt card (${cardDesc}) for +${INCENTIVE_BONUS} bonus pts.`,
      });
    }
  }

  return {
    ...state,
    players,
    phase: "over",
    winnerIndex,
    deltas,
    lastAction: `${winner.name} won the hand (${winReason})!`,
  };
}

export function aiChoosePittyPatDiscard(hand: CardT[]): CardT {
  const { pairs, singles } = partitionPairs(hand);
  const pairedIds = new Set(pairs.flat().map(cardId));
  const unpaired = hand.filter((c) => !pairedIds.has(cardId(c)));
  const pool = unpaired.length > 0 ? unpaired : singles;
  if (pool.length === 0) return hand[0] as CardT;

  let best = pool[0] as CardT;
  let bestScore = Infinity;
  for (const c of pool) {
    const sameRankCount = hand.filter(
      (o) => cardId(o) !== cardId(c) && o.rank === c.rank,
    ).length;
    if (sameRankCount < bestScore) {
      bestScore = sameRankCount;
      best = c;
    }
  }
  return best;
}

export function formatCardShort(c: CardT): string {
  return cardLabel(c);
}
