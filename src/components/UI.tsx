import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({ children, className = "", variant = "primary", ...props }: Props) {
  return (
    <button type="button" className={`ui-button ui-button--${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Meter({ label, value, tone = "cyan" }: { label: string; value: number; tone?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const state = pct < 20 ? "danger" : pct < 40 ? "warn" : tone;
  return (
    <div className={`meter meter--${state}`}>
      <span>{label}</span>
      <div className="meter-bar"><i style={{ width: `${pct}%` }} /></div>
      <b>{pct}</b>
    </div>
  );
}
