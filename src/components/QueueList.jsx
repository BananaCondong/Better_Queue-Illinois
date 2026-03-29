import { useState, useEffect } from 'react';
import { isTablePresent, isApprovedAwayActive } from '../hooks/useOfficeHourQueue';
import HelpDuration from './HelpDuration';
import AwayCountdown from './AwayCountdown';
import ApprovedAwayTimer from './ApprovedAwayTimer';

function canSubmitAwayRequest(student) {
  if (student.beingHelped) return false;
  const r = student.awayTimeRequest;
  if (!r) return true;
  if (r.status === 'pending') return false;
  if (r.status === 'approved' && isApprovedAwayActive(student)) return false;
  return true;
}

export default function QueueList({
  queue,
  sensorStatus,
  filter,
  setFilter,
  getWaitTime,
  awayTimeoutMinutes,
  isTA,
  myQueueEntryId = '',
  handleStartAnswering,
  handleStopAnswering,
  handleFinishAnswering,
  handleDelete,
  handleReview,
  handleResolveReview,
  handleAwayTimeRequest,
  handleAwayTimeApprove,
  handleAwayTimeDeny,
  handleImBack,
  handleUpdateMyTopic,
}) {
  const [reviewStudentId, setReviewStudentId] = useState(null);
  const [reviewDraft, setReviewDraft] = useState('');
  const [editingTopicForId, setEditingTopicForId] = useState(null);
  const [topicDraft, setTopicDraft] = useState('');
  const [awayModalStudentId, setAwayModalStudentId] = useState(null);
  const [awayDurationDraft, setAwayDurationDraft] = useState('15');
  const [awayReasonDraft, setAwayReasonDraft] = useState('');

  const reviewStudent = reviewStudentId
    ? queue.find((s) => s.id === reviewStudentId)
    : null;

  const awayModalStudent = awayModalStudentId
    ? queue.find((s) => s.id === awayModalStudentId)
    : null;

  useEffect(() => {
    if (!reviewStudentId && !awayModalStudentId && !editingTopicForId) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setReviewStudentId(null);
        setReviewDraft('');
        setAwayModalStudentId(null);
        setAwayReasonDraft('');
        setEditingTopicForId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [reviewStudentId, awayModalStudentId, editingTopicForId]);

  const openReviewModal = (student) => {
    setReviewStudentId(student.id);
    setReviewDraft(student.status || '');
  };

  const closeReviewModal = () => {
    setReviewStudentId(null);
    setReviewDraft('');
  };

  const submitReview = () => {
    if (!reviewStudentId) return;
    const text = reviewDraft.trim();
    if (!text) return;
    handleReview(reviewStudentId, text);
    closeReviewModal();
  };

  const closeAwayModal = () => {
    setAwayModalStudentId(null);
    setAwayReasonDraft('');
    setAwayDurationDraft('15');
  };

  const submitAwayRequest = () => {
    if (!awayModalStudentId || !handleAwayTimeRequest) return;
    handleAwayTimeRequest(awayModalStudentId, awayDurationDraft, awayReasonDraft);
    closeAwayModal();
  };

  return (
    <div className="queue-list-container">
      <div className="queue-header">
        <h3>Current Queue</h3>
        <div className="filter-toggle">
          <button
            type="button"
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            type="button"
            className={`filter-btn ${filter === 'present' ? 'active' : ''}`}
            onClick={() => setFilter('present')}
          >
            At Table
          </button>
        </div>
      </div>

      {queue.length === 0 && <p className="empty-msg">No students waiting. ☕</p>}

      <div className="queue-list">
        {queue
          .filter((student) => {
            if (filter !== 'present') return true;
            if (isApprovedAwayActive(student)) return true;
            return isTablePresent(sensorStatus[student.tableNum]);
          })
          .map((student) => {
            const raw = sensorStatus[student.tableNum];
            const present = isTablePresent(raw);
            const approvedAway = isApprovedAwayActive(student);
            const snapshotUrl = raw && typeof raw === 'object' ? raw.imageUrl : null;
            const awayReq = student.awayTimeRequest;
            const approvedUntilMs =
              awayReq?.approvedUntil == null
                ? NaN
                : typeof awayReq.approvedUntil === 'number'
                  ? awayReq.approvedUntil
                  : Number(awayReq.approvedUntil);
            const railMod = approvedAway
              ? 'presence-rail--approved-away'
              : present
                ? 'presence-rail--present'
                : 'presence-rail--away';
            const railLabel = approvedAway
              ? 'Approved away (temporary)'
              : present
                ? 'At table'
                : 'Away from table';
            return (
              <div
                key={student.id}
                className={`student-queue-card ${student.beingHelped ? 'is-helping' : ''}`}
              >
                <div className="queue-entry-layout">
                  <div
                    className={`presence-rail ${railMod}`}
                    role="img"
                    aria-label={railLabel}
                  />
                  <div className="queue-entry-content">
                {isTA && awayReq?.status === 'pending' && (
                  <div className="away-request-ta-banner">
                    <div className="away-request-ta-banner__head">
                      <span className="away-request-ta-banner__title">Away time request</span>
                      <span className="away-request-ta-banner__meta">
                        {awayReq.durationMinutes} min · requested{' '}
                        {getWaitTime(awayReq.requestedAt)}
                      </span>
                    </div>
                    <p className="away-request-ta-banner__reason">{awayReq.reason}</p>
                    <div className="away-request-ta-banner__actions">
                      <button
                        type="button"
                        className="btn-away-approve"
                        onClick={() => handleAwayTimeApprove?.(student.id)}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="btn-away-deny"
                        onClick={() => handleAwayTimeDeny?.(student.id)}
                      >
                        Deny
                      </button>
                    </div>
                  </div>
                )}
                {student.beingHelped && (
                  <div className="helping-banner">
                    <span className="helping-banner-text">
                      Being answered by {student.helperName}
                      {student.helpStartedAt != null && (
                        <>
                          <span className="helping-banner-sep" aria-hidden="true">
                            ·
                          </span>
                          <HelpDuration key={student.helpStartedAt} />
                        </>
                      )}
                    </span>
                  </div>
                )}
                <div className={`card-main-content ${!isTA ? 'card-main-content--student' : ''}`}>
                  <div className="student-info">
                    <strong>{student.name}</strong>
                    <div className="student-card-details">
                      <span>Table {student.tableNum}</span>
                      <span className="dot-divider">•</span>
                      <span>{getWaitTime(student.timestamp)}</span>
                    </div>
                    {!isTA &&
                    student.id === myQueueEntryId &&
                    handleUpdateMyTopic ? (
                      editingTopicForId === student.id ? (
                        <div className="topic-edit">
                          <label className="topic-edit__label" htmlFor={`topic-edit-${student.id}`}>
                            Topic
                          </label>
                          <textarea
                            id={`topic-edit-${student.id}`}
                            className="topic-edit__textarea"
                            rows={3}
                            value={topicDraft}
                            onChange={(e) => setTopicDraft(e.target.value)}
                            placeholder="Briefly describe your question"
                          />
                          <div className="topic-edit__actions">
                            <button
                              type="button"
                              className="topic-edit__btn topic-edit__btn--save"
                              onClick={() => {
                                handleUpdateMyTopic(student.id, topicDraft);
                                setEditingTopicForId(null);
                              }}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              className="topic-edit__btn topic-edit__btn--cancel"
                              onClick={() => setEditingTopicForId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="topic-with-edit">
                          <p className="student-topic">
                            {student.topic || 'No topic provided'}
                          </p>
                          <button
                            type="button"
                            className="btn-edit-topic"
                            onClick={() => {
                              setEditingTopicForId(student.id);
                              setTopicDraft(
                                typeof student.topic === 'string' ? student.topic : ''
                              );
                            }}
                          >
                            Edit topic
                          </button>
                        </div>
                      )
                    ) : (
                      <p className="student-topic">{student.topic || 'No topic provided'}</p>
                    )}
                    {student.id === myQueueEntryId && awayReq?.status === 'pending' && (
                      <p className="away-request-student-pending">
                        Away request pending TA approval ({awayReq.durationMinutes} min).
                      </p>
                    )}
                    {student.id === myQueueEntryId && awayReq?.status === 'denied' && (
                      <p className="away-request-student-denied">
                        Your away request was denied. You can submit a new one if needed.
                      </p>
                    )}
                    {approvedAway && Number.isFinite(approvedUntilMs) && (
                      <ApprovedAwayTimer approvedUntil={approvedUntilMs} />
                    )}
                    {!isTA &&
                      approvedAway &&
                      student.id === myQueueEntryId &&
                      handleImBack && (
                        <button
                          type="button"
                          className="btn-im-back"
                          onClick={() => handleImBack(student.id)}
                        >
                          I&apos;m back
                        </button>
                      )}
                    {!present && !student.beingHelped && !approvedAway && (
                      <AwayCountdown
                        awaySince={student.awaySince}
                        awayTimeoutMinutes={awayTimeoutMinutes}
                        active={!present && !student.beingHelped}
                      />
                    )}
                    {!isTA &&
                      student.id === myQueueEntryId &&
                      handleAwayTimeRequest &&
                      canSubmitAwayRequest(student) && (
                        <button
                          type="button"
                          className="btn-request-away"
                          onClick={() => {
                            setAwayModalStudentId(student.id);
                            setAwayDurationDraft('15');
                            setAwayReasonDraft('');
                          }}
                        >
                          Request temporary away time
                        </button>
                      )}
                    {snapshotUrl && (
                      <p className="camera-snapshot">
                        <a href={snapshotUrl} target="_blank" rel="noopener noreferrer">
                          Latest table snapshot
                        </a>
                      </p>
                    )}

                    {student.status && (
                      <div className="policy-container">
                        <div className="policy-alert">
                          <span className="policy-alert-label">TA review</span>
                          <span className="policy-alert-text">{student.status}</span>
                        </div>
                        {isTA && (
                          <button
                            type="button"
                            className="btn-resolve"
                            onClick={() => handleResolveReview(student.id)}
                          >
                            Fixed!
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {isTA && (
                    <div className="ta-actions">
                      {!student.beingHelped ? (
                        <>
                          <button
                            type="button"
                            className="btn-action btn-review"
                            onClick={() => openReviewModal(student)}
                          >
                            Review
                          </button>
                          <button
                            type="button"
                            className="btn-action btn-start"
                            onClick={() => handleStartAnswering(student.id)}
                          >
                            Start Answering!
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="btn-action btn-stop"
                            onClick={() => handleStopAnswering(student.id)}
                          >
                            Stop
                          </button>
                          <button
                            type="button"
                            className="btn-action btn-finish"
                            onClick={() => handleFinishAnswering(student.id)}
                          >
                            Finish
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        className="btn-action btn-delete"
                        onClick={() => handleDelete(student.id)}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {isTA && reviewStudent && (
        <div
          className="review-modal-backdrop"
          role="presentation"
          onClick={closeReviewModal}
        >
          <div
            className="review-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 id="review-modal-title" className="review-modal-title">
              Review — {reviewStudent.name}
            </h4>
            <p className="review-modal-hint">
              Explain what they should read or fix. They will see this on their queue entry.
            </p>
            <textarea
              className="review-modal-textarea"
              rows={5}
              value={reviewDraft}
              onChange={(e) => setReviewDraft(e.target.value)}
              placeholder="e.g. Please re-read the collaboration policy on the course website before your next assignment."
              autoFocus
            />
            <div className="review-modal-actions">
              <button
                type="button"
                className="btn-review-modal btn-review-modal-cancel"
                onClick={closeReviewModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-review-modal btn-review-modal-send"
                onClick={submitReview}
                disabled={!reviewDraft.trim()}
              >
                Send to student
              </button>
            </div>
          </div>
        </div>
      )}

      {!isTA && awayModalStudent && handleAwayTimeRequest && (
        <div
          className="review-modal-backdrop"
          role="presentation"
          onClick={closeAwayModal}
        >
          <div
            className="review-modal away-request-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="away-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 id="away-modal-title" className="review-modal-title">
              Request away time
            </h4>
            <p className="review-modal-hint">
              Ask the TA for permission to step away temporarily. You will not be removed from the
              queue while approved.
            </p>
            <div className="form-group away-request-modal-field">
              <label htmlFor="away-duration">Duration (minutes)</label>
              <input
                id="away-duration"
                type="number"
                min={1}
                max={120}
                step={1}
                value={awayDurationDraft}
                onChange={(e) => setAwayDurationDraft(e.target.value)}
              />
            </div>
            <div className="form-group away-request-modal-field">
              <label htmlFor="away-reason">Reason</label>
              <textarea
                id="away-reason"
                className="review-modal-textarea"
                rows={4}
                value={awayReasonDraft}
                onChange={(e) => setAwayReasonDraft(e.target.value)}
                placeholder="e.g. Quick bathroom break, grabbing charger from locker…"
                autoFocus
              />
            </div>
            <div className="review-modal-actions">
              <button
                type="button"
                className="btn-review-modal btn-review-modal-cancel"
                onClick={closeAwayModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-review-modal btn-review-modal-send"
                onClick={submitAwayRequest}
                disabled={
                  !awayReasonDraft.trim() ||
                  Number.isNaN(Number(awayDurationDraft)) ||
                  Number(awayDurationDraft) < 1 ||
                  Number(awayDurationDraft) > 120
                }
              >
                Send request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
