// House ad slot for Family Fun.
//
// This is the in-game house version: a banner for the Family Fun Pass
// and an optional rewarded house video. No third-party ad network is
// connected yet and there is no ad tracking. When a real network is
// chosen, swap the video source / SDK in here and keep the same
// reward flow: watch between games, claim the free points, never
// during a hand. Players with the Pass or Remove Ads never see this.

import { useEffect, useState } from "react";

export const AD_REWARD_POINTS = 10;
const REWARD_COOLDOWN_MS = 60 * 60 * 1000;
const REWARD_KEY = "family-fun-ad-reward-at";

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

  async function claimReward() {
    if (!canClaim || claiming || claimed) return;
    setClaiming(true);
    setMessage(null);
    const ok = await props.onReward();
    setClaiming(false);
    if (!ok) {
      setMessage("Could not add the points — try again in a second.");
      return;
    }
    try {
      localStorage.setItem(REWARD_KEY, String(Date.now()));
    } catch {
      /* cooldown just will not persist */
    }
    setReadyAt(rewardReadyAt());
    setClaimed(true);
  }

  return (
    <>
      <div className="mx-auto mt-4 max-w-sm rounded-3xl border border-amber-300 bg-amber-50 p-3 text-left shadow">
        <p className="text-[11px] font-black uppercase tracking-wide text-amber-700">
          House ad
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
            disabled={coolingDown}
            onClick={() => setOpen(true)}
            className="rounded-full bg-[#14532d] px-4 py-2 text-sm font-black text-white disabled:opacity-40"
          >
            {coolingDown
              ? `Reward in ${cooldownMinutes} min`
              : `Watch ad · +${AD_REWARD_POINTS} points`}
          </button>
        </div>
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
