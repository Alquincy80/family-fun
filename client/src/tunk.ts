// Tunk game engine — standard Tonk rules (Pagat) with Al's house points.
//
// AL'S POINTS (used for hand totals, drop comparisons, and end-of-hand
// scoring — NOT the standard Tonk values):
//   number cards (2–9): 5 points · 10s and face cards (10/J/Q/K): 10 points
//   Aces: 15 points.
// A natural Tunk is a starting hand totalling exactly 50 (five 10s/faces,
// or three aces + a number card, etc. — 49 cannot happen with these values).
//
// - 2 or 4 players. Deal 5 cards each; next card face up starts the
//   discard pile; the rest is the stock.
// - Turn: at the START of your turn you may DROP (lay your hand face up,
//   claiming the lowest unmatched total). Otherwise draw the top stock card
//   or the top discard, lay down spreads (3–4 of a kind, or 3+ in a row of
//   the same suit — aces low only, so A-2-3 is a run and Q-K-A is not),
//   hit other players' spreads, then discard one card.
// - Going out by spreading/hitting everything with no card left to discard
//   is a "tonk out" = double points. Going out on a final discard = single.
// - If someone drops and does NOT have the lowest unmatched total, the
//   dropper pays DOUBLE points to each player with an equal or lower total.
// - If the stock runs out, the lowest unmatched total wins a single stake.
// - END-OF-HAND POINTS: at the end of every hand, each loser's unmatched
//   cards are added up (Al's values) and the winner takes that many points
//   from each loser.
// - Match: every player starts at 5 points. First to 150 wins a 1v1 match,
//   first to 300 wins a 4-player match. A player at 0 gets a free top-up
//   back to 5 at the next hand so nobody gets stuck.

import bigMamaImg from "./assets/big-mama.webp";
import auntiePearlImg from "./assets/auntie-pearl.webp";
import uncleRayImg from "./assets/uncle-ray.webp";
import bigMikeImg from "./assets/big-mike.webp";
import cousinJayImg from "./assets/cousin-jay.webp";
import cousinNayImg from "./assets/cousin-nay.webp";
import marcusImg from "./assets/marcus.webp";
import deeImg from "./assets/dee.webp";
import treyImg from "./assets/trey.webp";

export type Suit = "spades" | "hearts" | "diamonds" | "clubs";
export interface CardT {
  suit: Suit;
  rank: number; // 2..14 (11 J, 12 Q, 13 K, 14 A)
}

export const SUIT_SYMBOL: Record<Suit, string> = {
  spades: "♠",
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
};
export const RANK_LABEL: Record<number, string> = {
  11: "J",
  12: "Q",
  13: "K",
  14: "A",
};

export function cardLabel(c: CardT): string {
  return `${RANK_LABEL[c.rank] ?? c.rank}${SUIT_SYMBOL[c.suit]}`;
}

export function cardId(c: CardT): string {
  return `${c.suit}-${c.rank}`;
}

/** Al's point value for one card: numbers 5, 10s/faces 10, aces 15. */
export function alValue(c: CardT): number {
  if (c.rank === 14) return 15;
  if (c.rank >= 10) return 10;
  return 5;
}

export function handTotal(hand: CardT[]): number {
  return hand.reduce((sum, c) => sum + alValue(c), 0);
}

export const START_POINTS = 5;
export const MATCH_TARGET_1V1 = 150;
export const MATCH_TARGET_4P = 300;
export const NATURAL_TUNK_TOTAL = 50;

/** Points awarded by the Pitty Pat house incentives ("First Porter" and
    "Last Low") when those rules are switched on. */
export const INCENTIVE_BONUS = 10;

/** Shared rule toggles. Pitty Pat reads include8910 from here. */
export interface TunkRules {
  /** When false, ranks 8, 9 and 10 are left out of the deck (40 cards). */
  include8910: boolean;
}

export const DEFAULT_RULES: TunkRules = { include8910: true };

// Quick-talk phrases for Family Room table chat — the exact list the
// server's word filter allows through for under-13 players.
export const QUICK_TALK: string[] = [
  "Good game!",
  "Nice play!",
  "You got me that time!",
  "Let's go again!",
  "Tunk! Fifty!",
  "I dropped!",
  "Watch my spreads!",
  "Good luck, family!",
  "That was a close one!",
  "Your move!",
];

