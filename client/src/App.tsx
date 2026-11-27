// Tunk — home screen, accounts, Quick Play, Rewards/Levels, My Look,
// Store (Stripe test mode + live Checkout), and the safeguards:
// Privacy Policy, Terms (points-only, no gambling, no cash prizes,
// points are never for sale), under-13 cannot buy, Restore Purchases,
// and account deletion.
//
// Points are earned by playing only. Nothing in this file sells points.

import { useEffect, useState, type ReactNode } from "react";
import { api, type ApiResponse } from "./api";
import type { Actions } from "../../server/src/actions";
import { TunkTable } from "./TunkTable";
import { PittyPatTable } from "./PittyPatTable";
import { BannerAd, InterstitialAdModal } from "./AdSlot";
import type { ProductId } from "../../server/src/stripe";
import { DEFAULT_PITTY_PAT_RULES } from "./pittypat";
import { ChatPanel } from "./ChatPanel";
import { VoicePanel } from "./VoicePanel";
import {
  DECKS,
  FELTS,
  LEVELS,
  castById,
  levelForPoints,
  nextLevel,
  unlockedFelts,
  unlockedStyles,
} from "./tunk";

type Profile = ApiResponse<typeof Actions, "getProfile">;

type View =
  | "home"
  | "game"
  | "rooms"
  | "roomGame"
  | "account"
  | "store"
  | "rewards"
  | "look"
  | "how"
  | "privacy"
  | "terms"
  | "safety";

const GUEST_POINTS_KEY = "tunk-guest-points";
const TOKEN_KEY = "tunk-token";
const DECK_KEY = "tunk-deck";
const FELT_KEY = "tunk-felt";

function loadGuestPoints(): number {
  try {
    return Number(localStorage.getItem(GUEST_POINTS_KEY) ?? 0) || 0;
  } catch {
    return 0;
  }
}

function BackBar({
  title,
  onBack,
}: {
  title: string;
  onBack: () => void;
}) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <button
        type="button"
        onClick={onBack}
        className="rounded-full bg-black/10 px-3 py-1 text-sm font-bold text-[var(--text)]"
      >
        ← Back
      </button>
      <h2 className="text-xl font-black text-[var(--text)]">{title}</h2>
    </div>
  );
}

function PolicySection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="rounded-3xl bg-[var(--surface)] p-4 shadow">
      <h3 className="text-base font-black text-[var(--text)]">{title}</h3>
      <div className="mt-1 space-y-2 text-sm text-[var(--dim)]">{children}</div>
    </article>
  );
}

function Footer({
  onPrivacy,
  onTerms,
  onSafety,
}: {
  onPrivacy: () => void;
  onTerms: () => void;
  onSafety: () => void;
}) {
  return (
    <footer className="mt-6 border-t border-[var(--border)] pt-3 text-center">
      <p className="text-xs font-semibold text-[var(--dim)]">
        <button type="button" className="underline" onClick={onPrivacy}>
          Privacy Policy
        </button>
        {" · "}
        <button type="button" className="underline" onClick={onTerms}>
          Terms of Service
        </button>
        {" · "}
        <button type="button" className="underline" onClick={onSafety}>
          Stay Safe
        </button>
      </p>
      <p className="mt-1 text-xs font-semibold text-[var(--dim)]">
        <a className="underline" href="/how-to-play.html">
          How to Play
        </a>
        {" · "}
        <a className="underline" href="/about.html">
          About
        </a>
        {" · "}
        <a className="underline" href="/faq.html">
          FAQ
        </a>
      </p>
      <p className="mt-1 text-xs text-[var(--dim)]">
        Family Fun — Pitty Pat or Tunk — made by Albert Q. Lightfoot. Questions? alquincy80@gmail.com
      </p>
    </footer>
  );
}

function PrivacyScreen({ onBack }: { onBack: () => void }) {
  return (
    <section className="pt-4">
      <BackBar title="Privacy Policy" onBack={onBack} />
      <p className="mt-1 text-sm text-[var(--dim)]">
        Family Fun (Pitty Pat or Tunk) is made by Albert Q. Lightfoot, as an individual. This policy
        says what this version of the game actually collects and does —
        nothing more.
      </p>
      <div className="mt-4 space-y-3">
        <PolicySection title="What we collect">
          <p>
            <strong className="text-[var(--text)]">Your account:</strong>{" "}
            the table name, email address, and birth year you type when you
            sign up. Birth year is used only to work out whether you are
            under 13, which switches on the extra safety rules below.
          </p>
          <p>
            <strong className="text-[var(--text)]">Your password:</strong>{" "}
            never stored as typed. It is salted and hashed (SHA-256) and only
            the salt and hash are kept, so nobody at the game can read your
            password back.
          </p>
          <p>
            <strong className="text-[var(--text)]">Your game:</strong>{" "}
            lifetime points won, matches and hands won and played, and which
            one-time purchases your account owns.
          </p>
          <p>
            <strong className="text-[var(--text)]">Your purchases:</strong>{" "}
            which product you bought and the Stripe payment record (session
            id, product, amount). Card numbers are never typed into the game
            and never stored by it — payment happens on Stripe&apos;s own
            hosted checkout page, and Stripe&apos;s own privacy policy
            applies there.
          </p>
        </PolicySection>
        <PolicySection title="What we do NOT do">
          <p>
            The game may show its own house ads and, for eligible
            players, ads from Google AdSense. Google AdSense code is
            installed so Google can review the site and serve and measure
            ads; Google may use cookies or device information for that
            under Google&apos;s own policies. Ads are shown between
            games, never during a hand, and under-13 accounts are not
            shown rewarded ads. No data is sold to anyone, and the game
            does not collect your location, your contacts, or your
            photos. Points are never bought, sold, or cashed out.
          </p>
        </PolicySection>
        <PolicySection title="On your device">
          <p>
            Your phone or computer keeps your sign-in token, your guest
            points (if you play without an account), and your chosen card
            back and table. Clearing the game&apos;s saved data on your
            device signs you out.
          </p>
        </PolicySection>
        <PolicySection title="Players under 13">
          <p>
            Under-13 accounts cannot buy anything in the Store. A parent or
            guardian can ask for the account to be deleted — see below, or
            email alquincy80@gmail.com.
          </p>
        </PolicySection>
        <PolicySection title="Voice chat">
          <p>
            In Family Rooms you can tap Join voice to talk live with the
            family at your table. Your voice goes straight from your device
            to theirs over a peer-to-peer WebRTC connection — it is not
            recorded and not stored by the game. Your microphone only opens
            after you tap Join voice. The short signaling messages that set
            up the call are short-lived and carry no audio. Under-13
            accounts cannot join voice.
          </p>
        </PolicySection>
        <PolicySection title="Family Room chat">
          <p>
            Messages you send in a Family Room are checked by a word filter
            before they post, and are kept only so the family at that table
            can read them. Under-13 accounts chat with quick-talk phrases
            only. Reports about a player can lead to strikes and a 24-hour
            cool-down from chat and voice.
          </p>
        </PolicySection>
        <PolicySection title="Deleting your account">
          <p>
            You can delete your account in the game (My Account → Delete my
            account). That permanently removes your account, your progress,
            your purchases, your Stripe payment records, your room chat
            messages, and any reports about you. Other
            players&apos; data is not touched.
          </p>
        </PolicySection>
        <PolicySection title="Contact">
          <p>
            Questions about this policy, or about your data: email
            alquincy80@gmail.com.
          </p>
        </PolicySection>
      </div>
    </section>
  );
}

