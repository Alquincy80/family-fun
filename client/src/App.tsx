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
import {
  DECKS,
  FELTS,
  LEVELS,
  levelForPoints,
  nextLevel,
  unlockedFelts,
  unlockedStyles,
} from "./tunk";

type Profile = ApiResponse<typeof Actions, "getProfile">;

type View =
  | "home"
  | "game"
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
            No third-party ads and no ad tracking — the only ads are the
            game&apos;s own house ads for the Family Fun Pass, shown between
            games, never during a hand. No data is sold to anyone, and the
            game does not collect your location, your contacts, or your
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
        <PolicySection title="Deleting your account">
          <p>
            You can delete your account in the game (My Account → Delete my
            account). That permanently removes your account, your progress,
            your purchases, and your Stripe payment records. Other
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
            are earned by playing only: they cannot be bought, sold, or
            turned into real money. Nothing you win in the game can be
            turned into real money.
          </p>
        </PolicySection>
        <PolicySection title="Free and paid">
          <p>
            Quick Play is free. The Family Fun Pass is $1.99 one-time
            and Remove Ads is $0.99 one-time. Both are one-time payments —
            there is no subscription. Purchases are tied to your signed-in
            account and come back when you sign in on any device (Store →
            Restore purchases). The Pass unlocks every card style and table
            theme and removes ads; it never buys points.
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
      <BackBar title="How to Play Tunk" onBack={onBack} />
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
        <PolicySection title="Levels and rewards">
          <p>
            Points you win stack up toward levels. Each level unlocks a card
            style or a table theme — free, earned by playing. See Rewards
            on the home screen for the whole ladder.
          </p>
        </PolicySection>
      </div>
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

  const signedIn = Boolean(token && profile?.ok);
  const lifetimePoints = signedIn
    ? (profile?.points ?? 0)
    : guestPoints;
  const matchesWon = signedIn ? (profile?.matchesWon ?? 0) : 0;
  const hasPass = Boolean(profile?.hasTunkPass);
  const hasRemoveAds = Boolean(profile?.hasRemoveAds);
  const level = levelForPoints(lifetimePoints);
  const next = nextLevel(lifetimePoints);
  const earnedStyles = unlockedStyles(lifetimePoints, matchesWon, hasPass);
  const earnedFelts = unlockedFelts(lifetimePoints, hasPass);

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
      const nextGuest = guestPoints + result.pointsWon;
      setGuestPoints(nextGuest);
      try {
        localStorage.setItem(GUEST_POINTS_KEY, String(nextGuest));
      } catch {
        /* ignore */
      }
    }
    setView("home");
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

  async function buy(product: "tunk_pass" | "remove_ads") {
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
          <p className="text-sm font-black tracking-[0.3em] uppercase text-[var(--dim)]">
            C.F.N.B. Presents
          </p>
          <h1 className="mt-1 text-5xl font-black tracking-tight text-[var(--text)]">
            Family Fun
          </h1>
          <p className="mt-1 text-xl font-black text-[var(--text)]">
            Pitty Pat or Tunk
          </p>
          <p className="mt-1 text-base font-bold text-[var(--dim)]">
            Your Move — bet points, not money.
          </p>
          <p className="mt-1 text-sm font-bold text-[var(--dim)]">
            Created by Albert Q. Lightfoot
          </p>

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
              Play 1v1 — You vs Dee
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
              Play 4-Player — You vs Marcus, Dee &amp; Trey
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

          {!hasPass && !hasRemoveAds && (
            <div className="mx-auto mt-4 max-w-sm rounded-3xl border border-amber-300 bg-amber-50 p-3 text-left shadow">
              <p className="text-sm font-black text-amber-900">
                Family Fun Pass — $1.99 one time
              </p>
              <p className="text-xs font-bold text-amber-900/70">
                Every card style and table theme, and no ads. Points are
                never for sale — they are earned by playing.
              </p>
              <button
                type="button"
                onClick={() => setView("store")}
                className="mt-2 rounded-full bg-amber-600 px-4 py-2 text-sm font-black text-white"
              >
                See the Store →
              </button>
            </div>
          )}

          <Footer
            onPrivacy={() => setView("privacy")}
            onTerms={() => setView("terms")}
            onSafety={() => setView("safety")}
          />
        </section>
      )}

      {view === "game" && (
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

      {view === "rewards" && (
        <section className="pt-4">
          <BackBar title="Rewards" onBack={() => setView("home")} />
          <p className="mt-1 text-sm font-bold text-[var(--dim)]">
            Level {level} · {lifetimePoints} points won · {matchesWon}{" "}
            matches won
          </p>
          <div className="mt-3 rounded-3xl bg-[var(--surface)] p-4 shadow">
            <p className="text-sm font-black text-[var(--text)]">
              Rewards are earned free by playing. Points only — no purchases,
              no cash prizes. Points can never be bought, sold, or cashed
              out.
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
                  disabled={!earned}
                  onClick={() => equipDeck(d.id)}
                  className={`rounded-2xl p-3 text-left shadow ${
                    inUse
                      ? "bg-[var(--surface)] ring-2 ring-amber-500"
                      : "bg-[var(--surface)]"
                  } ${earned ? "" : "opacity-55"}`}
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
                    {earned ? "Earned — tap to use" : d.how}
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
                  disabled={!earned}
                  onClick={() => equipFelt(f.id)}
                  className={`rounded-2xl p-3 text-left shadow ${
                    inUse
                      ? "bg-[var(--surface)] ring-2 ring-amber-500"
                      : "bg-[var(--surface)]"
                  } ${earned ? "" : "opacity-55"}`}
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
                    {earned ? "Earned — tap to use" : f.how}
                  </span>
                </button>
              );
            })}
          </div>
          {hasPass && (
            <p className="mt-3 text-sm font-bold text-[var(--dim)]">
              Family Fun Pass open — every style and theme is yours.
            </p>
          )}
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
                  disabled={!earned}
                  onClick={() => equipDeck(d.id)}
                  className={`rounded-2xl p-3 text-left shadow ${
                    inUse
                      ? "bg-[var(--surface)] ring-2 ring-amber-500"
                      : "bg-[var(--surface)]"
                  } ${earned ? "" : "opacity-55"}`}
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
                    {earned ? "Earned — tap to use" : d.how}
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
                  disabled={!earned}
                  onClick={() => equipFelt(f.id)}
                  className={`rounded-2xl p-3 text-left shadow ${
                    inUse
                      ? "bg-[var(--surface)] ring-2 ring-amber-500"
                      : "bg-[var(--surface)]"
                  } ${earned ? "" : "opacity-55"}`}
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
                    {earned ? "Earned — tap to use" : f.how}
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
            <article className="rounded-3xl bg-[var(--surface)] p-4 shadow">
              <h3 className="text-base font-black text-[var(--text)]">
                Family Fun Pass — $1.99
              </h3>
              <p className="mt-1 text-sm text-[var(--dim)]">
                Every card style and table theme, and ads removed for good.
                One-time payment.
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
    </div>
  );
}
