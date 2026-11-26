// Pitty Pat table — 5-card pairing game. Draw a card, then discard.
// Hold 3 pairs to call Pitty Pat and win the hand. Winner takes 15
// points from each other player. First to 150 (1v1) or 300 (4-player).
//
// Same look as the Tunk table: framed cartoon portraits, big readable
// cards, spread-out layout, player's hand at the bottom. Table colors
// live in ./tableStyle.ts (placeholder: dark walnut + copper).

import { useEffect, useMemo, useRef, useState } from "react";
import {
  alValue,
  cardId,
  cardLabel,
  shuffle,
  sortHand,
  DECKS,
  FELTS,
  type CardT,
  type TunkPlayer,
} from "./tunk";
import {
  aiChoosePittyPatDiscard,
  dealPittyPatHand,
  hasWinningThreePairs,
  newPittyPatMatch,
  pairCount,
  partitionPairs,
  scorePittyPatHand,
  type PittyPatRules,
  type PittyPatState,
} from "./pittypat";
import { TABLE_STYLE } from "./tableStyle";

interface Props {
  playerCount: 2 | 4;
  humanName: string;
  deckId: string;
  feltId: string;
  rules: PittyPatRules;
  onMatchEnd: (result: {
    matchWon: boolean;
    pointsWon: number;
    handsWon: number;
    handsPlayed: number;
  }) => void;
  onLeave: () => void;
}

function deckById(id: string) {
  return DECKS.find((d) => d.id === id) ?? DECKS[0] as (typeof DECKS)[number];
}
function feltById(id: string) {
  return FELTS.find((f) => f.id === id) ?? FELTS[0] as (typeof FELTS)[number];
}

function clonePlayers(players: TunkPlayer[]): TunkPlayer[] {
  return players.map((p) => ({
    ...p,
    hand: [...p.hand],
    spreads: p.spreads.map((sp) => [...sp]),
  }));
}

/** Draw one card for a player. Returns the same state object when the
    player cannot draw (empty stock and nothing to reshuffle). */
function drawCard(
  s: PittyPatState,
  playerIndex: number,
  from: "stock" | "discard",
): PittyPatState {
  const players = clonePlayers(s.players);
  const me = players[playerIndex] as TunkPlayer;
  let stock = [...s.stock];
  let pile = [...s.discardPile];
  if (from === "discard") {
    const card = pile.pop();
    if (!card) return s;
    me.hand.push(card);
  } else {
    if (stock.length === 0) {
      // Reshuffle the discard pile (keep the top card) into the stock.
      const top = pile[pile.length - 1];
      const rest = pile.slice(0, -1);
      if (rest.length === 0) return s;
      stock = shuffle(rest);
      pile = top ? [top] : [];
    }
    const card = stock.pop();
    if (!card) return s;
    me.hand.push(card);
  }
  me.hand = sortHand(me.hand);
  return {
    ...s,
    players,
    stock,
    discardPile: pile,
    phase: "discard",
    lastAction: `${me.name} drew a card.`,
  };
}

function discardCard(
  s: PittyPatState,
  playerIndex: number,
  card: CardT,
): PittyPatState {
  const players = clonePlayers(s.players);
  const me = players[playerIndex] as TunkPlayer;
  me.hand = me.hand.filter((c) => cardId(c) !== cardId(card));
  return {
    ...s,
    players,
    discardPile: [...s.discardPile, card],
    turn: (playerIndex + 1) % players.length,
    phase: "draw",
    lastAction: `${me.name} discarded ${cardLabel(card)}.`,
  };
}