/** Aces count low (1) for runs; Q-K-A is not a run. */
function runValue(c: CardT): number {
  return c.rank === 14 ? 1 : c.rank;
}

export function isSet(cards: CardT[]): boolean {
  if (cards.length < 3 || cards.length > 4) return false;
  return cards.every((c) => c.rank === cards[0]?.rank);
}

export function isRun(cards: CardT[]): boolean {
  if (cards.length < 3) return false;
  if (!cards.every((c) => c.suit === cards[0]?.suit)) return false;
  const values = cards.map(runValue).sort((a, b) => a - b);
  for (let i = 1; i < values.length; i++) {
    if ((values[i] as number) !== (values[i - 1] as number) + 1) return false;
  }
  return true;
}

export function isValidSpread(cards: CardT[]): boolean {
  return isSet(cards) || isRun(cards);
}

/** Greedy spread finder: sets first, then runs, from the cards given. */
export function findSpreads(hand: CardT[]): CardT[][] {
  const remaining = [...hand];
  const spreads: CardT[][] = [];
  // Sets: group by rank.
  const byRank = new Map<number, CardT[]>();
  for (const c of remaining) {
    const list = byRank.get(c.rank) ?? [];
    list.push(c);
    byRank.set(c.rank, list);
  }
  const used = new Set<string>();
  for (const [, group] of byRank) {
    if (group.length >= 3) {
      const take = group.slice(0, 4);
      spreads.push(take);
      for (const c of take) used.add(cardId(c));
    }
  }
  const rest = remaining.filter((c) => !used.has(cardId(c)));
  // Runs: group by suit, look for consecutive runs of 3+.
  const bySuit = new Map<Suit, CardT[]>();
  for (const c of rest) {
    const list = bySuit.get(c.suit) ?? [];
    list.push(c);
    bySuit.set(c.suit, list);
  }
  for (const [, group] of bySuit) {
    const sorted = [...group].sort((a, b) => runValue(a) - runValue(b));
    let run: CardT[] = [];
    for (const c of sorted) {
      if (
        run.length === 0 ||
        runValue(c) === runValue(run[run.length - 1] as CardT) + 1
      ) {
        run.push(c);
      } else {
        if (run.length >= 3) spreads.push([...run]);
        run = [c];
      }
    }
    if (run.length >= 3) spreads.push([...run]);
  }
  return spreads;
}

/** Can this card be hit onto an existing spread? */
export function canHit(spread: CardT[], card: CardT): boolean {
  if (spread.length === 0) return false;
  if (isSet(spread)) {
    return spread.length < 4 && card.rank === spread[0]?.rank;
  }
  if (isRun(spread)) {
    if (card.suit !== spread[0]?.suit) return false;
    const values = spread.map(runValue);
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const v = runValue(card);
    return v === lo - 1 || v === hi + 1;
  }
  return false;
}

// ---------- Cast ----------

export interface Character {
  id: string;
  name: string;
  img: string | null;
  tagline: string;
  lines: string[];
}

export const CAST: Character[] = [
  {
    id: "big-mama",
    name: "Big Mama",
    img: bigMamaImg,
    tagline: "Runs this table. Always has.",
    lines: [
      "Baby, I been Tunking since before you were born.",
      "Mmm-hmm. Lay your little spread down.",
      "At my table, we count every point.",
    ],
  },
  {
    id: "auntie-pearl",
    name: "Auntie Pearl",
    img: auntiePearlImg,
    tagline: "Sees every card. Says very little.",
    lines: [
      "I saw that drop coming a mile off.",
      "Pearls on, game face on.",
      "Child, I counted your deadwood already.",
    ],
  },
  {
    id: "uncle-ray",
    name: "Uncle Ray",
    img: uncleRayImg,
    tagline: "Talks slow. Plays fast.",
    lines: [
      "Back in my day we played for bragging rights AND the last rib.",
      "Hold on, let me think... nah, take that.",
      "Garage rules: no crying at the table.",
    ],
  },
  {
    id: "cousin-jay",
    name: "Cousin Jay",
    img: cousinJayImg,
    tagline: "All confidence, all the time.",
    lines: [
      "Y'all might as well deal me the win now.",
      "I drop when I feel like dropping!",
      "Watch the master work.",
    ],
  },
  {
    id: "big-mike",
    name: "Big Mike",
    img: bigMikeImg,
    tagline: "Gentle giant. Ruthless Tunk.",
    lines: [
      "No hard feelings. Just hard points.",
      "I came for the cookout, stayed for the Tunk.",
      "Ha! That's how Big Mike does it.",
    ],
  },
  {
    id: "cousin-nay",
    name: "Cousin Nay",
    img: cousinNayImg,
    tagline: "Style points count too.",
    lines: [
      "Cute card. Mine's cuter.",
      "I don't chase points, points chase me.",
      "Period. Next hand.",
    ],
  },
  {
    id: "marcus",
    name: "Marcus",
    img: marcusImg,
    tagline: "Cool head, hot hand.",
    lines: [
      "Easy now. I got all day.",
      "You see it? I see it too.",
      "Marcus don't drop unless it's done.",
    ],
  },
  {
    id: "dee",
    name: "Dee",
    img: deeImg,
    tagline: "Sweet smile, sharp elbows.",
    lines: [
      "Aww, you tried. I love that for you.",
      "Dee's got the touch, baby.",
      "Count 'em up. I'll wait.",
    ],
  },
  {
    id: "trey",
    name: "Trey",
    img: treyImg,
    tagline: "Young, loud, and lucky.",
    lines: [
      "Let's gooo! Tunk time!",
      "I was born with these cards.",
      "Y'all can't handle the Trey.",
    ],
  },
];

