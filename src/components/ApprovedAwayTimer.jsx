import { useState, useEffect } from 'react';

function pad2(n) {
  return String(n).padStart(2, '0');
}

export default function ApprovedAwayTimer({ approvedUntil }) {
  const [leftMs, setLeftMs] = useState(0);

  useEffect(() => {
    if (!Number.isFinite(approvedUntil)) return;
    const tick = () => {
      setLeftMs(Math.max(0, approvedUntil - Date.now()));
    };
    const t0 = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(t0);
      clearInterval(id);
    };
  }, [approvedUntil]);

  const left = leftMs;
  const m = Math.floor(left / 60000);
  const s = Math.floor((left % 60000) / 1000);

  return (
    <p className="away-approved-banner" role="status" aria-live="polite">
      <span className="away-approved-banner__label">TA-approved away</span>
      <span className="away-approved-banner__sep" aria-hidden="true">
        ·
      </span>
      <span className="away-approved-banner__timer">
        {m}:{pad2(s)} remaining
      </span>
    </p>
  );
}
