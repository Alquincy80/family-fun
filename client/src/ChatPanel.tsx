// Family Room table chat: quick-talk phrases for everyone, free text for
// players 13 and up, a word filter on the server before anything posts,
// and Block (this device only) + Report per player.
//
// Plain useState + useEffect polling — this app has no react-query
// provider, so messages refresh on a 4-second interval and right after
// a post lands.

import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { QUICK_TALK } from "./tunk";

interface ChatPanelProps {
  roomCode: string;
  token: string | null;
  displayName: string;
  under13: boolean;
}

interface ChatMessage {
  id: number;
  authorName: string;
  body: string;
  createdAt: string;
}

const REPORT_REASONS = [
  "Cussing or insults",
  "Disrespect at the table",
  "Bullying another player",
  "Something else not family-friendly",
];

// Players blocked on this device only. Keyed by author (table) name, kept
// in localStorage — blocking hides that player's messages for you here; it
// does not remove them for anyone else or report them.
const LS_BLOCKED = "tunk-blocked";

function loadBlocked(): string[] {
  try {
    const raw = localStorage.getItem(LS_BLOCKED);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((n): n is string => typeof n === "string");
      }
    }
  } catch {
    /* no blocked list yet */
  }
  return [];
}

export function ChatPanel({
  roomCode,
  token,
  displayName,
  under13,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [reportTarget, setReportTarget] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0] as string);
  const [reportDone, setReportDone] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [blocked, setBlocked] = useState<string[]>(loadBlocked);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await api.listMessages({ scope: "room", roomCode });
      setMessages(res.messages);
    } catch {
      /* next poll in 4s picks it up */
    } finally {
      setLoading(false);
    }
  }, [roomCode]);

  useEffect(() => {
    void fetchMessages();
    const t = window.setInterval(() => void fetchMessages(), 4000);
    return () => window.clearInterval(t);
  }, [fetchMessages]);

  function saveBlocked(next: string[]) {
    setBlocked(next);
    try {
      localStorage.setItem(LS_BLOCKED, JSON.stringify(next));
    } catch {
      /* blocking still works for this session */
    }
  }

  function blockAuthor(name: string) {
    if (!blocked.includes(name)) saveBlocked([...blocked, name]);
  }

  function unblockAuthor(name: string) {
    saveBlocked(blocked.filter((n) => n !== name));
  }

  async function post(body: string, quickTalk: boolean) {
    if (posting) return;
    setPosting(true);
    try {
      const res = await api.postMessage({
        token,
        guestName: token ? null : displayName,
        scope: "room",
        roomCode,
        body,
        quickTalk,
      });
      if (res.posted) {
        setDraft("");
        setNotice(null);
        await fetchMessages();
      } else {
        setNotice(res.notice ?? "Keep it cool — that one can't post.");
      }
    } catch {
      setNotice("Chat hiccup — try that again in a second.");
    } finally {
      setPosting(false);
    }
  }

  async function sendReport() {
    if (!reportTarget || reporting) return;
    setReporting(true);
    try {
      await api.reportPlayer({
        reporterName: displayName,
        targetName: reportTarget,
        reason: reportReason,
        scope: "room",
      });
      setReportDone(true);
      setReportTarget(null);
    } catch {
      /* report stays open to retry */
    } finally {
      setReporting(false);
    }
  }

  const visible = messages.filter((m) => !blocked.includes(m.authorName));
  const hiddenCount = messages.length - visible.length;

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1" aria-label="Chat messages">
        {loading && (
          <p className="text-sm text-[var(--dim)]">Loading chat…</p>
        )}
        {messages.length === 0 && !loading && (
          <p className="text-sm text-[var(--dim)]">
            No messages yet. Say hey to the family — keep it cool and it posts
            right away.
          </p>
        )}
        {hiddenCount > 0 && (
          <p className="rounded-lg bg-[var(--bg)] px-3 py-2 text-xs font-semibold text-[var(--dim)]">
            {hiddenCount} message{hiddenCount === 1 ? "" : "s"} hidden from{" "}
            {blocked.length === 1 ? "a player you blocked" : "players you blocked"}.
          </p>
        )}
        {visible.map((m) => (
          <div key={m.id} className="rounded-xl bg-[var(--bg)] px-3 py-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-bold text-[var(--text)]">
                {m.authorName}
              </span>
              {m.authorName !== displayName && (
                <span className="flex shrink-0 gap-3">
                  <button
                    type="button"
                    className="text-xs font-semibold text-[var(--dim)] underline"
                    aria-label={`Block ${m.authorName}`}
                    onClick={() => blockAuthor(m.authorName)}
                  >
                    Block
                  </button>
                  <button
                    type="button"
                    className="text-xs font-semibold text-[#b91c1c] underline"
                    aria-label={`Report ${m.authorName}`}
                    onClick={() => {
                      setReportTarget(m.authorName);
                      setReportDone(false);
                    }}
                  >
                    Report
                  </button>
                </span>
              )}
            </div>
            <p className="text-sm text-[var(--text)]">{m.body}</p>
          </div>
        ))}
        {blocked.length > 0 && (
          <div className="rounded-xl bg-[var(--bg)] px-3 py-2">
            <p className="text-xs font-bold text-[var(--dim)]">
              Blocked on this device ({blocked.length}):{" "}
              {blocked.join(", ")}
            </p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {blocked.map((name) => (
                <button
                  key={name}
                  type="button"
                  className="rounded-full bg-[var(--surface)] px-3 py-1 text-xs font-bold text-[var(--text)] shadow"
                  onClick={() => unblockAuthor(name)}
                >
                  Unblock {name}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-[var(--dim)]">
              Blocking only hides their messages for you, on this device.
              Report them if they broke the Keep It Cool rules.
            </p>
          </div>
        )}
      </div>

      {reportTarget && (
        <div className="mt-3 rounded-xl border border-[#f5b942] bg-[#fff7e0] p-3">
          <p className="text-sm font-bold text-[#7c2d12]">
            Report {reportTarget}?
          </p>
          <label className="mt-2 block text-xs font-semibold text-[#7c2d12]" htmlFor="report-reason">
            What happened?
          </label>
          <select
            id="report-reason"
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-2 py-2 text-sm text-[#221812]"
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
          >
            {REPORT_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className="rounded-full bg-[#b91c1c] px-4 py-2 text-sm font-bold text-white"
              onClick={() => void sendReport()}
              disabled={reporting}
            >
              Send report
            </button>
            <button
              type="button"
              className="rounded-full bg-white px-4 py-2 text-sm font-bold text-[#7c2d12]"
              onClick={() => setReportTarget(null)}
            >
              Cancel
            </button>
          </div>
          <p className="mt-2 text-xs text-[#7c2d12]">
            Repeat reports add strikes, and strikes put a player on a 24-hour
            chat cool-down automatically.
          </p>
        </div>
      )}
      {reportDone && (
        <p className="mt-2 rounded-lg bg-[#dcfce7] px-3 py-2 text-sm font-semibold text-[#14532d]">
          Report sent. Thanks for keeping the table family-friendly.
        </p>
      )}

      {notice && (
        <p className="mt-2 rounded-lg bg-[#ffedd5] px-3 py-2 text-sm font-semibold text-[#7c2d12]" role="alert">
          {notice}
        </p>
      )}

      <div className="mt-3">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--dim)]">
          Quick talk {under13 ? "— under-13 players chat with these phrases" : "— tap to send"}
        </p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {QUICK_TALK.map((q) => (
            <button
              key={q}
              type="button"
              className="rounded-full bg-[#14532d] px-3 py-1.5 text-xs font-bold text-white"
              onClick={() => void post(q, true)}
              disabled={posting}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {!under13 && (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.trim()) void post(draft, false);
          }}
        >
          <label className="sr-only" htmlFor="chat-input-room">
            Type a message
          </label>
          <input
            id="chat-input-room"
            className="min-w-0 flex-1 rounded-full border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm text-[var(--text)]"
            placeholder="Say it friendly…"
            value={draft}
            maxLength={300}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button
            type="submit"
            className="shrink-0 rounded-full bg-[#ff6b4a] px-5 py-2.5 text-sm font-bold text-white"
            disabled={posting || !draft.trim()}
          >
            Send
          </button>
        </form>
      )}
      <p className="mt-2 text-xs text-[var(--dim)]">
        Every message is checked before it posts — a word filter keeps
        cussing, insults, and disrespect off the table. Report or block any
        player who still gets through.
      </p>
    </div>
  );
}
