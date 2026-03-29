import { useState, useEffect } from 'react';

export default function ApprovedAwayTimer({ approvedUntil }) {
  const [remainingSec, setRemainingSec] = useState(0);

  useEffect(() => {
    if (!Number.isFinite(approvedUntil)) return;
    const tick = () => {
      setRemainingSec(Math.max(0, Math.ceil((approvedUntil - Date.now()) / 1000)));
    };
    const t0 = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(t0);
      clearInterval(id);
    };
  }, [approvedUntil]);

  return (
    <p className="away-approved-banner" role="status" aria-live="polite">
      <span className="away-approved-banner__label">TA-approved away</span>
      <span className="away-approved-banner__sep" aria-hidden="true">
        ·
      </span>
      <span className="away-approved-banner__timer">{remainingSec}s remaining</span>
    </p>
  );
}