export function castById(id: string): Character {
  return (
    CAST.find((c) => c.id === id) ?? {
      id,
      name: id,
      img: null,
      tagline: "",
      lines: [""],
    }
  );
}

// ---------- Card styles, felts, levels ----------

export interface DeckStyle {
  id: string;
  name: string;
  back: string; // css background for card backs
  face: string; // css background for card faces
  how: string;
}

export const DECKS: DeckStyle[] = [
  { id: "house", name: "House Deck", back: "repeating-linear-gradient(45deg,#7c2d12 0 10px,#9a3412 10px 20px)", face: "#FFF8EC", how: "Everyone starts here" },
  { id: "classic", name: "Original Classic", back: "repeating-linear-gradient(45deg,#14532d 0 10px,#166534 10px 20px)", face: "#FFF8EC", how: "Reach Level 2 (25 points won)" },
  { id: "crimson", name: "Cookout Crimson", back: "repeating-linear-gradient(45deg,#7f1d1d 0 10px,#b91c1c 10px 20px)", face: "#FFF5F0", how: "Reach Level 3 (75 points won)" },
  { id: "diamond", name: "Royal Diamond", back: "repeating-linear-gradient(45deg,#1e3a8a 0 10px,#2563eb 10px 20px)", face: "#F5F8FF", how: "Reach Level 5 (300 points won)" },
  { id: "stars", name: "Midnight Stars", back: "radial-gradient(circle at 30% 30%, #f5b942 1.5px, transparent 2px), radial-gradient(circle at 70% 60%, #fff 1.5px, transparent 2px), #111827", face: "#F8FAFF", how: "Reach Level 7 (750 points won)" },
  { id: "emerald", name: "Emerald Crest", back: "repeating-linear-gradient(45deg,#064e3b 0 10px,#059669 10px 20px)", face: "#F2FFF8", how: "Reach Level 8 (1,000 points won)" },
  { id: "crown", name: "Champion Crown Gold", back: "repeating-linear-gradient(45deg,#92400e 0 10px,#f5b942 10px 20px)", face: "#FFFBEB", how: "Reach Level 10 (2,500 points won)" },
  { id: "win1", name: "First Win Gold Trim", back: "repeating-linear-gradient(45deg,#3f3f46 0 10px,#71717a 10px 20px)", face: "#FFF8EC", how: "Win any 1 match" },
  { id: "win5", name: "Veteran Stripes", back: "repeating-linear-gradient(90deg,#581c87 0 12px,#7e22ce 12px 24px)", face: "#FBF5FF", how: "Win any 5 matches" },
  { id: "win10", name: "Five-Star Table", back: "repeating-linear-gradient(90deg,#0f172a 0 12px,#b91c1c 12px 24px)", face: "#FFF8EC", how: "Win any 10 matches" },
  {
    id: "royal-velvet",
    name: "Royal Velvet & Gold",
    back: "repeating-linear-gradient(45deg,#4c1d95 0 10px,#d97706 10px 14px,#5b21b6 14px 24px)",
    face: "#FFFDF5",
    how: "Royal Pack, Family Host Pack, or Founder's Bundle",
  },
  {
    id: "founders-diamond",
    name: "C.F.N.B. Founder's Foil",
    back: "radial-gradient(circle at 50% 50%, #fbbf24 0%, #78350f 65%, #1c1917 100%)",
    face: "#FFFBEB",
    how: "C.F.N.B. Founder's Lifetime Bundle",
  },
];

