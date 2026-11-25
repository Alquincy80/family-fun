// Ad slot for Family Fun.
//
// Google H5 Games Ads is wired below for the paying rewarded path:
// set ADSENSE_PUBLISHER_ID to Al's ca-pub ID after AdSense H5 approval
// and the Watch ad button will call Google's Ad Placement API. Until
// that ID is set, the house fallback runs (Pass banner + rewarded
// house video) and no outside ad revenue is earned. Before setting
// the ID, update the Privacy Policy for third-party ads. Players with
// the Pass or Remove Ads never see this; the parent also hides it for
// under-13 accounts.

import { useEffect, useState } from "react";

export const AD_REWARD_POINTS = 10;
const ADSENSE_PUBLISHER_ID = "";
const GOOGLE_H5_ENABLED = ADSENSE_PUBLISHER_ID.startsWith("ca-pub-");
const REWARD_COOLDOWN_MS = 60 * 60 * 1000;
const REWARD_KEY = "family-fun-ad-reward-at";

type AdBreakConfig = {
  type: string;
  name: string;
  beforeAd?: () => void;
  afterAd?: () => void;
  beforeReward?: (showAdFn: () => void) => void;
  adDismissed?: () => void;
  adViewed?: () => void;
  adBreakDone?: (placementInfo: unknown) => void;
};

declare global {
  interface Window {
    adsbygoogle?: unknown[];
    adBreak?: (config: AdBreakConfig) => void;
    adConfig?: (config: unknown) => void;
  }
}

function loadGoogleH5(): boolean {
  if (!GOOGLE_H5_ENABLED) return false;
  if (window.adBreak) return true;
  window.adsbygoogle = window.adsbygoogle || [];
  const push = (config: unknown) => {
    window.adsbygoogle?.push(config);
  };
  window.adBreak = push;
  window.adConfig = push;
  const script = document.createElement("script");
  script.async = true;
  script.crossOrigin = "anonymous";
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUBLISHER_ID}`;
  document.head.appendChild(script);
  return true;
}

function showGoogleRewarded(): Promise<boolean> {
  if (!loadGoogleH5() || !window.adBreak) return Promise.resolve(false);
  return new Promise((resolve) => {
    let settled = false;
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(ok);
    };
    const timer = window.setTimeout(() => done(false), 20000);
    window.adBreak?.({
      type: "reward",
      name: "family-fun-rewarded-points",
      beforeReward: (showAdFn) => showAdFn(),
      adViewed: () => done(true),
      adDismissed: () => done(false),
      adBreakDone: () => done(false),
    });
  });
}

function rewardReadyAt(): number {
  try {
    const last = Number(localStorage.getItem(REWARD_KEY) ?? 0);
    return Number.isFinite(last) ? last + REWARD_COOLDOWN_MS : 0;
  } catch {
    return 0;
  }
}

export function BannerAd(props: {
  onOpenStore: () => void;
  onReward: () => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(10);
  const [canClaim, setCanClaim] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [readyAt, setReadyAt] = useState(rewardReadyAt);

  const now = Date.now();
  const coolingDown = readyAt > now;
  const cooldownMinutes = coolingDown
    ? Math.max(1, Math.ceil((readyAt - now) / 60000))
    : 0;

  useEffect(() => {
    loadGoogleH5();
  }, []);

  useEffect(() => {
    if (!open) return;
    setSecondsLeft(10);
    setCanClaim(false);
    setClaimed(false);
    setMessage(null);
    const timer = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          window.clearInterval(timer);
          setCanClaim(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [open]);

  async function grantReward(): Promise<boolean> {
    const ok = await props.onReward();
    if (!ok) return false;
    try {
      localStorage.setItem(REWARD_KEY, String(Date.now()));
    } catch {
      /* cooldown just will not persist */
    }
    setReadyAt(rewardReadyAt());
    return true;
  }

  async function claimReward() {
    if (!canClaim || claiming || claimed) return;
    setClaiming(true);
    setMessage(null);
    const ok = await grantReward();
    setClaiming(false);
    if (!ok) {
      setMessage("Could not add the points — try again in a second.");
      return;
    }
    setClaimed(true);
  }

  async function watchAd() {
    if (coolingDown || claiming) return;
    setMessage(null);
    if (GOOGLE_H5_ENABLED) {
      setClaiming(true);
      const viewed = await showGoogleRewarded();
      if (!viewed) {
        setClaiming(false);
        setMessage("No ad available right now — try again later.");
        return;
      }
      const ok = await grantReward();
      setClaiming(false);
      setMessage(
        ok
          ? `Done — +${AD_REWARD_POINTS} points added.`
          : "Could not add the points — try again in a second.",
      );
      return;
    }
    setOpen(true);
  }

  return (
    <>
      <div className="mx-auto mt-4 max-w-sm rounded-3xl border border-amber-300 bg-amber-50 p-3 text-left shadow">
        <p className="text-[11px] font-black uppercase tracking-wide text-amber-700">
          {GOOGLE_H5_ENABLED ? "Ad" : "House ad"}
        </p>
        <p className="mt-1 text-sm font-black text-amber-900">
          Family Fun Pass — $1.99 one time
        </p>
        <p className="text-xs font-bold text-amber-900/70">
          Every card style and table theme, and no ads. Points are never
          for sale.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={props.onOpenStore}
            className="rounded-full bg-amber-600 px-4 py-2 text-sm font-black text-white"
          >
            See the Store →
          </button>
          <button
            type="button"
            disabled={coolingDown || claiming}
            onClick={() => void watchAd()}
            className="rounded-full bg-[#14532d] px-4 py-2 text-sm font-black text-white disabled:opacity-40"
          >
            {coolingDown
              ? `Reward in ${cooldownMinutes} min`
              : claiming && GOOGLE_H5_ENABLED
                ? "Loading ad…"
                : `Watch ad · +${AD_REWARD_POINTS} points`}
          </button>
        </div>
        {message && !open && (
          <p className="mt-2 text-xs font-bold text-amber-900/80" role="status">
            {message}
          </p>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-[var(--surface)] p-4 shadow-xl">
            <p className="text-[11px] font-black uppercase tracking-wide text-[var(--dim)]">
              Rewarded house ad
            </p>
            <h3 className="mt-1 text-lg font-black text-[var(--text)]">
              Watch to earn +{AD_REWARD_POINTS} free points
            </h3>
            <video
              className="mt-3 aspect-[4/5] w-full rounded-2xl bg-black object-cover"
              src="/family-fun-ad-video.mp4"
              poster="/cover.jpg"
              autoPlay
              muted
              playsInline
              controls
              onEnded={() => setCanClaim(true)}
            />
            <p className="mt-2 text-xs font-bold text-[var(--dim)]">
              {claimed
                ? `Done — +${AD_REWARD_POINTS} points added.`
                : canClaim
                  ? "Ad finished — claim your points."
                  : `Your reward unlocks in ${secondsLeft}s.`}
            </p>
            {message && (
              <p className="mt-2 rounded-lg bg-[#fee2e2] px-3 py-2 text-sm font-semibold text-[#7f1d1d]" role="alert">
                {message}
              </p>
            )}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={!canClaim || claiming || claimed}
                onClick={() => void claimReward()}
                className="flex-1 rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-black text-white shadow disabled:opacity-40"
              >
                {claimed
                  ? "Claimed ✓"
                  : claiming
                    ? "Adding…"
                    : `Claim +${AD_REWARD_POINTS} points`}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-2xl bg-black/10 px-4 py-3 text-sm font-black text-[var(--text)]"
              >
                {claimed ? "Done" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
