import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import "../pages/Detail.css";

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M15 6 9 12l6 6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type BackProps = {
  to: string;
  label: string;
  gutterRef: RefObject<HTMLDivElement | null>;
};

function FixedBackButton({ to, label, gutterRef }: BackProps) {
  const [left, setLeft] = useState<number | null>(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const gutter = gutterRef.current;
    if (!gutter) return;

    const update = () => {
      const isCompact = window.matchMedia("(max-width: 899px)").matches;
      setCompact(isCompact);

      if (isCompact) {
        setLeft(16);
        return;
      }

      const rect = gutter.getBoundingClientRect();
      if (rect.width < 28) {
        setLeft(null);
        return;
      }
      setLeft(rect.left + rect.width / 2);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(gutter);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [gutterRef]);

  if (left == null) return null;

  return createPortal(
    <Link
      to={to}
      className={`detail-back${compact ? " is-compact" : ""}`}
      aria-label={label}
      title={label}
      style={
        compact
          ? undefined
          : { left: `${left}px` }
      }
    >
      <BackIcon />
    </Link>,
    document.body,
  );
}

type LayoutProps = {
  backTo: string;
  backLabel: string;
  children: ReactNode;
};

export function DetailLayout({ backTo, backLabel, children }: LayoutProps) {
  const gutterRef = useRef<HTMLDivElement>(null);

  return (
    <div className="detail-layout">
      <div ref={gutterRef} className="detail-gutter" aria-hidden="true" />
      <FixedBackButton to={backTo} label={backLabel} gutterRef={gutterRef} />
      <div className="detail-layout__main page-enter">{children}</div>
    </div>
  );
}
