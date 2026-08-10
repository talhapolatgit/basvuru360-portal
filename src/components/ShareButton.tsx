import { useEffect, useState } from "react";
import "./ShareButton.css";

type Props = {
  title: string;
  text?: string;
  url?: string;
};

function isAbortError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "name" in err &&
    (err as { name?: string }).name === "AbortError"
  );
}

function canUseWebShare(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    // iOS Safari only allows Web Share in a secure context (HTTPS / localhost).
    (window.isSecureContext ||
      ["localhost", "127.0.0.1"].includes(window.location.hostname))
  );
}

async function copyText(value: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Fall through to legacy copy.
    }
  }

  try {
    const input = document.createElement("textarea");
    input.value = value;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.top = "0";
    input.style.left = "0";
    input.style.width = "1px";
    input.style.height = "1px";
    input.style.padding = "0";
    input.style.border = "none";
    input.style.outline = "none";
    input.style.boxShadow = "none";
    input.style.background = "transparent";
    input.style.opacity = "0";
    document.body.appendChild(input);

    const selection = document.getSelection();
    const previousRange =
      selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

    input.focus();
    input.select();
    input.setSelectionRange(0, input.value.length);

    const ok = document.execCommand("copy");
    document.body.removeChild(input);

    if (previousRange && selection) {
      selection.removeAllRanges();
      selection.addRange(previousRange);
    }

    return ok;
  } catch {
    return false;
  }
}

export function ShareButton({ title, text, url }: Props) {
  const [feedback, setFeedback] = useState<"idle" | "copied" | "error">(
    "idle",
  );

  useEffect(() => {
    if (feedback === "idle") return;
    const timer = window.setTimeout(() => setFeedback("idle"), 2200);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  function onShare() {
    const shareUrl = url ?? window.location.href;
    const summary = text?.trim() || title;

    if (canUseWebShare()) {
      // iOS: call share() synchronously inside the click handler (single attempt).
      // Retrying after a failed await loses the user-gesture and blocks the sheet.
      const payload: ShareData = { title, url: shareUrl };
      const sharePromise =
        typeof navigator.canShare === "function" && !navigator.canShare(payload)
          ? navigator.share({ text: `${summary}\n${shareUrl}` })
          : navigator.share(payload);

      void sharePromise.catch(async (err: unknown) => {
        if (isAbortError(err)) return;
        const copied = await copyText(shareUrl);
        setFeedback(copied ? "copied" : "error");
      });
      return;
    }

    void (async () => {
      const copied = await copyText(shareUrl);
      setFeedback(copied ? "copied" : "error");
    })();
  }

  const label =
    feedback === "copied"
      ? "Bağlantı kopyalandı"
      : feedback === "error"
        ? "Kopyalanamadı"
        : "Paylaş";

  return (
    <button
      type="button"
      className={`btn btn--ghost share-btn${feedback !== "idle" ? " is-feedback" : ""}`}
      onClick={onShare}
      aria-live="polite"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="m8.59 13.51 6.83 3.98" />
        <path d="m15.41 6.51-6.82 3.98" />
      </svg>
      <span>{label}</span>
    </button>
  );
}