export const FELTS: { id: string; name: string; css: string; how: string }[] = [
  { id: "classic-green", name: "Classic Wood", css: "radial-gradient(ellipse at center, rgba(255,214,150,0.12) 0%, rgba(0,0,0,0.20) 100%), repeating-linear-gradient(180deg,#8a5a33 0px 40px,#5d3a1e 40px 42px,#7a4e28 42px 82px,#5d3a1e 82px 84px,#96683c 84px 124px,#5d3a1e 124px 126px)", how: "Everyone starts here" },
  { id: "porch", name: "Porch Boards", css: "repeating-linear-gradient(90deg,#8a5a33 0 34px,#7c4f2b 34px 68px)", how: "Reach Level 4 (150 points won)" },
  { id: "sunset", name: "Cookout Sunset", css: "radial-gradient(ellipse at center, #b45309 0%, #7c2d12 75%)", how: "Reach Level 6 (500 points won)" },
  { id: "head-table", name: "Head Table Black & Gold", css: "radial-gradient(ellipse at center, #292524 0%, #0c0a09 70%), repeating-linear-gradient(45deg, transparent 0 18px, rgba(245,185,66,.15) 18px 20px)", how: "Reach Level 9 (1,500 points won)" },
  {
    id: "royal-velvet-felt",
    name: "Royal Velvet Lounge",
    css: "radial-gradient(ellipse at center, #581c87 0%, #2e1065 75%)",
    how: "Royal Pack, Family Host Pack, or Founder's Bundle",
  },
  {
    id: "founders-gold-felt",
    name: "C.F.N.B. Founder's Table",
    css: "radial-gradient(ellipse at center, #451a03 0%, #09090b 80%), repeating-linear-gradient(45deg, transparent 0 16px, rgba(251,191,36,0.18) 16px 18px)",
    how: "C.F.N.B. Founder's Lifetime Bundle",
  },
];

export interface Level {
  level: number;
  pointsNeeded: number;
  unlock: string;
}

export const LEVELS: Level[] = [
  { level: 1, pointsNeeded: 0, unlock: "House Deck" },
  { level: 2, pointsNeeded: 25, unlock: "Original Classic card backs" },
  { level: 3, pointsNeeded: 75, unlock: "Cookout Crimson card backs" },
  { level: 4, pointsNeeded: 150, unlock: "Porch Boards table" },
  { level: 5, pointsNeeded: 300, unlock: "Royal Diamond card backs" },
  { level: 6, pointsNeeded: 500, unlock: "Cookout Sunset table" },
  { level: 7, pointsNeeded: 750, unlock: "Midnight Stars card backs" },
  { level: 8, pointsNeeded: 1000, unlock: "Emerald Crest card backs" },
  { level: 9, pointsNeeded: 1500, unlock: "Head Table Black & Gold table" },
  { level: 10, pointsNeeded: 2500, unlock: "Champion Crown Gold card backs" },
];

export function levelForPoints(lifetimePoints: number): number {
  let level = 1;
  for (const l of LEVELS) {
    if (lifetimePoints >= l.pointsNeeded) level = l.level;
  }
  return level;
}

export function nextLevel(lifetimePoints: number): Level | null {
  for (const l of LEVELS) {
    if (lifetimePoints < l.pointsNeeded) return l;
  }
  return null;
}

export function unlockedStyles(
  lifetimePoints: number,
  matchesWon: number,
  hasPass: boolean,
  hasRoyalCosmetics = false,
  hasFoundersBundle = false,
): string[] {
  if (hasFoundersBundle) return DECKS.map((d) => d.id);
  const out = new Set<string>(["house"]);
  if (hasPass) {
    for (const d of DECKS) {
      if (d.id !== "royal-velvet" && d.id !== "founders-diamond") out.add(d.id);
    }
  }
  if (hasRoyalCosmetics) out.add("royal-velvet");
  if (lifetimePoints >= 25) out.add("classic");
  if (lifetimePoints >= 75) out.add("crimson");
  if (lifetimePoints >= 300) out.add("diamond");
  if (lifetimePoints >= 750) out.add("stars");
  if (lifetimePoints >= 1000) out.add("emerald");
  if (lifetimePoints >= 2500) out.add("crown");
  if (matchesWon >= 1) out.add("win1");
  if (matchesWon >= 5) out.add("win5");
  if (matchesWon >= 10) out.add("win10");
  return [...out];
}