function TermsScreen({ onBack }: { onBack: () => void }) {
  return (
    <section className="pt-4">
      <BackBar title="Terms of Service" onBack={onBack} />
      <p className="mt-1 text-sm text-[var(--dim)]">
        The short version: this is a family card game for points. Play nice,
        and the table stays fun.
      </p>
      <div className="mt-4 space-y-3">
        <PolicySection title="The game">
          <p>
            Tunk is a card game for points — first to 150 wins a 1v1 match,
            first to 300 wins a 4-player match. There is no real-money
            gambling, no betting with real money, and no cash prizes. Points
            are earned by playing and by optional free rewarded house
            videos: they cannot be bought, sold, or turned into real
            money. Nothing you win in the game can be turned into real
            money.
          </p>
        </PolicySection>
        <PolicySection title="Free and paid">
          <p>
            Quick Play is free. The Family Fun Pass is $1.99 one-time
            and Remove Ads is $0.99 one-time. Both are one-time payments —
            there is no subscription. Purchases are tied to your signed-in
            account and come back when you sign in on any device (Store →
            Restore purchases). The Pass unlocks every standard card style
            and table theme and removes ads; it never buys points.
          </p>
        </PolicySection>
        <PolicySection title="Refunds">
          <p>
            Refunds follow the rules of whoever took the payment: Stripe for
            card payments made on Stripe checkout, or Google Play / Apple
            for purchases made through their stores. If something went wrong
            with a purchase, email alquincy80@gmail.com and say what
            happened.
          </p>
        </PolicySection>
        <PolicySection title="Keep It Cool">
          <p>
            Keep it family-friendly at the table and on voice — no cussing,
            insults, disrespect, or bullying. Table chat is checked by a
            word filter before it posts; voice goes straight between devices
            and can&apos;t be filtered before it&apos;s heard, so the same
            rules ride on respect, with mute, silence, block, and report
            controls in your hands. Reports add up: three reports add a
            strike, and repeat strikes bring a 24-hour cool-down from chat
            and voice. Players under 13 use quick-talk phrases only and no
            voice chat.
          </p>
        </PolicySection>
        <PolicySection title="Your account">
          <p>
            You need an account to save progress across devices and to buy
            anything. Keep your password to yourself. You can delete your
            account any time in the game (My Account → Delete my account) —
            deletion is permanent and removes your progress and purchases,
            as the Privacy Policy describes.
          </p>
        </PolicySection>
        <PolicySection title="Changes">
          <p>
            If these terms change, the new version appears here in the game.
            The game is made by Albert Q. Lightfoot as an individual.
            Questions: alquincy80@gmail.com.
          </p>
        </PolicySection>
      </div>
    </section>
  );
}

function SafetyScreen({ onBack }: { onBack: () => void }) {
  return (
    <section className="pt-4">
      <BackBar title="Stay Safe" onBack={onBack} />
      <p className="mt-1 text-sm text-[var(--dim)]">
        Tunk is a points game. No real money ever rides on a hand.
      </p>
      <div className="mt-4 space-y-3">
        <PolicySection title="Points are not money">
          <p>
            Points are earned by playing. They cannot be bought with real
            money, sold, or cashed out. Anyone asking you to pay real money
            for points, or offering to buy your points, is not part of this
            game — don&apos;t send them money.
          </p>
        </PolicySection>
        <PolicySection title="Players under 13">
          <p>
            Under-13 accounts cannot buy anything in the Store. Parents can
            ask for an account to be deleted any time — email
            alquincy80@gmail.com.
          </p>
        </PolicySection>
        <PolicySection title="Chat and voice in Family Rooms">
          <p>
            Voice and chat in Family Rooms follow the same Keep It Cool
            rules as the table. You can mute your own mic, silence any
            player for yourself, block a player&apos;s messages on your
            device, or report anyone who breaks the rules — reports add up
            to strikes and a 24-hour cool-down.
          </p>
        </PolicySection>
        <PolicySection title="If something feels wrong">
          <p>
            Email alquincy80@gmail.com and say what happened. The game is
            made by Albert Q. Lightfoot as an individual.
          </p>
        </PolicySection>
      </div>
    </section>
  );
}

function HowScreen({ onBack }: { onBack: () => void }) {
  return (
    <section className="pt-4">
      <BackBar title="How to Play" onBack={onBack} />
      <div className="mt-4 space-y-3">
        <PolicySection title="The deal">
          <p>
            2 or 4 players, one 52-card deck, no jokers. Everybody gets 5
            cards. The next card turns up to start the discard pile; the
            rest is the stock.
          </p>
        </PolicySection>
        <PolicySection title="Your turn">
          <p>
            At the START of your turn you may DROP — lay your hand face up
            and claim you hold the lowest unmatched total. Otherwise draw
            the top stock card or the top discard, lay down spreads, hit
            other players&apos; spreads, then discard one card.
          </p>
        </PolicySection>
        <PolicySection title="Spreads">
          <p>
            A spread is 3–4 of a kind, or 3+ cards in a row of the same suit.
            Aces are low only — A-2-3 is a run, Q-K-A is not. You can hit
            another player&apos;s spread with a card that fits it.
          </p>
        </PolicySection>
        <PolicySection title="Al's points">
          <p>
            Number cards are worth 5 points, 10s and face cards 10 points,
            Aces 15 points. A starting hand totalling exactly 50 is a
            natural Tunk — show it at once and win double. Spreading
            everything with no card left to discard is a tonk out — also
            double. Going out on a final discard is single.
          </p>
        </PolicySection>
        <PolicySection title="Dropping">
          <p>
            If you drop and you really do hold the lowest unmatched total,
            you win the hand. If someone else ties or beats you, you pay
            double. If the stock runs out, the lowest unmatched total wins
            a single stake.
          </p>
        </PolicySection>
        <PolicySection title="Points at the end of every hand">
          <p>
            At the end of every hand, each loser&apos;s unmatched cards are
            added up and the winner takes that many points from each loser.
            Everybody starts a match at 5 points — first to 150 wins a 1v1
            match, first to 300 wins a 4-player match. Hit 0 points and you
            get a free top-up back to 5 next hand, so nobody gets stuck.
          </p>
        </PolicySection>
        <PolicySection title="Pitty Pat">
          <p>
            Pitty Pat is the pairing game: everybody gets 5 cards and the goal
            is to hold three pairs. Pairs stay in your hand — being dealt three
            pairs wins at once. On your turn, draw from the stock or the
            discard pile, then discard one card. The moment your hand holds
            three pairs, call Pitty Pat: the winner takes 15 points from each
            loser, and nobody pays more than they have. First to 150 wins a
            1v1 match; first to 300 wins a 4-player match. House toggles on
            the table: Include 8–10 is on by default; First Porter +10 and
            Last Low +10 are off unless your family turns them on.
          </p>
        </PolicySection>
        <PolicySection title="Levels and rewards">
          <p>
            Points you win stack up toward levels. Each level unlocks a card
            style or a table theme — free, earned by playing. See Rewards
            on the home screen for the whole ladder.
          </p>
        </PolicySection>
        <PolicySection title="Family Rooms">
          <p>
            Make a private room and share the 6-letter code — family tap
            Family Rooms, type the code in, and they&apos;re at your table.
            The table itself plays on this device, with computer players
            filling the open seats; the room code, the seat list, table chat,
            and voice chat are the live shared parts.
          </p>
          <p>
            Table chat is checked by a word filter before it posts, and
            under-13 players chat with quick-talk phrases only. Voice chat
            is in Family Rooms only — tap Join voice to talk live; your
            voice goes straight between devices and is not recorded. You
            can mute your mic, silence any player for yourself, or report
            anyone who breaks the Keep It Cool rules.
          </p>
        </PolicySection>
      </div>
    </section>
  );
}