function CardView({
  card,
  deck,
  small,
  selected,
  paired,
  faceDown,
  onClick,
}: {
  card: CardT;
  deck: (typeof DECKS)[number];
  small?: boolean;
  selected?: boolean;
  paired?: boolean;
  faceDown?: boolean;
  onClick?: () => void;
}) {
  const red = card.suit === "hearts" || card.suit === "diamonds";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative shrink-0 rounded-lg border text-center font-black shadow ${
        small ? "h-14 w-10 text-sm" : "h-20 w-14 text-xl"
      } ${selected ? "ring-4 ring-amber-400 -translate-y-2" : paired ? "ring-2 ring-emerald-500" : "ring-1 ring-black/20"} ${
        faceDown ? "" : red ? "text-red-700" : "text-slate-900"
      }`}
      style={{
        background: faceDown ? deck.back : deck.face,
      }}
      aria-label={faceDown ? "Face-down card" : cardLabel(card)}
    >
      {!faceDown && (
        <span className="flex h-full flex-col items-center justify-center leading-none">
          <span>{card.rank === 14 ? "A" : card.rank === 11 ? "J" : card.rank === 12 ? "Q" : card.rank === 13 ? "K" : card.rank}</span>
          <span className="text-base">
            {card.suit === "spades" ? "♠" : card.suit === "hearts" ? "♥" : card.suit === "diamonds" ? "♦" : "♣"}
          </span>
          <span className="text-[10px] font-bold text-slate-500">
            {alValue(card)} pts
          </span>
        </span>
      )}
    </button>
  );
}

function PittySeat({
  player,
  isTurn,
}: {
  player: TunkPlayer;
  isTurn: boolean;
}) {
  const initial = player.name.trim().charAt(0).toUpperCase() || "?";
  const pairs = pairCount(player.hand);
  return (
    <div className="flex w-20 flex-col items-center">
      <div
        className={`rounded-xl border-4 p-0.5 ${
          isTurn ? "shadow-[0_0_14px_rgba(245,158,11,0.8)]" : ""
        }`}
        style={{
          background: TABLE_STYLE.portraitBack,
          borderColor: isTurn ? TABLE_STYLE.turnGlow : TABLE_STYLE.portraitFrame,
        }}
      >
        {player.img ? (
          <img
            src={player.img}
            alt={player.name}
            className="h-12 w-12 rounded-lg object-cover"
          />
        ) : (
          <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-700 text-xl font-black text-white">
            {initial}
          </span>
        )}
      </div>
      <div
        className="mt-1 w-full rounded-md px-1 py-0.5 text-center"
        style={{ background: TABLE_STYLE.namePlateBg }}
      >
        <p
          className="truncate text-[11px] font-black"
          style={{ color: TABLE_STYLE.namePlateText }}
        >
          {player.name}
        </p>
        <p
          className="text-[10px] font-bold"
          style={{ color: TABLE_STYLE.namePlateSubtext }}
        >
          {player.points} pts
        </p>
      </div>
      <p
        className="mt-0.5 text-[10px] font-bold"
        style={{ color: TABLE_STYLE.spreadNote }}
      >
        {pairs} pair{pairs === 1 ? "" : "s"} · {player.hand.length} cards
      </p>
    </div>
  );
}

export function PittyPatTable(props: Props) {
  const deck = useMemo(() => deckById(props.deckId), [props.deckId]);
  const felt = useMemo(() => feltById(props.feltId), [props.feltId]);
  const [state, setState] = useState<PittyPatState>(() =>
    newPittyPatMatch(props.playerCount, props.humanName, props.rules),
  );
  const [rules, setRules] = useState<PittyPatRules>(props.rules);
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");
  const [handsPlayed, setHandsPlayed] = useState(0);
  const [handsWon, setHandsWon] = useState(0);
  const [matchPointsWon, setMatchPointsWon] = useState(0);
  const [matchOver, setMatchOver] = useState(false);
  // Counts a finished hand exactly once, even if the state object is
  // re-created: keyed on the hand number, never on render count.
  const countedHandRef = useRef(0);

  const you = state.players[0] as TunkPlayer;
  const humanTurn =
    state.phase !== "over" && state.turn === 0 && !matchOver;
  const topDiscard =
    state.discardPile[state.discardPile.length - 1] ?? null;
  const yourPairs = partitionPairs(you.hand);
  const yourPairedIds = new Set(yourPairs.pairs.flat().map(cardId));

  // Count a finished hand exactly once and check the match target.
  // Runs as an effect (never inside a state updater) so StrictMode or a
  // re-render can never double-count a hand.
  useEffect(() => {
    if (state.phase !== "over") return;
    if (countedHandRef.current === state.handNumber) return;
    countedHandRef.current = state.handNumber;
    const winnerIsYou = state.winnerIndex === 0;
    const gained =
      winnerIsYou && state.deltas[0] ? state.deltas[0].delta : 0;
    setHandsPlayed((n) => n + 1);
    if (winnerIsYou) {
      setHandsWon((n) => n + 1);
      setMatchPointsWon((n) => n + gained);
    }
    const leader = state.players.reduce((best, p) =>
      p.points > best.points ? p : best,
    );
    if (leader.points >= state.matchTarget) {
      setMatchOver(true);
    }
  }, [state]);

  // ----- computer turns -----
  useEffect(() => {
    if (state.phase === "over" || matchOver) return;
    if (state.turn === 0) return;
    const timer = setTimeout(() => {
      setState((prev) => {
        if (prev.phase === "over" || prev.turn === 0) return prev;
        const idx = prev.turn;
        const me = prev.players[idx] as TunkPlayer;
        // Draw: take the discard if it pairs something in hand.
        const top = prev.discardPile[prev.discardPile.length - 1];
        const pairsWithTop = top
          ? me.hand.some((c) => c.rank === top.rank)
          : false;
        const drawn = drawCard(prev, idx, pairsWithTop ? "discard" : "stock");
        if (drawn === prev) {
          // Stock is empty and nothing to reshuffle — discard and move on.
          return discardCard(prev, idx, aiChoosePittyPatDiscard(me.hand));
        }
        if (hasWinningThreePairs((drawn.players[idx] as TunkPlayer).hand)) {
          return scorePittyPatHand(
            {
              ...drawn,
              lastAction: `${(drawn.players[idx] as TunkPlayer).name} drew the third pair — Pitty Pat!`,
            },
            idx,
            "drew the third pair",
          );
        }
        const disc = aiChoosePittyPatDiscard((drawn.players[idx] as TunkPlayer).hand);
        return discardCard(drawn, idx, disc);
      });
    }, 1100);
    return () => clearTimeout(timer);
  }, [state, matchOver]);

  // ----- human actions -----
  function humanDraw(from: "stock" | "discard") {
    if (!humanTurn || state.phase !== "draw") return;
    if (from === "discard" && !topDiscard) return;
    if (from === "stock" && state.stock.length === 0 && state.discardPile.length <= 1) {
      setMessage("Stock is empty — discard a card to end your turn.");
      setState((prev) => ({ ...prev, phase: "discard" as const }));
      return;
    }
    setSelected(null);
    setMessage("");
    setState((prev) => {
      const drawn = drawCard(prev, 0, from);
      if (drawn === prev) return prev;
      if (hasWinningThreePairs((drawn.players[0] as TunkPlayer).hand)) {
        return scorePittyPatHand(
          { ...drawn, lastAction: "You drew your third pair — Pitty Pat!" },
          0,
          "drew the third pair",
        );
      }
      return drawn;
    });
  }

  function humanDiscard() {
    if (!humanTurn || state.phase !== "discard") return;
    if (!selected) {
      setMessage("Pick one card to discard.");
      return;
    }
    const card = you.hand.find((c) => cardId(c) === selected);
    if (!card) return;
    setSelected(null);
    setMessage("");
    setState((prev) => discardCard(prev, 0, card));
  }

  function changeRules(next: PittyPatRules) {
    setRules(next);
    setSelected(null);
    setMessage("");
    setState((prev) =>
      dealPittyPatHand(prev.players, prev.matchTarget, prev.handNumber + 1, next),
    );
  }

  function nextHand() {
    setSelected(null);
    setMessage("");
    setState((prev) =>
      dealPittyPatHand(prev.players, prev.matchTarget, prev.handNumber + 1, rules),
    );
  }

  function finishMatch() {
    props.onMatchEnd({
      matchWon: state.players[0]?.points === Math.max(...state.players.map((p) => p.points)),
      pointsWon: matchPointsWon,
      handsWon,
      handsPlayed,
    });
  }

  const turnName =
    state.phase === "over"
      ? "Hand over"
      : state.players[state.turn]?.name;
  const leader = state.players.reduce((best, p) =>
    p.points > best.points ? p : best,
  );

  return (
    <div className="pb-6">
      {/* Top bar: points race + leave */}
      <div className="flex items-center justify-between gap-2 pt-2">
        <button
          type="button"
          onClick={props.onLeave}
          className="rounded-full bg-black/10 px-3 py-1 text-sm font-bold text-[var(--text)]"
        >
          ← Leave
        </button>
        <p className="text-center text-sm font-black text-[var(--text)]">
          Pitty Pat · First to {state.matchTarget} wins · Hand {state.handNumber}
        </p>
        <p className="rounded-full bg-amber-100 px-3 py-1 text-sm font-black text-amber-900">
          You: {you.points} pts
        </p>
      </div>

      {/* House rules — changing one re-deals the hand with the new rules */}
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {(
          [
            ["include8910", "8–10 in deck"],
            ["firstPorterBonus", "First Porter +10"],
            ["lastLowBonus", "Last Low +10"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={rules[key]}
            onClick={() => changeRules({ ...rules, [key]: !rules[key] })}
            className={`rounded-full px-3 py-1.5 text-xs font-black ${
              rules[key]
                ? "bg-[#14532d] text-white"
                : "bg-black/10 text-[var(--text)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-center text-xs font-bold text-[var(--dim)]">
        Draw a card, then discard. Hold 3 pairs to call Pitty Pat! Winner
        takes 15 points from each player. Pairs stay in your hand.
      </p>

      {/* Opponents */}
      <div className="mt-3 flex justify-center gap-3">
        {state.players.slice(1).map((p, i) => (
          <PittySeat
            key={p.id}
            player={p}
            isTurn={state.turn === i + 1 && state.phase !== "over"}
          />
        ))}
      </div>

      {/* Table — frame/trim from ./tableStyle.ts (PENDING Al's confirmed
          look); felt centre is the unlockable theme (FELTS in ./tunk.ts). */}
      <div
        className="mt-3 rounded-[28px] border-[10px] p-3 shadow-xl"
        style={{ background: felt.css, borderColor: TABLE_STYLE.frame }}
      >
        <div
          className="rounded-[18px] border-2 p-3"
          style={{ borderColor: TABLE_STYLE.innerLine }}
        >
          {/* Pairs on the table */}
          <div className="space-y-2">
            {state.players.map((p) => {
              const { pairs } = partitionPairs(p.hand);
              return (
                <div key={p.id} className="flex flex-wrap items-center gap-2">
                  <span
                    className="w-16 truncate text-[11px] font-black"
                    style={{ color: TABLE_STYLE.feltText }}
                  >
                    {p.name}
                  </span>
                  {pairs.length === 0 ? (
                    <span
                      className="text-[11px] font-bold"
                      style={{ color: TABLE_STYLE.feltTextDim }}
                    >
                      no pairs yet
                    </span>
                  ) : (
                    pairs.map((pair, pi) => (
                      <span
                        key={pi}
                        className="flex gap-0.5 rounded-lg border border-amber-100/30 bg-black/20 p-1"
                      >
                        {pair.map((c) => (
                          <CardView
                            key={cardId(c)}
                            card={c}
                            deck={deck}
                            small
                          />
                        ))}
                      </span>
                    ))
                  )}
                </div>
              );
            })}
          </div>

          {/* Stock + discard */}
          <div className="mt-3 flex items-center justify-center gap-6">
            <div className="flex flex-col items-center">
              <button
                type="button"
                disabled={!humanTurn || state.phase !== "draw"}
                onClick={() => humanDraw("stock")}
                className="disabled:opacity-40"
                aria-label="Draw from the stock"
              >
                <CardView
                  card={{ suit: "spades", rank: 2 }}
                  deck={deck}
                  faceDown
                />
              </button>
              <span
                className="mt-1 text-[11px] font-bold"
                style={{ color: TABLE_STYLE.feltText }}
              >
                Stock ({state.stock.length})
              </span>
            </div>
            <div className="flex flex-col items-center">
              {topDiscard ? (
                <button
                  type="button"
                  disabled={!humanTurn || state.phase !== "draw"}
                  onClick={() => humanDraw("discard")}
                  className="disabled:opacity-40"
                  aria-label="Take the top discard"
                >
                  <CardView card={topDiscard} deck={deck} />
                </button>
              ) : (
                <span
                  className="flex h-20 w-14 items-center justify-center rounded-lg border border-dashed text-[11px] font-bold"
                  style={{
                    borderColor: TABLE_STYLE.feltTextDim,
                    color: TABLE_STYLE.feltTextDim,
                  }}
                >
                  empty
                </span>
              )}
              <span
                className="mt-1 text-[11px] font-bold"
                style={{ color: TABLE_STYLE.feltText }}
              >
                Discard pile
              </span>
            </div>
          </div>

          <p
            className="mt-2 text-center text-sm font-bold"
            style={{ color: TABLE_STYLE.feltText }}
          >
            {state.phase === "over"
              ? state.lastAction
              : `${humanTurn ? "Your" : `${turnName}'s`} turn — ${
                  state.phase === "draw"
                    ? "draw from the stock or the discard pile"
                    : "discard one card"
                }`}
          </p>
          {message && (
            <p
              className="mt-1 text-center text-sm font-bold"
              style={{ color: TABLE_STYLE.namePlateText }}
            >
              {message}
            </p>
          )}
        </div>
      </div>

      {/* Action buttons */}
      {humanTurn && state.phase === "draw" && (
        <p className="mt-3 text-center text-sm font-bold text-[var(--dim)]">
          Tap the stock or the top discard to draw.
        </p>
      )}
      {humanTurn && state.phase === "discard" && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={humanDiscard}
            disabled={!selected}
            className="flex-1 rounded-2xl bg-amber-600 px-4 py-3 text-base font-black text-white shadow disabled:opacity-40"
          >
            Discard picked card
          </button>
        </div>
      )}
      {!humanTurn && state.phase !== "over" && (
        <p className="mt-3 text-center text-sm font-bold text-[var(--dim)]">
          {state.players[state.turn]?.name} is thinking…
        </p>
      )}

      {/* Your seat + hand */}
      <div className="mt-3 flex items-center justify-center gap-3">
        <PittySeat player={you} isTurn={humanTurn} />
        <div className="text-sm font-bold text-[var(--dim)]">
          <p>
            Your pairs: <b className="text-[var(--text)]">{yourPairs.pairs.length}</b>
          </p>
          <p>
            Leader: <b className="text-[var(--text)]">{leader.name} ({leader.points})</b>
          </p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-1.5">
        {you.hand.map((c) => {
          const id = cardId(c);
          const isSel = selected === id;
          return (
            <CardView
              key={id}
              card={c}
              deck={deck}
              selected={isSel}
              paired={yourPairedIds.has(id)}
              onClick={() => {
                if (!humanTurn || state.phase !== "discard") return;
                setSelected((prev) => (prev === id ? null : id));
              }}
            />
          );
        })}
      </div>
      <p className="mt-2 text-center text-xs font-bold text-[var(--dim)]">
        Tap a card to pick it to discard. Paired cards are ringed green —
        hold 3 pairs to win the hand.
      </p>

      {/* Hand-over panel */}
      {state.phase === "over" && !matchOver && (
        <div className="mt-4 rounded-3xl bg-[var(--surface)] p-4 shadow">
          <h3 className="text-lg font-black text-[var(--text)]">
            Hand {state.handNumber} over — points added up
          </h3>
          <p className="mt-1 text-sm font-bold text-[var(--dim)]">
            {state.lastAction}
          </p>
          <ul className="mt-3 space-y-1">
            {state.deltas.map((d) => (
              <li
                key={d.playerId}
                className="flex justify-between gap-2 text-sm"
              >
                <span className="font-bold text-[var(--text)]">{d.name}</span>
                <span
                  className={`font-black ${d.delta >= 0 ? "text-emerald-700" : "text-red-700"}`}
                >
                  {d.delta >= 0 ? "+" : ""}
                  {d.delta} pts
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 space-y-1">
            {state.deltas
              .filter((d) => d.delta < 0)
              .map((d) => (
                <p key={d.playerId} className="text-xs text-[var(--dim)]">
                  {d.note}
                </p>
              ))}
          </div>
          <button
            type="button"
            onClick={nextHand}
            className="mt-4 w-full rounded-2xl bg-emerald-700 px-4 py-3 text-base font-black text-white shadow"
          >
            Next hand →
          </button>
        </div>
      )}

      {/* Match-over panel */}
      {matchOver && (
        <div className="mt-4 rounded-3xl bg-[var(--surface)] p-4 shadow">
          <h3 className="text-xl font-black text-[var(--text)]">
            {you.points >= state.matchTarget
              ? "You won the match! 🏆"
              : `${leader.name} won the match`}
          </h3>
          <p className="mt-1 text-sm text-[var(--dim)]">
            First to {state.matchTarget} points. Final points:{" "}
            {state.players.map((p) => `${p.name} ${p.points}`).join(" · ")}
          </p>
          <p className="mt-1 text-sm text-[var(--dim)]">
            Hands played: {handsPlayed} · Hands you won: {handsWon} · Points
            you won this match: {matchPointsWon}
          </p>
          <button
            type="button"
            onClick={finishMatch}
            className="mt-4 w-full rounded-2xl bg-emerald-700 px-4 py-3 text-base font-black text-white shadow"
          >
            Save result &amp; back to the house
          </button>
        </div>
      )}
    </div>
  );
}