export function unlockedFelts(
  lifetimePoints: number,
  hasPass: boolean,
  hasRoyalCosmetics = false,
  hasFoundersBundle = false,
): string[] {
  if (hasFoundersBundle) return FELTS.map((f) => f.id);
  const out = new Set<string>(["classic-green"]);
  if (hasPass) {
    for (const f of FELTS) {
      if (f.id !== "royal-velvet-felt" && f.id !== "founders-gold-felt") {
        out.add(f.id);
      }
    }
  }
  if (hasRoyalCosmetics) out.add("royal-velvet-felt");
  if (lifetimePoints >= 150) out.add("porch");
  if (lifetimePoints >= 500) out.add("sunset");
  if (lifetimePoints >= 1500) out.add("head-table");
  return [...out];
}

// ---------- Match / hand state ----------

export interface TunkPlayer {
  id: string;
  name: string;
  img: string | null;
  isHuman: boolean;
  hand: CardT[];
  spreads: CardT[][];
  /** Match bankroll — starts at 5, moves with end-of-hand points. */
  points: number;
  /** Points won across the whole match (for the lifetime record). */
  matchPointsWon: number;
}

export interface PointsDelta {
  playerId: string;
  name: string;
  delta: number;
  note: string;
}

export interface HandState {
  players: TunkPlayer[];
  stock: CardT[];
  discardPile: CardT[];
  turn: number;
  /** "drop" = start of turn, the player may drop before drawing.
      "draw" = must draw. "meld" = drawn, may lay/hit, then discard. */
  phase: "drop" | "draw" | "meld" | "over";
  drawnFrom: "stock" | "discard" | null;
  lastAction: string;
  winnerIndex: number | null;
  endReason:
    | "drop"
    | "out-discard"
    | "tonk-out"
    | "natural"
    | "stock-out"
    | null;
  deltas: PointsDelta[];
  matchTarget: number;
  handNumber: number;
}

export function buildDeck(include8910: boolean = true): CardT[] {
  const suits: Suit[] = ["spades", "hearts", "diamonds", "clubs"];
  const cards: CardT[] = [];
  for (const s of suits) {
    for (let r = 2; r <= 14; r++) {
      if (!include8910 && (r === 8 || r === 9 || r === 10)) continue;
      cards.push({ suit: s, rank: r });
    }
  }
  return cards;
}

export function shuffle(cards: CardT[]): CardT[] {
  const a = [...cards];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i];
    a[i] = a[j] as CardT;
    a[j] = t as CardT;
  }
  return a;
}

export function sortHand(hand: CardT[]): CardT[] {
  const order: Record<Suit, number> = {
    spades: 0,
    hearts: 1,
    clubs: 2,
    diamonds: 3,
  };
  return [...hand].sort(
    (x, y) => order[x.suit] - order[y.suit] || y.rank - x.rank,
  );
}