// ---------- Family Rooms ----------

interface RoomConfig {
  code: string;
  playerCount: 2 | 4;
  displayName: string;
  game: "tunk" | "pittypat";
}

interface RoomSeat {
  name: string;
  kind: string;
}

function FamilyRooms(props: {
  displayName: string;
  onBack: () => void;
  onStart: (cfg: RoomConfig) => void;
}) {
  const [name, setName] = useState(
    props.displayName === "You" ? "" : props.displayName,
  );
  const [playerCount, setPlayerCount] = useState<2 | 4>(2);
  const [game, setGame] = useState<"tunk" | "pittypat">("tunk");
  const [code, setCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [seats, setSeats] = useState<RoomSeat[]>([]);
  const [roomPlayerCount, setRoomPlayerCount] = useState<2 | 4>(2);

  // Poll the lobby while we're in it, so seats fill in as family join.
  useEffect(() => {
    if (!code) return;
    const roomCode = code;
    let cancelled = false;
    async function fetchRoom() {
      try {
        const res = await api.getRoom({ code: roomCode });
        if (cancelled) return;
        if (res.found) {
          setSeats(res.seats);
          setRoomPlayerCount(res.playerCount === 4 ? 4 : 2);
        }
      } catch {
        /* next poll in 3s picks it up */
      }
    }
    void fetchRoom();
    const t = window.setInterval(() => void fetchRoom(), 3000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [code]);

  const myName = name.trim();

  async function create() {
    if (!myName || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.createRoom({ hostName: myName, playerCount });
      if (res.code) {
        setRoomPlayerCount(playerCount);
        setSeats([]);
        setCode(res.code);
      } else {
        setError(res.error ?? "Could not create the room.");
      }
    } catch {
      setError("Could not create the room — try again in a second.");
    } finally {
      setBusy(false);
    }
  }

  async function join() {
    if (!myName || joinCode.trim().length !== 6 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.joinRoom({
        code: joinCode.trim().toUpperCase(),
        name: myName,
      });
      if (res.ok) {
        setRoomPlayerCount(res.playerCount === 4 ? 4 : 2);
        setSeats(res.seats);
        setCode(joinCode.trim().toUpperCase());
      } else {
        setError(res.error ?? "Could not join that room.");
      }
    } catch {
      setError("Could not join that room — try again in a second.");
    } finally {
      setBusy(false);
    }
  }

  const tableSize = code ? roomPlayerCount : playerCount;

  return (
    <section className="pt-4">
      <BackBar title="Family Rooms" onBack={props.onBack} />
      <p className="mt-1 text-sm text-[var(--dim)]">
        Make a private room, share the 6-letter code, and the family joins
        from any device. The table plays on this device with the computer in
        the open seats — the room code, seats, table chat, and voice chat are
        the live shared parts.
      </p>

      {!code && (
        <div className="mt-4 rounded-3xl bg-[var(--surface)] p-4 shadow">
          <label className="block text-sm font-black text-[var(--text)]" htmlFor="room-name">
            Your table name
          </label>
          <input
            id="room-name"
            className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-base text-[var(--text)]"
            placeholder="e.g. Uncle Al"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label="Room table size">
            {([2, 4] as const).map((pc) => (
              <button
                key={pc}
                type="button"
                aria-pressed={playerCount === pc}
                onClick={() => setPlayerCount(pc)}
                className={`rounded-2xl py-2.5 text-sm font-black ${
                  playerCount === pc
                    ? "bg-[#14532d] text-white"
                    : "bg-[var(--bg)] text-[var(--text)]"
                }`}
              >
                {pc}-player table
              </button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label="Room game">
            {(["tunk", "pittypat"] as const).map((g) => (
              <button
                key={g}
                type="button"
                aria-pressed={game === g}
                onClick={() => setGame(g)}
                className={`rounded-2xl py-2.5 text-sm font-black ${
                  game === g
                    ? "bg-[#14532d] text-white"
                    : "bg-[var(--bg)] text-[var(--text)]"
                }`}
              >
                {g === "tunk" ? "Tunk" : "Pitty Pat"}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={!myName || busy}
            onClick={() => void create()}
            className="mt-3 w-full rounded-full bg-[#ff6b4a] py-3 text-base font-black text-white disabled:opacity-40"
          >
            Create my room
          </button>
          <div className="my-4 flex items-center gap-3 text-xs font-black uppercase tracking-wide text-[var(--dim)]">
            <span className="h-px flex-1 bg-[var(--border)]" /> or join{" "}
            <span className="h-px flex-1 bg-[var(--border)]" />
          </div>
          <label className="block text-sm font-black text-[var(--text)]" htmlFor="join-code">
            Room code
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="join-code"
              className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-base font-black uppercase tracking-[0.3em] text-[var(--text)]"
              placeholder="ABCDEF"
              value={joinCode}
              maxLength={6}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            />
            <button
              type="button"
              disabled={!myName || joinCode.trim().length !== 6 || busy}
              onClick={() => void join()}
              className="shrink-0 rounded-full bg-[#14532d] px-5 py-2.5 text-sm font-black text-white disabled:opacity-40"
            >
              Join room
            </button>
          </div>
          {error && (
            <p className="mt-3 rounded-lg bg-[#fee2e2] px-3 py-2 text-sm font-semibold text-[#7f1d1d]" role="alert">
              {error}
            </p>
          )}
        </div>
      )}

      {code && (
        <div className="mt-4 rounded-3xl bg-[#14532d] p-5 text-center shadow-xl">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#f5b942]">
            Your room code
          </p>
          <p className="mt-1 text-5xl font-black tracking-[0.2em] text-white">
            {code}
          </p>
          <p className="mt-2 text-sm font-semibold text-white/85">
            Tell the family this code — they tap Family Rooms, type it in, and
            they&apos;re at your table.
          </p>
          <div className="mt-4 space-y-2 text-left">
            {Array.from({ length: tableSize }).map((_, i) => {
              const seat = seats[i];
              return (
                <p
                  key={i}
                  className="rounded-xl bg-black/30 px-3 py-2 text-sm font-bold text-white"
                >
                  Seat {i + 1}:{" "}
                  {seat
                    ? `${seat.name} (family)`
                    : "Computer player fills this seat"}
                </p>
              );
            })}
          </div>
          <button
            type="button"
            className="mt-4 w-full rounded-full bg-[#ff6b4a] py-3.5 text-lg font-black text-white"
            onClick={() =>
              props.onStart({
                code,
                playerCount: tableSize,
                displayName: myName,
                game,
              })
            }
          >
            Start the game ▶
          </button>
          <button
            type="button"
            className="mt-2 w-full rounded-full bg-white/15 py-2.5 text-sm font-black text-white"
            onClick={() => {
              setCode(null);
              setSeats([]);
              setError(null);
            }}
          >
            Leave lobby
          </button>
          <p className="mt-3 text-xs text-white/70">
            Heads-up: the room code, seats, and chat are live now. The table
            plays on this device with the computer in the open seats — family
            on other devices join the room to chat and talk, and watch the
            seats fill in.
          </p>
        </div>
      )}
    </section>
  );
}

export function App() {
  const [view, setView] = useState<View>("home");
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  });
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [gameMode, setGameMode] = useState<2 | 4>(2);
  const [gameChoice, setGameChoice] = useState<"tunk" | "pittypat">("tunk");
  const [deckId, setDeckId] = useState<string>(() => {
    try {
      return localStorage.getItem(DECK_KEY) ?? "house";
    } catch {
      return "house";
    }
  });
  const [feltId, setFeltId] = useState<string>(() => {
    try {
      return localStorage.getItem(FELT_KEY) ?? "classic-green";
    } catch {
      return "classic-green";
    }
  });
  const [guestPoints, setGuestPoints] = useState<number>(loadGuestPoints);
  useEffect(() => {
    try {
      localStorage.setItem(GUEST_POINTS_KEY, String(guestPoints));
    } catch {
      /* ignore */
    }
  }, [guestPoints]);
  const [storeLive, setStoreLive] = useState(false);
  const [storeMsg, setStoreMsg] = useState<string | null>(null);
  const [card, setCard] = useState("4242 4242 4242 4242");
  const [authMsg, setAuthMsg] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [birthYear, setBirthYear] = useState(1990);
  const [authMode, setAuthMode] = useState<"in" | "up">("in");
  const [deletePw, setDeletePw] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [lastMatch, setLastMatch] = useState<{
    matchWon: boolean;
    pointsWon: number;
    handsWon: number;
    handsPlayed: number;
  } | null>(null);
  const [roomGame, setRoomGame] = useState<RoomConfig | null>(null);
  const [matchesCompletedSession, setMatchesCompletedSession] = useState(0);
  const [showInterstitial, setShowInterstitial] = useState(false);

  const signedIn = Boolean(token && profile?.ok);
  const lifetimePoints = signedIn
    ? (profile?.points ?? 0)
    : guestPoints;
  const matchesWon = signedIn ? (profile?.matchesWon ?? 0) : 0;
  const hasPass = Boolean(profile?.hasTunkPass);
  const hasRemoveAds = Boolean(profile?.hasRemoveAds);
  const hasRoyalCosmetics = Boolean(profile?.hasRoyalCosmetics);
  const hasFamilyHostPack = Boolean(profile?.hasFamilyHostPack);
  const hasFoundersBundle = Boolean(profile?.hasFoundersBundle);
  const level = levelForPoints(lifetimePoints);
  const next = nextLevel(lifetimePoints);
  const earnedStyles = unlockedStyles(
    lifetimePoints,
    matchesWon,
    hasPass,
    hasRoyalCosmetics,
    hasFoundersBundle,
  );
  const earnedFelts = unlockedFelts(
    lifetimePoints,
    hasPass,
    hasRoyalCosmetics,
    hasFoundersBundle,
  );

  // Load the profile for a saved session, and the store status.
  useEffect(() => {
    api
      .getStoreStatus({})
      .then((s) => setStoreLive(s.live))
      .catch(() => setStoreLive(false));
    if (!token) return;
    api
      .getProfile({ token })
      .then((p) => {
        if (p.ok) setProfile(p);
        else {
          setProfileError(p.error);
          setToken(null);
          try {
            localStorage.removeItem(TOKEN_KEY);
          } catch {
            /* ignore */
          }
        }
      })
      .catch(() => setProfileError("Could not load your profile."));
  }, [token]);

  // Stripe Checkout return: confirm the session, then refresh the profile.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const checkout = params.get("checkout");
    if (checkout !== "success" || !sessionId || !token) return;
    window.history.replaceState({}, "", window.location.pathname);
    api
      .confirmCheckout({ token, sessionId })
      .then((r) => {
        if (r.ok) {
          setStoreMsg("Payment confirmed — your purchase is unlocked!");
          return api.getProfile({ token });
        }
        setStoreMsg(r.error ?? "That payment could not be confirmed.");
        return null;
      })
      .then((p) => {
        if (p?.ok) setProfile(p);
      })
      .catch(() => setStoreMsg("Could not confirm that payment yet."));
    // Only runs once on mount for the return URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function saveToken(t: string | null, p: Profile | null) {
    setToken(t);
    setProfile(p);
    try {
      if (t) localStorage.setItem(TOKEN_KEY, t);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  }

  async function doAuth() {
    setAuthMsg(null);
    try {
      if (authMode === "up") {
        const r = await api.signUp({
          name: name.trim() || "Player",
          email: email.trim(),
          password,
          birthYear,
        });
        if (!r.token) {
          setAuthMsg(r.profile.error ?? "Sign-up failed.");
          return;
        }
        saveToken(r.token, r.profile);
        setAuthMsg("Welcome to the table!");
      } else {
        const r = await api.signIn({ email: email.trim(), password });
        if (!r.token) {
          setAuthMsg(r.profile.error ?? "Sign-in failed.");
          return;
        }
        saveToken(r.token, r.profile);
        setAuthMsg("Welcome back!");
      }
    } catch (err) {
      setAuthMsg(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  function signOut() {
    saveToken(null, null);
    setView("home");
  }

  async function handleMatchEnd(result: {
    matchWon: boolean;
    pointsWon: number;
    handsWon: number;
    handsPlayed: number;
  }) {
    setLastMatch(result);
    const nextCount = matchesCompletedSession + 1;
    setMatchesCompletedSession(nextCount);
    if (!hasRemoveAds && !profile?.under13 && nextCount % 2 === 0) {
      setShowInterstitial(true);
    }
    setRoomGame(null);
    if (token) {
      try {
        await api.recordMatchResult({
          token,
          pointsWon: result.pointsWon,
          matchWon: result.matchWon,
          handsWon: result.handsWon,
          handsPlayed: result.handsPlayed,
        });
        const p = await api.getProfile({ token });
        if (p.ok) setProfile(p);
      } catch {
        /* progress stays local-only if the save fails */
      }
    } else {
      setGuestPoints((prev) => prev + result.pointsWon);
    }
    setView("home");
  }

  async function handleAdReward(): Promise<boolean> {
    if (hasPass || hasRemoveAds || profile?.under13) return false;
    if (token) {
      try {
        const r = await api.recordAdReward({ token });
        if (!r.ok) return false;
        const p = await api.getProfile({ token });
        if (p.ok) setProfile(p);
        return true;
      } catch {
        return false;
      }
    }
    setGuestPoints((prev) => prev + 15);
    return true;
  }

  function equipDeck(id: string) {
    if (!earnedStyles.includes(id)) return;
    setDeckId(id);
    try {
      localStorage.setItem(DECK_KEY, id);
    } catch {
      /* ignore */
    }
  }

  function equipFelt(id: string) {
    if (!earnedFelts.includes(id)) return;
    setFeltId(id);
    try {
      localStorage.setItem(FELT_KEY, id);
    } catch {
      /* ignore */
    }
  }

  async function buy(product: ProductId) {
    setStoreMsg(null);
    if (!token) {
      setStoreMsg("Sign in first, then buy.");
      return;
    }
    try {
      if (storeLive) {
        const r = await api.createCheckoutSession({
          token,
          product,
          origin: window.location.origin,
        });
        if (!r.ok || !r.checkoutUrl) {
          setStoreMsg(r.error ?? "Checkout could not start.");
          return;
        }
        window.location.href = r.checkoutUrl;
        return;
      }
      const r = await api.buyProduct({
        token,
        product,
        cardNumber: card,
      });
      if (!r.ok) {
        setStoreMsg(r.error ?? "That buy did not go through.");
        return;
      }
      setStoreMsg("Bought! It's on your account now.");
      const p = await api.getProfile({ token });
      if (p.ok) setProfile(p);
    } catch (err) {
      setStoreMsg(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  async function restorePurchases() {
    if (!token) return;
    try {
      const p = await api.getProfile({ token });
      if (p.ok) {
        setProfile(p);
        setStoreMsg("Purchases restored — everything you own is back.");
      } else {
        setStoreMsg(p.error ?? "Could not restore purchases.");
      }
    } catch {
      setStoreMsg("Could not restore purchases just now.");
    }
  }

  const humanName = profile?.name ?? "You";

  return (
    <div className="mx-auto min-h-dvh w-full max-w-xl px-4 pb-10">
      {view === "home" && (
        <section className="pt-6 text-center">
          <img
            src="/cover.jpg"
            alt="C.F.N.B. Presents — Family Fun — Pitty Pat or Tunk — Your Move"
            className="mx-auto w-full max-w-sm rounded-3xl shadow"
          />
          <div className="mx-auto mt-4 flex max-w-sm justify-center gap-4">
            {["dee", "marcus", "trey"].map((id) => {
              const c = castById(id);
              return (
                <div key={id} className="w-20 text-center">
                  {c.img && (
                    <img
                      src={c.img}
                      alt={c.name}
                      className="mx-auto h-16 w-16 rounded-full object-cover shadow"
                    />
                  )}
                  <p className="mt-1 text-xs font-black text-[var(--text)]">
                    {c.name}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mx-auto mt-4 max-w-sm rounded-3xl bg-[var(--surface)] p-4 shadow">
            <p className="text-sm font-bold text-[var(--dim)]">
              Your points · Level {level}
            </p>
            <p className="text-3xl font-black text-[var(--text)]">
              {lifetimePoints} pts
            </p>
            {next ? (
              <p className="mt-1 text-xs font-bold text-[var(--dim)]">
                {next.pointsNeeded - lifetimePoints} more points to Level{" "}
                {next.level} — {next.unlock}
              </p>
            ) : (
              <p className="mt-1 text-xs font-bold text-[var(--dim)]">
                Top level reached — Champion Crown Gold is yours.
              </p>
            )}
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/10">
              <div
                className="h-full rounded-full bg-amber-500"
                style={{
                  width: next
                    ? `${Math.min(
                        100,
                        (lifetimePoints /
                          next.pointsNeeded) *
                          100,
                      )}%`
                    : "100%",
                }}
              />
            </div>
            {signedIn ? (
              <p className="mt-2 text-xs font-bold text-[var(--dim)]">
                Signed in as {profile?.name} · Matches won: {matchesWon}
              </p>
            ) : (
              <p className="mt-2 text-xs font-bold text-[var(--dim)]">
                Playing as a guest — sign in to save your points on any
                device.
              </p>
            )}
          </div>

          {lastMatch && (
            <div className="mx-auto mt-3 max-w-sm rounded-3xl bg-emerald-50 p-3 text-sm font-bold text-emerald-900 shadow">
              {lastMatch.matchWon
                ? `You won the match! +${lastMatch.pointsWon} points.`
                : `Match over — you won ${lastMatch.pointsWon} points this match.`}{" "}
              Hands: {lastMatch.handsWon}/{lastMatch.handsPlayed} won.
            </div>
          )}

          {lastMatch && !hasPass && !profile?.under13 && (
            <div className="mx-auto mt-2 max-w-sm rounded-3xl border border-amber-300 bg-amber-50 p-3 text-left shadow">
              <p className="text-xs font-black uppercase tracking-wide text-amber-800">
                {hasFoundersBundle ? "2x Founder XP Active" : "Level Up Faster & Go Ad-Free"}
              </p>
              <p className="mt-0.5 text-xs font-bold text-amber-950/80">
                Unlock all decks, custom tables, and zero ads with the Family Fun Pass ($1.99) or 2x XP with the Founder&apos;s Bundle ($9.99).
              </p>
              <button
                type="button"
                onClick={() => setView("store")}
                className="mt-2 rounded-full bg-amber-600 px-3.5 py-1.5 text-xs font-black text-white"
              >
                See VIP Bundles →
              </button>
            </div>
          )}

          <div className="mx-auto mt-4 grid max-w-sm grid-cols-2 gap-2" role="group" aria-label="Pick a game">
            {(["tunk", "pittypat"] as const).map((g) => (
              <button
                key={g}
                type="button"
                aria-pressed={gameChoice === g}
                onClick={() => setGameChoice(g)}
                className={`rounded-2xl py-3 text-base font-black shadow ${
                  gameChoice === g
                    ? "bg-[#14532d] text-white"
                    : "bg-[var(--surface)] text-[var(--text)]"
                }`}
              >
                {g === "tunk" ? "Tunk" : "Pitty Pat"}
              </button>
            ))}
          </div>

          <div className="mx-auto mt-4 grid max-w-sm grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setGameMode(2);
                setLastMatch(null);
                setView("game");
              }}
              className="col-span-2 rounded-2xl bg-emerald-700 px-4 py-3 text-lg font-black text-white shadow"
            >
              Play {gameChoice === "tunk" ? "Tunk" : "Pitty Pat"} 1v1 — You vs Dee
            </button>
            <button
              type="button"
              onClick={() => {
                setGameMode(4);
                setLastMatch(null);
                setView("game");
              }}
              className="col-span-2 rounded-2xl bg-emerald-700 px-4 py-3 text-lg font-black text-white shadow"
            >
              Play {gameChoice === "tunk" ? "Tunk" : "Pitty Pat"} 4-Player — You vs Marcus, Dee &amp; Trey
            </button>
            <button
              type="button"
              onClick={() => setView("rooms")}
              className="col-span-2 rounded-2xl bg-[var(--surface)] px-4 py-3 text-base font-black text-[var(--text)] shadow"
            >
              👨‍👩‍👧‍👦 Family Rooms — play with family, chat &amp; voice
            </button>
            <button
              type="button"
              onClick={() => setView("rewards")}
              className="rounded-2xl bg-amber-500 px-4 py-3 text-base font-black text-white shadow"
            >
              🏆 Rewards
            </button>
            <button
              type="button"
              onClick={() => setView("look")}
              className="rounded-2xl bg-[var(--surface)] px-4 py-3 text-base font-black text-[var(--text)] shadow"
            >
              My Look
            </button>
            <button
              type="button"
              onClick={() => setView("store")}
              className="rounded-2xl bg-[var(--surface)] px-4 py-3 text-base font-black text-[var(--text)] shadow"
            >
              Store
            </button>
            <button
              type="button"
              onClick={() => setView("how")}
              className="rounded-2xl bg-[var(--surface)] px-4 py-3 text-base font-black text-[var(--text)] shadow"
            >
              How to Play
            </button>
            <button
              type="button"
              onClick={() => setView("account")}
              className="col-span-2 rounded-2xl bg-[var(--surface)] px-4 py-3 text-base font-black text-[var(--text)] shadow"
            >
              {signedIn ? `My Account — ${profile?.name}` : "Sign in / Sign up"}
            </button>
          </div>

          {!hasPass && !hasRemoveAds && !profile?.under13 && (
            <BannerAd
              onOpenStore={() => setView("store")}
              onReward={handleAdReward}
            />
          )}

          <Footer
            onPrivacy={() => setView("privacy")}
            onTerms={() => setView("terms")}
            onSafety={() => setView("safety")}
          />
        </section>
      )}

      {view === "game" && gameChoice === "tunk" && (
        <TunkTable
          playerCount={gameMode}
          humanName={humanName}
          deckId={deckId}
          feltId={feltId}
          lifetimePoints={lifetimePoints}
          onMatchEnd={handleMatchEnd}
          onLeave={() => setView("home")}
        />
      )}

      {view === "game" && gameChoice === "pittypat" && (
        <PittyPatTable
          playerCount={gameMode}
          humanName={humanName}
          deckId={deckId}
          feltId={feltId}
          rules={DEFAULT_PITTY_PAT_RULES}
          onMatchEnd={handleMatchEnd}
          onLeave={() => setView("home")}
        />
      )}

      {view === "rooms" && (
        <FamilyRooms
          displayName={humanName}
          onBack={() => setView("home")}
          onStart={(cfg) => {
            setRoomGame(cfg);
            setLastMatch(null);
            setView("roomGame");
          }}
        />
      )}

      {view === "roomGame" && roomGame && (
        <div>
          {roomGame.game === "tunk" ? (
            <TunkTable
              playerCount={roomGame.playerCount}
              humanName={roomGame.displayName}
              deckId={deckId}
              feltId={feltId}
              lifetimePoints={lifetimePoints}
              onMatchEnd={handleMatchEnd}
              onLeave={() => {
                setRoomGame(null);
                setView("home");
              }}
            />
          ) : (
            <PittyPatTable
              playerCount={roomGame.playerCount}
              humanName={roomGame.displayName}
              deckId={deckId}
              feltId={feltId}
              rules={DEFAULT_PITTY_PAT_RULES}
              onMatchEnd={handleMatchEnd}
              onLeave={() => {
                setRoomGame(null);
                setView("home");
              }}
            />
          )}
          <section className="mt-4 space-y-3 pb-4">
            <h2 className="text-xl font-black text-[var(--text)]">
              Table chat &amp; voice — room {roomGame.code}
            </h2>
            <article className="rounded-3xl bg-[var(--surface)] p-4 shadow">
              <ChatPanel
                roomCode={roomGame.code}
                token={token}
                displayName={roomGame.displayName}
                under13={profile?.under13 ?? false}
              />
            </article>
            <article className="rounded-3xl bg-[var(--surface)] p-4 shadow">
              <VoicePanel
                roomCode={roomGame.code}
                token={token}
                displayName={roomGame.displayName}
              />
            </article>
          </section>
        </div>
      )}

      {view === "rewards" && (
        <section className="pt-4">
          <BackBar title="Rewards" onBack={() => setView("home")} />
          <p className="mt-1 text-sm font-bold text-[var(--dim)]">
            Level {level} · {lifetimePoints} points won · {matchesWon}{" "}
            matches won
          </p>
          <div className="mt-3 rounded-3xl bg-[var(--surface)] p-4 shadow">
            <p className="text-sm font-black text-[var(--text)]">
              Rewards are earned free by playing and optional rewarded
              house videos. Points only — no purchases, no cash prizes.
              Points can never be bought, sold, or cashed out.
            </p>
            {next ? (
              <>
                <p className="mt-2 text-sm font-bold text-[var(--dim)]">
                  Next: Level {next.level} — {next.unlock} (
                  {next.pointsNeeded - lifetimePoints} points to go)
                </p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/10">
                  <div
                    className="h-full rounded-full bg-amber-500"
                    style={{
                      width: `${Math.min(
                        100,
                        (lifetimePoints / next.pointsNeeded) * 100,
                      )}%`,
                    }}
                  />
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm font-bold text-[var(--dim)]">
                Top level reached — every level reward is yours.
              </p>
            )}
          </div>

          <h3 className="mt-5 text-lg font-black text-[var(--text)]">
            Level ladder
          </h3>
          <div className="mt-2 space-y-2">
            {LEVELS.map((l) => {
              const earned = lifetimePoints >= l.pointsNeeded;
              const isNext = next?.level === l.level;
              return (
                <div
                  key={l.level}
                  className={`flex items-center gap-3 rounded-2xl p-3 shadow ${
                    earned
                      ? "bg-[var(--surface)]"
                      : "bg-[var(--surface)] opacity-60"
                  } ${isNext ? "ring-2 ring-amber-500" : ""}`}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-black text-white ${
                      earned ? "bg-emerald-700" : "bg-slate-400"
                    }`}
                  >
                    {earned ? "✓" : l.level}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-[var(--text)]">
                      Level {l.level} — {l.unlock}
                    </p>
                    <p className="text-xs font-bold text-[var(--dim)]">
                      {earned
                        ? "Earned"
                        : `${l.pointsNeeded} lifetime points to unlock`}
                      {isNext ? " · You're here" : ""}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <h3 className="mt-5 text-lg font-black text-[var(--text)]">
            Card styles — tap one you&apos;ve earned to play with it
          </h3>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {DECKS.map((d) => {
              const earned = earnedStyles.includes(d.id);
              const inUse = deckId === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => (earned ? equipDeck(d.id) : setView("store"))}
                  className={`rounded-2xl p-3 text-left shadow ${
                    inUse
                      ? "bg-[var(--surface)] ring-2 ring-amber-500"
                      : "bg-[var(--surface)]"
                  } ${earned ? "" : "opacity-80"}`}
                >
                  <span
                    className="block h-12 w-full rounded-lg border border-black/20"
                    style={{ background: d.back }}
                  />
                  <span className="mt-1 block text-sm font-black text-[var(--text)]">
                    {earned ? "" : "🔒 "}
                    {d.name}
                    {inUse ? " · in use" : ""}
                  </span>
                  <span className="block text-xs font-bold text-[var(--dim)]">
                    {earned ? "Earned — tap to use" : `${d.how} · Tap to unlock`}
                  </span>
                </button>
              );
            })}
          </div>

          <h3 className="mt-5 text-lg font-black text-[var(--text)]">
            Table themes — tap one you&apos;ve earned to play on it
          </h3>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {FELTS.map((f) => {
              const earned = earnedFelts.includes(f.id);
              const inUse = feltId === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => (earned ? equipFelt(f.id) : setView("store"))}
                  className={`rounded-2xl p-3 text-left shadow ${
                    inUse
                      ? "bg-[var(--surface)] ring-2 ring-amber-500"
                      : "bg-[var(--surface)]"
                  } ${earned ? "" : "opacity-80"}`}
                >
                  <span
                    className="block h-12 w-full rounded-lg border border-black/20"
                    style={{ background: f.css }}
                  />
                  <span className="mt-1 block text-sm font-black text-[var(--text)]">
                    {earned ? "" : "🔒 "}
                    {f.name}
                    {inUse ? " · in use" : ""}
                  </span>
                  <span className="block text-xs font-bold text-[var(--dim)]">
                    {earned ? "Earned — tap to use" : `${f.how} · Tap to unlock`}
                  </span>
                </button>
              );
            })}
          </div>
          {hasFoundersBundle ? (
            <p className="mt-3 text-sm font-bold text-[var(--dim)]">
              Founder&apos;s Bundle open — every style and theme is yours.
            </p>
          ) : hasPass ? (
            <p className="mt-3 text-sm font-bold text-[var(--dim)]">
              Family Fun Pass open — every standard style and theme is yours.
            </p>
          ) : null}
        </section>
      )}

      {view === "look" && (
        <section className="pt-4">
          <BackBar title="My Look" onBack={() => setView("home")} />
          <p className="mt-1 text-sm font-bold text-[var(--dim)]">
            Pick a card style and a table. Earned ones are yours to use —
            the rest show how to win them. See Rewards for the full ladder.
          </p>
          <h3 className="mt-4 text-lg font-black text-[var(--text)]">
            Card styles
          </h3>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {DECKS.map((d) => {
              const earned = earnedStyles.includes(d.id);
              const inUse = deckId === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => (earned ? equipDeck(d.id) : setView("store"))}
                  className={`rounded-2xl p-3 text-left shadow ${
                    inUse
                      ? "bg-[var(--surface)] ring-2 ring-amber-500"
                      : "bg-[var(--surface)]"
                  } ${earned ? "" : "opacity-80"}`}
                >
                  <span
                    className="block h-12 w-full rounded-lg border border-black/20"
                    style={{ background: d.back }}
                  />
                  <span className="mt-1 block text-sm font-black text-[var(--text)]">
                    {earned ? "" : "🔒 "}
                    {d.name}
                    {inUse ? " · in use" : ""}
                  </span>
                  <span className="block text-xs font-bold text-[var(--dim)]">
                    {earned ? "Earned — tap to use" : `${d.how} · Tap to unlock`}
                  </span>
                </button>
              );
            })}
          </div>
          <h3 className="mt-5 text-lg font-black text-[var(--text)]">
            Tables
          </h3>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {FELTS.map((f) => {
              const earned = earnedFelts.includes(f.id);
              const inUse = feltId === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => (earned ? equipFelt(f.id) : setView("store"))}
                  className={`rounded-2xl p-3 text-left shadow ${
                    inUse
                      ? "bg-[var(--surface)] ring-2 ring-amber-500"
                      : "bg-[var(--surface)]"
                  } ${earned ? "" : "opacity-80"}`}
                >
                  <span
                    className="block h-12 w-full rounded-lg border border-black/20"
                    style={{ background: f.css }}
                  />
                  <span className="mt-1 block text-sm font-black text-[var(--text)]">
                    {earned ? "" : "🔒 "}
                    {f.name}
                    {inUse ? " · in use" : ""}
                  </span>
                  <span className="block text-xs font-bold text-[var(--dim)]">
                    {earned ? "Earned — tap to use" : `${f.how} · Tap to unlock`}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {view === "store" && (
        <section className="pt-4">
          <BackBar title="Store" onBack={() => setView("home")} />
          <p className="mt-1 text-sm font-bold text-[var(--dim)]">
            {storeLive
              ? "Live payments are on — you pay on Stripe's own checkout page."
              : "Test mode — no real money is charged. Use the test card 4242 4242 4242 4242."}
          </p>
          <p className="mt-1 text-sm font-bold text-[var(--dim)]">
            Points are never for sale. These are perks only — card styles,
            table themes, and no ads.
          </p>
          {!signedIn && (
            <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-900">
              Sign in first to buy — purchases live on your account.
            </p>
          )}
          {storeMsg && (
            <p className="mt-3 rounded-2xl bg-[var(--surface)] p-3 text-sm font-bold text-[var(--text)] shadow">
              {storeMsg}
            </p>
          )}
          <div className="mt-4 space-y-3">
            <article className="rounded-3xl border-2 border-amber-500 bg-[var(--surface)] p-4 shadow">
              <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-[11px] font-black uppercase text-white">
                Best Value · Lifetime VIP
              </span>
              <h3 className="mt-1 text-base font-black text-[var(--text)]">
                C.F.N.B. Founder&apos;s Lifetime Bundle — $9.99
              </h3>
              <p className="mt-1 text-sm text-[var(--dim)]">
                Unlocks every current &amp; future card deck and table theme, VIP Crown badge, 2x level XP boost, and lifetime ad-free play. One-time payment.
              </p>
              <button
                type="button"
                disabled={!signedIn || hasFoundersBundle || profile?.under13}
                onClick={() => buy("founders_bundle")}
                className="mt-3 w-full rounded-2xl bg-amber-600 px-4 py-3 text-base font-black text-white shadow disabled:opacity-40"
              >
                {hasFoundersBundle
                  ? "Founder's Bundle Active ✓"
                  : profile?.under13
                    ? "Under 13 — can't buy"
                    : "Buy Founder's Bundle — $9.99"}
              </button>
            </article>
            <article className="rounded-3xl bg-[var(--surface)] p-4 shadow">
              <h3 className="text-base font-black text-[var(--text)]">
                Family Host Pack — $4.99
              </h3>
              <p className="mt-1 text-sm text-[var(--dim)]">
                Everything in the Family Fun Pass plus exclusive Royal Velvet &amp; Gold cosmetics and VIP Host status in Family Rooms. One-time payment.
              </p>
              <button
                type="button"
                disabled={!signedIn || hasFamilyHostPack || profile?.under13}
                onClick={() => buy("family_host_pack")}
                className="mt-3 w-full rounded-2xl bg-emerald-700 px-4 py-3 text-base font-black text-white shadow disabled:opacity-40"
              >
                {hasFamilyHostPack
                  ? "Family Host Pack Owned ✓"
                  : profile?.under13
                    ? "Under 13 — can't buy"
                    : "Buy Family Host Pack — $4.99"}
              </button>
            </article>
            <article className="rounded-3xl bg-[var(--surface)] p-4 shadow">
              <h3 className="text-base font-black text-[var(--text)]">
                Family Fun Pass — $1.99
              </h3>
              <p className="mt-1 text-sm text-[var(--dim)]">
                All standard card styles and table themes, plus ads removed for good. One-time payment.
              </p>
              <button
                type="button"
                disabled={!signedIn || hasPass || profile?.under13}
                onClick={() => buy("tunk_pass")}
                className="mt-3 w-full rounded-2xl bg-emerald-700 px-4 py-3 text-base font-black text-white shadow disabled:opacity-40"
              >
                {hasPass
                  ? "You own the Pass ✓"
                  : profile?.under13
                    ? "Under 13 — can't buy"
                    : "Buy the Pass — $1.99"}
              </button>
            </article>
            <article className="rounded-3xl bg-[var(--surface)] p-4 shadow">
              <h3 className="text-base font-black text-[var(--text)]">
                Royal Felt &amp; Deck Pack — $1.49
              </h3>
              <p className="mt-1 text-sm text-[var(--dim)]">
                Unlocks the exclusive Royal Velvet &amp; Gold card backs and matching Royal Velvet Lounge table. One-time payment.
              </p>
              <button
                type="button"
                disabled={!signedIn || hasRoyalCosmetics || profile?.under13}
                onClick={() => buy("royal_cosmetics_pack")}
                className="mt-3 w-full rounded-2xl bg-emerald-700 px-4 py-3 text-base font-black text-white shadow disabled:opacity-40"
              >
                {hasRoyalCosmetics
                  ? "Royal Pack Owned ✓"
                  : profile?.under13
                    ? "Under 13 — can't buy"
                    : "Buy Royal Pack — $1.49"}
              </button>
            </article>
            <article className="rounded-3xl bg-[var(--surface)] p-4 shadow">
              <h3 className="text-base font-black text-[var(--text)]">
                Remove Ads — $0.99
              </h3>
              <p className="mt-1 text-sm text-[var(--dim)]">
                Removes the between-game ads for good. One-time payment.
              </p>
              <button
                type="button"
                disabled={!signedIn || hasRemoveAds || profile?.under13}
                onClick={() => buy("remove_ads")}
                className="mt-3 w-full rounded-2xl bg-emerald-700 px-4 py-3 text-base font-black text-white shadow disabled:opacity-40"
              >
                {hasRemoveAds
                  ? "Ads are off ✓"
                  : profile?.under13
                    ? "Under 13 — can't buy"
                    : "Buy Remove Ads — $0.99"}
              </button>
            </article>
            {!storeLive && signedIn && (
              <article className="rounded-3xl bg-[var(--surface)] p-4 shadow">
                <h3 className="text-base font-black text-[var(--text)]">
                  Test card
                </h3>
                <p className="mt-1 text-sm text-[var(--dim)]">
                  Test mode only accepts the Stripe test card 4242 4242 4242
                  4242, any future date, any 3-digit code — no real money
                  moves.
                </p>
                <input
                  className="mt-2 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-base font-bold text-slate-900"
                  value={card}
                  onChange={(e) => setCard(e.target.value)}
                  inputMode="numeric"
                  aria-label="Test card number"
                />
              </article>
            )}
            <button
              type="button"
              disabled={!signedIn}
              onClick={restorePurchases}
              className="w-full rounded-2xl bg-[var(--surface)] px-4 py-3 text-base font-black text-[var(--text)] shadow disabled:opacity-40"
            >
              Restore Purchases
            </button>
          </div>
        </section>
      )}

      {view === "account" && (
        <section className="pt-4">
          <BackBar title="My Account" onBack={() => setView("home")} />
          {signedIn && profile ? (
            <div className="mt-3 space-y-3">
              <article className="rounded-3xl bg-[var(--surface)] p-4 shadow">
                <p className="text-lg font-black text-[var(--text)]">
                  {profile.name}
                </p>
                <p className="text-sm font-bold text-[var(--dim)]">
                  {profile.email}
                </p>
                <p className="mt-2 text-sm text-[var(--dim)]">
                  Lifetime points: <b className="text-[var(--text)]">{profile.points}</b> ·
                  Level {level} · Matches won: {profile.matchesWon} · Hands
                  won: {profile.handsWon}/{profile.handsPlayed}
                </p>
                <p className="mt-1 text-sm text-[var(--dim)]">
                  Family Fun Pass: {hasPass ? "owned ✓" : "not owned"} ·
                  Remove Ads: {hasRemoveAds ? "on ✓" : "off"}
                </p>
                <button
                  type="button"
                  onClick={signOut}
                  className="mt-3 rounded-2xl bg-black/10 px-4 py-2 text-sm font-black text-[var(--text)]"
                >
                  Sign out
                </button>
              </article>
              <article className="rounded-3xl bg-red-50 p-4 shadow">
                <h3 className="text-base font-black text-red-900">
                  Delete my account
                </h3>
                <p className="mt-1 text-sm text-red-900/70">
                  This permanently removes your account, your points and
                  progress, your purchases, and your Stripe payment records.
                  It cannot be undone.
                </p>
                <input
                  className="mt-2 w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-base text-slate-900"
                  type="password"
                  placeholder="Your password"
                  value={deletePw}
                  onChange={(e) => setDeletePw(e.target.value)}
                  aria-label="Password to confirm deletion"
                />
                <input
                  className="mt-2 w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-base text-slate-900"
                  placeholder='Type DELETE to confirm'
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  aria-label="Type DELETE to confirm"
                />
                <button
                  type="button"
                  disabled={deleteConfirm !== "DELETE" || !deletePw}
                  onClick={async () => {
                    if (!token) return;
                    try {
                      const r = await api.deleteAccount({
                        token,
                        password: deletePw,
                        confirm: true,
                      });
                      if (r.ok) {
                        saveToken(null, null);
                        setView("home");
                      } else {
                        setAuthMsg(r.error ?? "Could not delete the account.");
                      }
                    } catch (err) {
                      setAuthMsg(
                        err instanceof Error ? err.message : "Something went wrong.",
                      );
                    }
                  }}
                  className="mt-3 w-full rounded-2xl bg-red-700 px-4 py-3 text-base font-black text-white shadow disabled:opacity-40"
                >
                  Delete my account forever
                </button>
                {authMsg && (
                  <p className="mt-2 text-sm font-bold text-red-900">
                    {authMsg}
                  </p>
                )}
              </article>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAuthMode("in")}
                  className={`flex-1 rounded-2xl px-4 py-2 text-base font-black shadow ${
                    authMode === "in"
                      ? "bg-emerald-700 text-white"
                      : "bg-[var(--surface)] text-[var(--text)]"
                  }`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode("up")}
                  className={`flex-1 rounded-2xl px-4 py-2 text-base font-black shadow ${
                    authMode === "up"
                      ? "bg-emerald-700 text-white"
                      : "bg-[var(--surface)] text-[var(--text)]"
                  }`}
                >
                  Sign up
                </button>
              </div>
              {authMode === "up" && (
                <input
                  className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-base text-slate-900"
                  placeholder="Table name (what players see)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-label="Table name"
                />
              )}
              <input
                className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-base text-slate-900"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label="Email"
              />
              <input
                className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-base text-slate-900"
                type="password"
                placeholder="Password (6+ characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-label="Password"
              />
              {authMode === "up" && (
                <label className="block text-sm font-bold text-[var(--dim)]">
                  Birth year
                  <input
                    className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-base text-slate-900"
                    type="number"
                    min={1926}
                    max={2026}
                    value={birthYear}
                    onChange={(e) =>
                      setBirthYear(Number(e.target.value) || 1990)
                    }
                    aria-label="Birth year"
                  />
                </label>
              )}
              <button
                type="button"
                onClick={doAuth}
                className="w-full rounded-2xl bg-emerald-700 px-4 py-3 text-base font-black text-white shadow"
              >
                {authMode === "in" ? "Sign in" : "Create my account"}
              </button>
              {authMsg && (
                <p className="text-sm font-bold text-red-700">{authMsg}</p>
              )}
              {profileError && (
                <p className="text-sm font-bold text-red-700">
                  {profileError}
                </p>
              )}
              <p className="text-xs font-bold text-[var(--dim)]">
                Your password is salted and hashed — nobody at the game can
                read it back. Under-13 accounts cannot buy anything.
              </p>
            </div>
          )}
        </section>
      )}

      {view === "how" && <HowScreen onBack={() => setView("home")} />}
      {view === "privacy" && (
        <PrivacyScreen onBack={() => setView("home")} />
      )}
      {view === "terms" && <TermsScreen onBack={() => setView("home")} />}
      {view === "safety" && <SafetyScreen onBack={() => setView("home")} />}
      <InterstitialAdModal
        open={showInterstitial}
        onClose={() => setShowInterstitial(false)}
        onOpenStore={() => setView("store")}
      />
    </div>
  );
}
