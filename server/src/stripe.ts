// Real Stripe Checkout for Family Fun — hosted Checkout Sessions.
//
// Live payments only happen when STRIPE_SECRET_KEY is set in Render
// (Environment variables — never in chat, never in git).
//
// POINTS ARE NEVER FOR SALE: no product here sells points, chips, or any
// in-game currency. Points are earned by playing and by optional free
// rewarded ads.

import Stripe from "stripe";

export type ProductId =
  | "remove_ads"
  | "royal_cosmetics_pack"
  | "tunk_pass"
  | "family_host_pack"
  | "founders_bundle";

export const PRODUCTS: Record<
  ProductId,
  { amountCents: number; name: string; description: string }
> = {
  remove_ads: {
    amountCents: 99,
    name: "Remove Ads",
    description:
      "Removes the between-game ads for good. One-time payment. Points are never for sale.",
  },
  royal_cosmetics_pack: {
    amountCents: 149,
    name: "Royal Felt & Deck Pack",
    description:
      "Unlocks exclusive Royal Gold & Velvet card backs and table themes. One-time payment. Points are never for sale.",
  },
  tunk_pass: {
    amountCents: 199,
    name: "Family Fun Pass",
    description:
      "Every standard card style and table theme, plus ads removed for good. One-time payment. Points are never for sale.",
  },
  family_host_pack: {
    amountCents: 499,
    name: "Family Host Pack",
    description:
      "Everything in Family Fun Pass plus VIP Host badge in Family Rooms and exclusive Royal Gold & Velvet cosmetics. One-time payment.",
  },
  founders_bundle: {
    amountCents: 999,
    name: "C.F.N.B. Founder's Lifetime Bundle",
    description:
      "Unlocks all current & future cosmetics, Founder's VIP badge, 2x level XP boost, and lifetime ad-free play. One-time payment.",
  },
};

export function isLiveStripe(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(key, { timeout: 20_000 });
  }
  return stripeClient;
}

const ALLOWED_ORIGINS = new Set([
  "https://family-fun-9j1b.onrender.com",
  "https://tunk-game.onrender.com",
  "http://localhost:3000",
  "http://localhost:5173",
]);

export function isAllowedOrigin(origin: string): boolean {
  return ALLOWED_ORIGINS.has(origin);
}

export async function createCheckoutSession(args: {
  accountId: number;
  email: string;
  product: ProductId;
  origin: string;
}): Promise<string> {
  const stripe = getStripe();
  if (!stripe) throw new Error("Live Stripe is not configured.");
  const product = PRODUCTS[args.product];
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: args.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: product.amountCents,
          product_data: {
            name: product.name,
            description: product.description,
          },
        },
      },
    ],
    metadata: {
      accountId: String(args.accountId),
      product: args.product,
      game: "tunk",
    },
    success_url: `${args.origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}&product=${args.product}`,
    cancel_url: `${args.origin}/?checkout=cancelled`,
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL.");
  return session.url;
}

export interface VerifiedSession {
  product: ProductId;
  accountId: number;
  amountCents: number;
}

export async function verifyPaidSession(
  sessionId: string,
): Promise<VerifiedSession> {
  const stripe = getStripe();
  if (!stripe) throw new Error("Live Stripe is not configured.");
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid") {
    throw new Error("That Stripe payment has not completed yet.");
  }
  const product = session.metadata?.product as ProductId | undefined;
  const accountId = Number(session.metadata?.accountId ?? "");
  if (!product || !(product in PRODUCTS)) {
    throw new Error("That Stripe payment is not for a Family Fun product.");
  }
  if (!Number.isInteger(accountId) || accountId <= 0) {
    throw new Error("That Stripe payment is not tied to a player account.");
  }
  if (session.currency?.toLowerCase() !== "usd") {
    throw new Error("That Stripe payment is not in USD.");
  }
  if (session.amount_total !== PRODUCTS[product].amountCents) {
    throw new Error("That Stripe payment amount does not match the product.");
  }
  return { product, accountId, amountCents: session.amount_total ?? 0 };
}