function makePlayers(
  playerCount: 2 | 4,
  humanName: string,
): TunkPlayer[] {
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

/** Deal a fresh hand. Returns the state plus a natural-tunk note:
 *  - exactly one player at 50: that player wins double right away.
 *  - two or more at 50: hand thrown in — caller should redeal. */
export function dealHand(
  players: TunkPlayer[],
  matchTarget: number,
  handNumber: number,
): { state: HandState; natural: number | null; redeal: boolean } {
  const deck = shuffle(buildDeck());
  const next = players.map((p) => ({
    ...p,
    hand: [] as CardT[],
    spreads: [] as CardT[][],
    // Free top-up: a player at 0 comes back to 5 so nobody gets stuck.
    points: p.points <= 0 ? START_POINTS : p.points,
  }));
  for (let i = 0; i < 5; i++) {
    for (const p of next) {
      p.hand.push(deck.pop() as CardT);
    }
  }
  for (const p of next) p.hand = sortHand(p.hand);
  const discardPile = [deck.pop() as CardT];
  const stock = deck;
  const naturals = next
    .map((p, i) => (handTotal(p.hand) === NATURAL_TUNK_TOTAL ? i : -1))
    .filter((i) => i >= 0);
  const state: HandState = {
    players: next,
    stock,
    discardPile,
    turn: 0,
    phase: "drop",
    drawnFrom: null,
    lastAction:
      naturals.length === 1
        ? `${next[naturals[0] as number]?.name} was dealt a natural Tunk — 50 points!`
        : "Cards dealt. Your turn — drop, or draw.",
    winnerIndex: null,
    endReason: null,
    deltas: [],
    matchTarget,
    handNumber,
  };
  if (naturals.length >= 2) {
    return { state, natural: null, redeal: true };
  }
  if (naturals.length === 1) {
    const winner = naturals[0] as number;
    const scored = scoreHand(state, winner, 2, "natural");
    return { state: scored, natural: winner, redeal: false };
  }
  return { state, natural: null, redeal: false };
}

export function newMatch(
  playerCount: 2 | 4,
  humanName: string,
): HandState {
  const players = makePlayers(playerCount, humanName);
  const target =
    playerCount === 2 ? MATCH_TARGET_1V1 : MATCH_TARGET_4P;
  let dealt = dealHand(players, target, 1);
  // A double natural Tunk is vanishingly rare — redeal until it isn't.
  let guard = 0;
  while (dealt.redeal && guard < 10) {
    dealt = dealHand(players, target, 1);
    guard++;
  }
  return dealt.state;
}

/** Unmatched total = cards still in hand (spreads are already laid down). */
export function unmatchedTotal(p: TunkPlayer): number {
  return handTotal(p.hand);
}

/**
 * End-of-hand points — Al's key ask. Every loser adds up their unmatched
 * cards (Al's values) and the winner takes that many points from each
 * loser. The amount the winner takes is the loser's unmatched total
 * (times `multiplier` for a natural Tunk, a tonk out, or a bad drop).
 * The loser pays out of their match bankroll, which never goes below 0 —
 * a loser with less than the amount owed pays everything they have, and
 * gets a free top-up back to 5 at the next hand.
 */
export function scoreHand(
  state: HandState,
  winnerIndex: number,
  multiplier: number,
  reason: NonNullable<HandState["endReason"]>,
): HandState {
  const players = state.players.map((p) => ({ ...p, hand: [...p.hand], spreads: p.spreads.map((s) => [...s]) }));
  const winner = players[winnerIndex] as TunkPlayer;
  const deltas: PointsDelta[] = [];
  let winnerGain = 0;
  for (let i = 0; i < players.length; i++) {
    if (i === winnerIndex) continue;
    const loser = players[i] as TunkPlayer;
    const owed = unmatchedTotal(loser) * multiplier;
    const paid = Math.min(owed, loser.points);
    loser.points -= paid;
    winnerGain += owed;
    deltas.push({
      playerId: loser.id,
      name: loser.name,
      delta: -paid,
      note:
        paid < owed
          ? `${loser.name}'s unmatched cards were worth ${unmatchedTotal(loser)}${multiplier === 2 ? " — doubled to " + owed : ""} — ${winner.name} takes ${owed}, ${loser.name} paid ${paid} (all they had).`
          : multiplier === 2
            ? `${loser.name}'s unmatched cards were worth ${unmatchedTotal(loser)} — doubled to ${owed}, paid ${paid}.`
            : `${loser.name}'s unmatched cards were worth ${unmatchedTotal(loser)} — paid ${paid}.`,
    });
  }
  winner.points += winnerGain;
  winner.matchPointsWon += winnerGain;
  deltas.unshift({
    playerId: winner.id,
    name: winner.name,
    delta: winnerGain,
    note:
      reason === "natural"
        ? `${winner.name} was dealt a natural Tunk — 50 points! Double points.`
        : reason === "tonk-out"
          ? `${winner.name} spread everything and went out — tonk out! Double points.`
          : reason === "drop"
            ? `${winner.name} dropped and held the lowest count.`
            : reason === "stock-out"
              ? `The stock ran out — ${winner.name} held the lowest count.`
              : `${winner.name} went out.`,
  });
  return {
    ...state,
    players,
    phase: "over",
    winnerIndex,
    endReason: reason,
    deltas,
    lastAction: deltas[0]?.note ?? "",
  };
}

/** Resolve a drop at the start of the dropper's turn. */
export function resolveDrop(state: HandState, dropperIndex: number): HandState {
  const totals = state.players.map((p) => unmatchedTotal(p));
  const dropperTotal = totals[dropperIndex] as number;
  const lowest = Math.min(...totals);
  if (dropperTotal === lowest) {
    // Dropper wins — but if someone ties, the dropper still holds the
    // lowest count, so the drop stands and the dropper wins single.
    return scoreHand(state, dropperIndex, 1, "drop");
  }
  // Bad drop: the dropper pays DOUBLE to each player with an equal or
  // lower total — in this game the doubled payment comes from the dropper
  // alone; the other losers pay single. The lowest player wins the hand.
  const winnerIndex = totals.indexOf(lowest);
  const before = state.players;
  const fresh = before.map((p) => ({ ...p, hand: [...p.hand], spreads: p.spreads.map((s) => [...s]) }));
  const freshWinner = fresh[winnerIndex] as TunkPlayer;
  const deltas: PointsDelta[] = [];
  let winnerGain = 0;
  for (let i = 0; i < fresh.length; i++) {
    if (i === winnerIndex) continue;
    const loser = fresh[i] as TunkPlayer;
    const base = unmatchedTotal(loser);
    const owed = i === dropperIndex ? base * 2 : base;
    const paid = Math.min(owed, loser.points);
    loser.points -= paid;
    winnerGain += owed;
    deltas.push({
      playerId: loser.id,
      name: loser.name,
      delta: -paid,
      note:
        i === dropperIndex
          ? `${loser.name} dropped on ${base} and lost — pays double: ${owed}, paid ${paid}.`
          : `${loser.name}'s unmatched cards were worth ${base} — paid ${paid}.`,
    });
  }
  freshWinner.points += winnerGain;
  freshWinner.matchPointsWon += winnerGain;
  deltas.unshift({
    playerId: freshWinner.id,
    name: freshWinner.name,
    delta: winnerGain,
    note: `${freshWinner.name} held the lowest count (${lowest}) and wins the hand.`,
  });
  return {
    ...state,
    players: fresh,
    phase: "over",
    winnerIndex,
    endReason: "drop",
    deltas,
    lastAction: `${state.players[dropperIndex]?.name} dropped on ${dropperTotal} — but ${state.players[winnerIndex]?.name} held ${lowest}. Bad drop!`,
  };
}

/** Stock ran out: lowest unmatched total wins a single stake. */
export function resolveStockOut(state: HandState): HandState {
  const totals = state.players.map((p) => unmatchedTotal(p));
  const lowest = Math.min(...totals);
  const winnerIndex = totals.indexOf(lowest);
  return scoreHand(state, winnerIndex, 1, "stock-out");
}

// ---------- Computer play ----------

/** Would taking the discard let this player lay a spread right away? */
export function aiWantsDiscard(state: HandState, idx: number): boolean {
  const top = state.discardPile[state.discardPile.length - 1];
  if (!top) return false;
  const p = state.players[idx] as TunkPlayer;
  const withCard = [...p.hand, top];
  return findSpreads(withCard).length > findSpreads(p.hand).length;
}

export function aiWantsDrop(state: HandState, idx: number): boolean {
  const p = state.players[idx] as TunkPlayer;
  // Conservative: only drop on a genuinely low count with a spread down.
  // (A looser rule ends nearly every hand in a drop.)
  return (
    p.spreads.length > 0 &&
    unmatchedTotal(p) <= 10 &&
    Math.random() < 0.4
  );
}

/** Pick a discard: highest-value card that helps the hand least. */
export function aiChooseDiscard(p: TunkPlayer): CardT {
  const hand = p.hand;
  let best: CardT = hand[0] as CardT;
  let bestScore = -Infinity;
  for (const c of hand) {
    const pairs = hand.filter((o) => o !== c && o.rank === c.rank).length;
    const near = hand.filter(
      (o) =>
        o !== c &&
        o.suit === c.suit &&
        Math.abs(runValue(o) - runValue(c)) <= 2,
    ).length;
    // Usefulness lowers the score; value raises it (shed deadwood first).
    const score = alValue(c) * 2 - pairs * 12 - near * 6;
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}
