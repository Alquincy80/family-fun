# C.F.N.B. Presents — Family Fun — Pitty Pat or Tunk — Your Move

A standalone port-style build of the second family card game, following the
same stack and patterns as C.F.N.B. Cutthroat (`~/workspace/cfnb-port/`):
React 19 + Bun + TypeScript, standalone Bun server serving the built client
+ `POST /actions`, Drizzle with Postgres (Neon `DATABASE_URL` when set,
local PGlite fallback). **This is a separate game — nothing in
`~/workspace/cfnb-port/` was touched.**

## The game

Standard Tonk rules (Pagat) with Al's house points:

- 2 or 4 players. Quick Play vs computer opponents, no sign-up needed:
  1v1 (you vs Dee) or 4-player (you vs Marcus, Dee, Trey).
- Deal 5 cards each. Next card face up starts the discard pile; the rest
  is the stock.
- **Al's card values** (used for hand totals, drop comparisons, and
  end-of-hand scoring): number cards 5 points, 10s and face cards 10
  points, Aces 15 points.
- Turn: at the START of your turn you may DROP (claim the lowest unmatched
  total). Otherwise draw the top stock card or the top discard, lay down
  spreads (3–4 of a kind, or 3+ in a row of the same suit — aces low
  only), hit other players' spreads, then discard one card.
- Natural Tunk: a starting hand totalling exactly 50 (e.g. five 10s/faces)
  is shown at once and wins DOUBLE points from each other player. Two
  players dealt 50 = hand thrown in, redeal.
- Going out by spreading/hitting everything with no card left to discard
  is a "tonk out" = double points. Going out on a final discard = single.
- Bad drop: the dropper pays DOUBLE points (the other losers pay single).
- Stock runs out: lowest unmatched total wins a single stake.
- **End-of-hand points (Al's key ask): at the end of every hand, each
  loser's unmatched cards are added up (Al's values) and the winner takes
  that many points from each loser.**
- Match: everybody starts at 5 points. First to 150 wins a 1v1 match,
  first to 300 wins a 4-player match. A player at 0 gets a free top-up
  back to 5 at the next hand so nobody gets stuck.
- Levels and prizes: lifetime points won climb 10 levels; each level
  unlocks a card style or table theme (free unlocks only — same model as
  C.F.N.B.'s styles, starting on a plain House deck). The Rewards page
  (home screen) shows the ladder, current level, progress to the next
  level, locked vs earned, and lets players equip earned styles/themes.

## Money — points are never for sale

- NO real-money deposits, NO chip purchases, NO cash-out. Points can
  never be bought, sold, or cashed out.
- Real money only for in-app purchases and perks via Stripe: Family
  Fun Pass $1.99 (every card style and table theme + no ads) and
  Remove Ads $0.99. Same pattern as C.F.N.B.: test-mode 4242 flow when
  no key is set, live Stripe Checkout when `STRIPE_SECRET_KEY` is set.
- In-app Privacy Policy and Terms state points-only, no gambling, no
  cash prizes. Under-13 cannot buy. Restore Purchases button. Account
  deletion (account + progress + purchases + Stripe records).

## Look

Wooden plank table with brass trim, players as framed cartoon portraits
with name plates at their seats (same cast as C.F.N.B.), big readable
cards, spread-out table, player's hand at the bottom sorted by suit,
legal plays clearly marked.

**TABLE LOOK IS ON HOLD (2026-11-22):** Al is still deciding the pattern.
Do NOT copy the C.F.N.B. table and do NOT use the pirate-game pictures —
both directions were corrected. All table styling lives in one place,
`client/src/tableStyle.ts` (currently a dark-walnut + copper
placeholder, deliberately different from C.F.N.B.'s light oak + brass),
so the confirmed look swaps in by changing that one file. The felt
centre is the unlockable theme (FELTS in `client/src/tunk.ts`); the home
screen, Rewards page and Store use the parchment variables in
`client/src/theme.css`.

## Scope

Quick Play, accounts, points/levels, Store, safeguards. NO Family Rooms,
chat, or voice yet — those come later if Al wants them.

## Run it

```sh
bun install
bun run typecheck   # client + server
bun run build       # client bundle -> client/dist
bun ./server/src/server.ts   # PORT env, default 3000; local PGlite DB
```

With `DATABASE_URL` set, the server uses Neon instead of PGlite.
On Render: service `tunk-game`, build command
`bun install && bun run build`, start command
`bun ./server/src/server.ts`. Set `DATABASE_URL` and (when Al is ready
for live payments) `STRIPE_SECRET_KEY` in the Render dashboard —
never in git. Render auto-deploy has silently missed pushes on the
C.F.N.B. service before: after pushing, verify the deploy actually
happened and use Manual Deploy → Deploy latest commit if it didn't.

## Actions (POST /actions)

`signUp`, `signIn`, `getProfile`, `deleteAccount`,
`recordMatchResult`, `buyProduct`, `getStoreStatus`,
`createCheckoutSession`, `confirmCheckout`.
