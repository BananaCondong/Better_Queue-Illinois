import { useState, useEffect } from 'react';

function pad2(n) {
  return String(n).padStart(2, '0');
}

export default function ApprovedAwayTimer({ approvedUntil }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [approvedUntil]);

  const left = Math.max(0, approvedUntil - Date.now());
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
