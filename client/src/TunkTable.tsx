// Tunk table — players as framed cartoon portraits with name plates,
// big readable cards, spread-out layout, player's hand at the bottom
// sorted by suit, legal plays clearly marked.
//
// TABLE LOOK IS ON HOLD: Al is still deciding the pattern. Do NOT copy
// the C.F.N.B. table and do NOT use the pirate-game pictures — both
// directions were corrected. Every table color lives in ./tableStyle.ts
// (placeholder: dark walnut + copper) so the confirmed look can be
// swapped in by changing that one file.

import { useEffect, useMemo, useRef, useState } from "react";
import {
  alValue,
  aiChooseDiscard,
  aiWantsDiscard,
  aiWantsDrop,
  canHit,
  cardId,
  cardLabel,
  dealHand,
  findSpreads,
  handTotal,
  isValidSpread,
  newMatch,
  resolveDrop,
  resolveStockOut,
  scoreHand,
  sortHand,
  unmatchedTotal,
  DECKS,
  FELTS,
  type CardT,
  type HandState,
  type TunkPlayer,
} from "./tunk";
import { TABLE_STYLE } from "./tableStyle";

interface Props {
  playerCount: 2 | 4;
  humanName: string;
  deckId: string;
  feltId: string;
  lifetimePoints: number;
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

function CardView({
  card,
  deck,
  small,
  selected,
  faceDown,
  onClick,
}: {
  card: CardT;
  deck: (typeof DECKS)[number];
  small?: boolean;
  selected?: boolean;
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
      } ${selected ? "ring-4 ring-amber-400 -translate-y-2" : "ring-1 ring-black/20"} ${
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

function SeatPortrait({
  player,
  isTurn,
}: {
  player: TunkPlayer;
  isTurn: boolean;
}) {
  const initial = player.name.trim().charAt(0).toUpperCase() || "?";
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
      {player.spreads.length > 0 && (
        <p
          className="mt-0.5 text-[10px] font-bold"
          style={{ color: TABLE_STYLE.spreadNote }}
        >
          {player.spreads.length} spread{player.spreads.length > 1 ? "s" : ""} down
        </p>
      )}
      <p
        className="text-[10px] font-bold"
        style={{ color: TABLE_STYLE.namePlateSubtext }}
      >
        {player.hand.length} card{player.hand.length === 1 ? "" : "s"} ·{" "}
        {unmatchedTotal(player)} unmatched
      </p>
    </div>
  );
}

export function TunkTable(props: Props) {
  const deck = useMemo(() => deckById(props.deckId), [props.deckId]);
  const felt = useMemo(() => feltById(props.feltId), [props.feltId]);
  const [state, setState] = useState<HandState>(() =>
    newMatch(props.playerCount, props.humanName),
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [hitTarget, setHitTarget] = useState<{
    player: number;
    spread: number;
  } | null>(null);
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
        // Drop at the start of the turn?
        if (prev.phase === "drop" && aiWantsDrop(prev, idx)) {
          return resolveDrop(prev, idx);
        }
        // Draw.
        let s: HandState = { ...prev, phase: "meld" as const, drawnFrom: "stock" as const };
        const players = s.players.map((pl) => ({
          ...pl,
          hand: [...pl.hand],
          spreads: pl.spreads.map((sp) => [...sp]),
        }));
        s = { ...s, players };
        const me = players[idx] as TunkPlayer;
        const takeDiscard = aiWantsDiscard(prev, idx) && topDiscard;
        if (takeDiscard) {
          const pile = [...s.discardPile];
          const card = pile.pop() as CardT;
          me.hand.push(card);
          s = { ...s, discardPile: pile, drawnFrom: "discard" as const };
        } else if (s.stock.length === 0) {
          return resolveStockOut(prev);
        } else {
          const stock = [...s.stock];
          const card = stock.pop() as CardT;
          me.hand.push(card);
          s = { ...s, stock, drawnFrom: "stock" as const };
        }
        // Lay every spread the computer can find.
        let made = true;
        while (made) {
          made = false;
          const spreads = findSpreads(me.hand);
          if (spreads.length > 0) {
            const sp = spreads[0] as CardT[];
            const ids = new Set(sp.map(cardId));
            me.hand = me.hand.filter((c) => !ids.has(cardId(c)));
            me.spreads.push(sp);
            made = true;
          }
        }
        // Hit other players' spreads where possible.
        for (const c of [...me.hand]) {
          for (let pi = 0; pi < players.length; pi++) {
            if (pi === idx) continue;
            const other = players[pi] as TunkPlayer;
            for (let si = 0; si < other.spreads.length; si++) {
              const sp = other.spreads[si] as CardT[];
              if (canHit(sp, c)) {
                me.hand = me.hand.filter((x) => cardId(x) !== cardId(c));
                other.spreads[si] = [...sp, c];
                break;
              }
            }
          }
        }
        // Tonk out: spread everything, no card left to discard.
        if (me.hand.length === 0) {
          return scoreHand({ ...s, lastAction: `${me.name} spread everything — tonk out!` }, idx, 2, "tonk-out");
        }
        // Discard.
        const disc = aiChooseDiscard(me);
        me.hand = me.hand.filter((c) => cardId(c) !== cardId(disc));
        s = {
          ...s,
          discardPile: [...s.discardPile, disc],
          turn: (idx + 1) % s.players.length,
          phase: "drop",
          drawnFrom: null,
          lastAction: `${me.name} discarded ${cardLabel(disc)}.`,
        };
        // Out on a final discard.
        if (me.hand.length === 0) {
          return scoreHand({ ...s, lastAction: `${me.name} went out on a final discard.` }, idx, 1, "out-discard");
        }
        return s;
      });
    }, 1100);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, matchOver]);

  // ----- human actions -----
  function humanDraw(from: "stock" | "discard") {
    if (!humanTurn || state.phase !== "draw") return;
    if (from === "discard" && !topDiscard) return;
    if (from === "stock" && state.stock.length === 0) {
      setState((prev) => resolveStockOut(prev));
      return;
    }
    setState((prev) => {
      const players = prev.players.map((pl) => ({
        ...pl,
        hand: [...pl.hand],
        spreads: pl.spreads.map((sp) => [...sp]),
      }));
      const me = players[0] as TunkPlayer;
      let stock = [...prev.stock];
      let pile = [...prev.discardPile];
      if (from === "discard") {
        me.hand.push(pile.pop() as CardT);
      } else {
        me.hand.push(stock.pop() as CardT);
      }
      me.hand = sortHand(me.hand);
      return {
        ...prev,
        players,
        stock,
        discardPile: pile,
        phase: "meld",
        drawnFrom: from,
        lastAction:
          from === "discard"
            ? `You took ${cardLabel(topDiscard as CardT)} from the discard pile.`
            : "You drew from the stock.",
      };
    });
  }

  function humanDrop() {
    if (!humanTurn || state.phase !== "drop") return;
    setState((prev) => resolveDrop(prev, 0));
  }

  function humanLaySpread() {
    if (!humanTurn || state.phase !== "meld") return;
    const cards = you.hand.filter((c) => selected.includes(cardId(c)));
    if (!isValidSpread(cards)) {
      setMessage("That isn't a spread — 3–4 of a kind, or 3+ in a row of the same suit.");
      return;
    }
    setSelected([]);
    setMessage("");
    setState((prev) => {
      const players = prev.players.map((pl) => ({
        ...pl,
        hand: [...pl.hand],
        spreads: pl.spreads.map((sp) => [...sp]),
      }));
      const me = players[0] as TunkPlayer;
      const ids = new Set(cards.map(cardId));
      me.hand = me.hand.filter((c) => !ids.has(cardId(c)));
      me.spreads.push(cards);
      const s: HandState = {
        ...prev,
        players,
        lastAction: `You laid down ${cards.map(cardLabel).join(" ")}.`,
      };
      if (me.hand.length === 0) {
        return scoreHand(s, 0, 2, "tonk-out");
      }
      return s;
    });
  }

  function humanHit(spreadOwner: number, spreadIndex: number) {
    if (!humanTurn || state.phase !== "meld") return;
    if (selected.length !== 1) {
      setMessage("Pick one card from your hand to hit a spread with.");
      return;
    }
    const card = you.hand.find((c) => cardId(c) === selected[0]);
    if (!card) return;
    const owner = state.players[spreadOwner] as TunkPlayer;
    const spread = owner.spreads[spreadIndex];
    if (!spread || !canHit(spread, card)) {
      setMessage("That card doesn't fit that spread.");
      return;
    }
    setSelected([]);
    setMessage("");
    setState((prev) => {
      const players = prev.players.map((pl) => ({
        ...pl,
        hand: [...pl.hand],
        spreads: pl.spreads.map((sp) => [...sp]),
      }));
      const me = players[0] as TunkPlayer;
      me.hand = me.hand.filter((c) => cardId(c) !== cardId(card));
      const target = players[spreadOwner] as TunkPlayer;
      target.spreads[spreadIndex] = [...(target.spreads[spreadIndex] as CardT[]), card];
      const s: HandState = {
        ...prev,
        players,
        lastAction: `You hit ${target.name}'s spread with ${cardLabel(card)}.`,
      };
      if (me.hand.length === 0) {
        return scoreHand(s, 0, 2, "tonk-out");
      }
      return s;
    });
  }

  function humanDiscard() {
    if (!humanTurn || state.phase !== "meld") return;
    if (selected.length !== 1) {
      setMessage("Pick one card to discard.");
      return;
    }
    const card = you.hand.find((c) => cardId(c) === selected[0]);
    if (!card) return;
    setSelected([]);
    setMessage("");
    setState((prev) => {
      const players = prev.players.map((pl) => ({
        ...pl,
        hand: [...pl.hand],
        spreads: pl.spreads.map((sp) => [...sp]),
      }));
      const me = players[0] as TunkPlayer;
      me.hand = me.hand.filter((c) => cardId(c) !== cardId(card));
      const s: HandState = {
        ...prev,
        players,
        discardPile: [...prev.discardPile, card],
        turn: 1 % prev.players.length,
        phase: "drop",
        drawnFrom: null,
        lastAction: `You discarded ${cardLabel(card)}.`,
      };
      if (me.hand.length === 0) {
        return scoreHand(s, 0, 1, "out-discard");
      }
      return s;
    });
  }

  function nextHand() {
    setSelected([]);
    setHitTarget(null);
    setMessage("");
    setState((prev) => {
      const dealt = dealHand(prev.players, prev.matchTarget, prev.handNumber + 1);
      let guard = 0;
      let d = dealt;
      while (d.redeal && guard < 10) {
        d = dealHand(prev.players, prev.matchTarget, prev.handNumber + 1);
        guard++;
      }
      return d.state;
    });
  }

  function finishMatch() {
    props.onMatchEnd({
      matchWon: state.players[0]?.points === Math.max(...state.players.map((p) => p.points)),
      pointsWon: matchPointsWon,
      handsWon,
      handsPlayed,
    });
  }

  const selectedCards = you.hand.filter((c) => selected.includes(cardId(c)));
  const selectionIsSpread =
    selectedCards.length >= 3 && isValidSpread(selectedCards);
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
          First to {state.matchTarget} wins · Hand {state.handNumber}
        </p>
        <p className="rounded-full bg-amber-100 px-3 py-1 text-sm font-black text-amber-900">
          You: {you.points} pts
        </p>
      </div>

      {/* Opponents */}
      <div className="mt-3 flex justify-center gap-3">
        {state.players.slice(1).map((p, i) => (
          <SeatPortrait
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
          {/* Spreads on the table */}
          <div className="space-y-2">
            {state.players.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-2">
                <span
                  className="w-16 truncate text-[11px] font-black"
                  style={{ color: TABLE_STYLE.feltText }}
                >
                  {p.name}
                </span>
                {p.spreads.length === 0 ? (
                  <span
                    className="text-[11px] font-bold"
                    style={{ color: TABLE_STYLE.feltTextDim }}
                  >
                    no spreads yet
                  </span>
                ) : (
                  p.spreads.map((sp, si) => {
                    const playerIndex = state.players.indexOf(p);
                    const isTarget =
                      hitTarget?.player === playerIndex &&
                      hitTarget?.spread === si;
                    return (
                      <button
                        key={si}
                        type="button"
                        onClick={() => {
                          if (isTarget && state.turn === 0) {
                            humanHit(playerIndex, si);
                            setHitTarget(null);
                          } else {
                            setHitTarget({ player: playerIndex, spread: si });
                            setMessage(
                              "Pick one card from your hand, then tap this spread again to hit it.",
                            );
                          }
                        }}
                        className={`flex gap-0.5 rounded-lg border p-1 ${
                          isTarget
                            ? "border-amber-300 bg-amber-300/20"
                            : "border-amber-100/30 bg-black/20"
                        }`}
                        title="Tap to hit this spread"
                      >
                        {sp.map((c) => (
                          <CardView
                            key={cardId(c)}
                            card={c}
                            deck={deck}
                            small
                          />
                        ))}
                      </button>
                    );
                  })
                )}
              </div>
            ))}
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
              : `${turnName}'s turn — ${
                  state.phase === "drop"
                    ? "drop, or draw a card"
                    : state.phase === "draw"
                      ? "draw from the stock or the discard pile"
                      : "lay spreads, hit a spread, then discard"
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
      {humanTurn && state.phase === "drop" && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={humanDrop}
            className="flex-1 rounded-2xl bg-red-700 px-4 py-3 text-base font-black text-white shadow"
          >
            Drop — I hold the lowest ({unmatchedTotal(you)} pts)
          </button>
          <button
            type="button"
            onClick={() =>
              setState((prev) => ({ ...prev, phase: "draw" }))
            }
            className="flex-1 rounded-2xl bg-emerald-700 px-4 py-3 text-base font-black text-white shadow"
          >
            Keep playing — draw
          </button>
        </div>
      )}
      {humanTurn && state.phase === "draw" && (
        <p className="mt-3 text-center text-sm font-bold text-[var(--dim)]">
          Tap the stock or the top discard to draw.
        </p>
      )}
      {humanTurn && state.phase === "meld" && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={humanLaySpread}
            disabled={!selectionIsSpread}
            className="flex-1 rounded-2xl bg-emerald-700 px-4 py-3 text-base font-black text-white shadow disabled:opacity-40"
          >
            Lay spread ({selectedCards.length} picked)
          </button>
          <button
            type="button"
            onClick={humanDiscard}
            disabled={selected.length !== 1}
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
        <SeatPortrait player={you} isTurn={humanTurn} />
        <div className="text-sm font-bold text-[var(--dim)]">
          <p>
            Your unmatched: <b className="text-[var(--text)]">{unmatchedTotal(you)} pts</b>
          </p>
          <p>
            Hand total: <b className="text-[var(--text)]">{handTotal(you.hand)} pts</b>
          </p>
          <p>
            Leader: <b className="text-[var(--text)]">{leader.name} ({leader.points})</b>
          </p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-1.5">
        {you.hand.map((c) => {
          const id = cardId(c);
          const isSel = selected.includes(id);
          return (
            <CardView
              key={id}
              card={c}
              deck={deck}
              selected={isSel}
              onClick={() => {
                if (!humanTurn || state.phase !== "meld") return;
                setSelected((prev) =>
                  prev.includes(id)
                    ? prev.filter((x) => x !== id)
                    : [...prev, id],
                );
              }}
            />
          );
        })}
      </div>
      <p className="mt-2 text-center text-xs font-bold text-[var(--dim)]">
        Tap cards to pick them — pick 3+ for a spread, or 1 to discard or hit
        a spread. Numbers 5 pts · 10s &amp; faces 10 pts · Aces 15 pts.
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
