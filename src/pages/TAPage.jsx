import { useEffect } from 'react';
import { useOfficeHourQueue } from '../hooks/useOfficeHourQueue';
import HeaderNav from '../components/HeaderNav';
import QueueList from '../components/QueueList';

export default function TAPage() {
  const q = useOfficeHourQueue();

  useEffect(() => {
    q.replayTaPresence();
  }, [q.replayTaPresence]);

  return (
    <div className="app-wrapper">
      <HeaderNav title="TA dashboard" />

      <div className="container container--ta">
        <div className="ta-checkin-panel">
          <h3 className="ta-checkin-panel__title">TA check-in</h3>
          <p className="ta-checkin-panel__hint">
            Your name appears on the student queue under &quot;TAs available now&quot; and in the
            &quot;Being answered by&quot; banner when you start helping someone.
          </p>
          <div className="ta-checkin-panel__row">
            <label className="ta-checkin-panel__label" htmlFor="ta-checkin-name">
              Your name
            </label>
            <input
              id="ta-checkin-name"
              className="ta-checkin-panel__input"
              type="text"
              value={q.taCheckInDraft}
              onChange={(e) => q.setTaCheckInDraft(e.target.value)}
              placeholder="e.g. Alex, Ming, CA Sarah"
              autoComplete="name"
            />
            <button type="button" className="ta-checkin-panel__btn" onClick={() => q.commitTaCheckIn()}>
              Check in
            </button>
          </div>
          <p
            className={`ta-checkin-panel__status ${!q.taCheckInName.trim() ? 'ta-checkin-panel__status--empty' : ''}`}
            role="status"
          >
            {q.taCheckInName.trim()
              ? `Checked in as: ${q.taCheckInName.trim()}`
              : 'Not checked in — students will see “TA” until you check in.'}
          </p>
        </div>
        <div className="ta-away-settings">
          <label className="ta-away-settings__label" htmlFor="away-timeout-sec">
            Remove away students after
          </label>
          <input
            id="away-timeout-sec"
            className="ta-away-settings__input"
            type="number"
            min={1}
            max={600}
            step={1}
            value={q.awayTimeoutSeconds}
            onChange={(e) => {
              const n = e.target.valueAsNumber;
              if (Number.isNaN(n)) return;
              q.setAwayTimeoutSeconds(n);
            }}
            aria-describedby="away-timeout-hint"
          />
          <span className="ta-away-settings__unit">seconds away</span>
          <p id="away-timeout-hint" className="ta-away-settings__hint">
            If a student is not detected at their table for this long, they are removed from the
            queue (demo: seconds). Applies to everyone in real time.
          </p>
        </div>
        <QueueList
          queue={q.queue}
          sensorStatus={q.sensorStatus}
          filter={q.filter}
          setFilter={q.setFilter}
          getWaitTime={q.getWaitTime}
          awayTimeoutSeconds={q.awayTimeoutSeconds}
          isTA
          handleStartAnswering={q.handleStartAnswering}
          handleStopAnswering={q.handleStopAnswering}
          handleFinishAnswering={q.handleFinishAnswering}
          handleDelete={q.handleDelete}
          handleReview={q.handleReview}
          handleResolveReview={q.handleResolveReview}
          handleAwayTimeApprove={q.handleAwayTimeApprove}
          handleAwayTimeDeny={q.handleAwayTimeDeny}
        />
      </div>
    </div>
  );
}
