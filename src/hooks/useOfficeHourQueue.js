import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../firebase';
import {
  ref,
  push,
  onValue,
  remove,
  update,
  set,
  onDisconnect,
  serverTimestamp,
} from 'firebase/database';

/** Demo: away auto-remove and TA away requests use seconds. */
const DEFAULT_AWAY_TIMEOUT_SECONDS = 30;
const MAX_AWAY_TIMEOUT_SECONDS = 600;
const MAX_AWAY_REQUEST_SECONDS = 300;
const MY_QUEUE_ENTRY_KEY = 'officehourqueue_myEntryId';
const TA_CHECKIN_NAME_KEY = 'officehourqueue_taCheckInName';
const TA_PRESENCE_SESSION_KEY = 'officehourqueue_taPresenceId';

/** Remove queue row and mark table absent (same as TA Finish/Delete). */
function removeQueueEntryAndMarkTableAbsent(id, tableNum) {
  const tableKey = String(tableNum ?? '').trim();
  const pathUpdates = { [`queue/${id}`]: null };
  if (tableKey) {
    pathUpdates[`tables/${tableKey}/presence`] = 'absent';
    pathUpdates[`tables/${tableKey}/updatedAt`] = serverTimestamp();
  }
  update(ref(db), pathUpdates);
}

function readStoredTaCheckInName() {
  try {
    return localStorage.getItem(TA_CHECKIN_NAME_KEY) || '';
  } catch {
    return '';
  }
}

export function isTablePresent(raw) {
  if (raw === 'present') return true;
  if (raw && typeof raw === 'object' && raw.presence === 'present') return true;
  return false;
}

function parseApprovedUntilMs(r) {
  if (!r) return NaN;
  const u = r.approvedUntil;
  if (typeof u === 'number' && Number.isFinite(u)) return u;
  if (typeof u === 'string' && u.trim() !== '') {
    const n = Number(u);
    return Number.isFinite(n) ? n : NaN;
  }
  const n = Number(u);
  return Number.isFinite(n) ? n : NaN;
}

function parseDecidedAtMs(r) {
  if (!r || r.decidedAt == null || r.decidedAt === '') return NaN;
  const d = r.decidedAt;
  if (typeof d === 'number' && Number.isFinite(d)) return d;
  if (typeof d === 'string' && d.trim() !== '') {
    const n = Number(d);
    return Number.isFinite(n) ? n : NaN;
  }
  const n = Number(d);
  return Number.isFinite(n) ? n : NaN;
}

/** Seconds requested for away (new `durationSeconds` or legacy `durationMinutes` × 60). */
export function getAwayRequestDurationSeconds(r) {
  if (!r) return null;
  if (typeof r.durationSeconds === 'number' && Number.isFinite(r.durationSeconds)) {
    return r.durationSeconds;
  }
  if (typeof r.durationMinutes === 'number' && Number.isFinite(r.durationMinutes)) {
    return r.durationMinutes * 60;
  }
  return null;
}

/** Wall-clock end of TA-approved away window (prefers `approvedUntil`, else decidedAt + duration). */
export function getApprovedAwayEndMs(student) {
  const r = student?.awayTimeRequest;
  if (!r || String(r.status) !== 'approved') return NaN;
  const fromUntil = parseApprovedUntilMs(r);
  if (Number.isFinite(fromUntil)) return fromUntil;
  const decided = parseDecidedAtMs(r);
  const secs = getAwayRequestDurationSeconds(r);
  if (Number.isFinite(decided) && secs != null && secs >= 1) {
    return decided + Math.min(MAX_AWAY_REQUEST_SECONDS, Math.floor(secs)) * 1000;
  }
  return NaN;
}

/** TA-approved temporary away: still inside the approved window. */
export function isApprovedAwayActive(student) {
  const end = getApprovedAwayEndMs(student);
  return Number.isFinite(end) && Date.now() < end;
}

function isApprovedAwayExpired(student) {
  const end = getApprovedAwayEndMs(student);
  return Number.isFinite(end) && Date.now() >= end;
}

export function useOfficeHourQueue() {
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [tableNum, setTableNum] = useState('');
  const [myQueueEntryId, setMyQueueEntryId] = useState(
    () => sessionStorage.getItem(MY_QUEUE_ENTRY_KEY) || ''
  );
  const [queue, setQueue] = useState([]);
  const [sensorStatus, setSensorStatus] = useState({});
  const [filter, setFilter] = useState('all');
  const [awayTimeoutSeconds, setAwayTimeoutSecondsState] = useState(DEFAULT_AWAY_TIMEOUT_SECONDS);
  const [taCheckInName, setTaCheckInNameState] = useState(() => readStoredTaCheckInName());
  const [taCheckInDraft, setTaCheckInDraft] = useState(() => readStoredTaCheckInName());
  const [availableTas, setAvailableTas] = useState([]);
  const [, setTick] = useState(0);
  const queueRef = useRef([]);
  queueRef.current = queue;

  const writeTaPresence = useCallback((displayName) => {
    const t = typeof displayName === 'string' ? displayName.trim() : '';
    if (!t) {
      const pid = sessionStorage.getItem(TA_PRESENCE_SESSION_KEY);
      if (pid) {
        remove(ref(db, `tas/${pid}`));
        sessionStorage.removeItem(TA_PRESENCE_SESSION_KEY);
      }
      return;
    }
    let pid = sessionStorage.getItem(TA_PRESENCE_SESSION_KEY);
    if (!pid) {
      const p = push(ref(db, 'tas'));
      pid = p.key;
      sessionStorage.setItem(TA_PRESENCE_SESSION_KEY, pid);
    }
    const r = ref(db, `tas/${pid}`);
    set(r, { name: t, since: serverTimestamp() });
    onDisconnect(r).remove();
  }, []);

  const commitTaCheckIn = useCallback(() => {
    const t = typeof taCheckInDraft === 'string' ? taCheckInDraft.trim() : '';
    setTaCheckInNameState(t);
    setTaCheckInDraft(t);
    try {
      if (t) localStorage.setItem(TA_CHECKIN_NAME_KEY, t);
      else localStorage.removeItem(TA_CHECKIN_NAME_KEY);
    } catch {
      /* ignore quota / private mode */
    }
    writeTaPresence(t);
  }, [taCheckInDraft, writeTaPresence]);

  const replayTaPresence = useCallback(() => {
    writeTaPresence(taCheckInName);
  }, [taCheckInName, writeTaPresence]);

  useEffect(() => {
    const queueRef = ref(db, 'queue');
    const unsubQueue = onValue(queueRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([id, val]) => ({ id, ...val }));
      setQueue(list.sort((a, b) => a.timestamp - b.timestamp));
    });

    const tablesRef = ref(db, 'tables');
    const unsubTables = onValue(tablesRef, (snapshot) => {
      setSensorStatus(snapshot.val() || {});
    });

    const settingsRef = ref(db, 'settings');
    const unsubSettings = onValue(settingsRef, (snapshot) => {
      const v = snapshot.val();
      const s = v?.awayTimeoutSeconds;
      if (typeof s === 'number' && Number.isFinite(s) && s >= 1 && s <= MAX_AWAY_TIMEOUT_SECONDS) {
        setAwayTimeoutSecondsState(s);
        return;
      }
      const legacyMin = v?.awayTimeoutMinutes;
      if (typeof legacyMin === 'number' && Number.isFinite(legacyMin) && legacyMin >= 1 && legacyMin <= 240) {
        setAwayTimeoutSecondsState(
          Math.min(MAX_AWAY_TIMEOUT_SECONDS, Math.max(1, Math.floor(legacyMin * 60)))
        );
        return;
      }
      setAwayTimeoutSecondsState(DEFAULT_AWAY_TIMEOUT_SECONDS);
    });

    const tasRef = ref(db, 'tas');
    const unsubTas = onValue(tasRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setAvailableTas([]);
        return;
      }
      const list = Object.entries(data)
        .map(([id, val]) => ({
          id,
          name: typeof val?.name === 'string' && val.name.trim() ? val.name.trim() : '',
        }))
        .filter((x) => x.name)
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
      setAvailableTas(list);
    });

    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => {
      unsubQueue();
      unsubTables();
      unsubSettings();
      unsubTas();
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!myQueueEntryId) return;
    if (!queue.some((s) => s.id === myQueueEntryId)) {
      sessionStorage.removeItem(MY_QUEUE_ENTRY_KEY);
      setMyQueueEntryId('');
    }
  }, [queue, myQueueEntryId]);

  /**
   * When TA-approved away ends: remove queue row and set tables/{tableNum}/presence to absent
   * (same as TA Finish/Delete). Stable interval + queueRef so presence churn does not reset timer.
   */
  useEffect(() => {
    const tick = () => {
      for (const student of queueRef.current) {
        if (!isApprovedAwayExpired(student)) continue;
        removeQueueEntryAndMarkTableAbsent(student.id, student.tableNum);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  /** Keep queue.awaySince and queue.presence in sync with table sensors (shared across clients). */
  useEffect(() => {
    for (const student of queue) {
      if (isApprovedAwayExpired(student)) continue;
      const raw = sensorStatus[student.tableNum];
      const present = isTablePresent(raw);
      const beingHelped = !!student.beingHelped;

      if (beingHelped) {
        const patch = {};
        if (student.awaySince != null) patch.awaySince = null;
        if (student.presence !== 'present') patch.presence = 'present';
        if (Object.keys(patch).length) update(ref(db, `queue/${student.id}`), patch);
        continue;
      }

      if (isApprovedAwayActive(student)) {
        const patch = {};
        if (student.awaySince != null) patch.awaySince = null;
        if (present) {
          if (student.presence !== 'present') patch.presence = 'present';
        } else if (student.presence !== 'away') {
          patch.presence = 'away';
        }
        if (Object.keys(patch).length) update(ref(db, `queue/${student.id}`), patch);
        continue;
      }

      if (present) {
        const patch = {};
        if (student.awaySince != null) patch.awaySince = null;
        if (student.presence !== 'present') patch.presence = 'present';
        if (Object.keys(patch).length) update(ref(db, `queue/${student.id}`), patch);
      } else {
        const patch = {};
        if (student.awaySince == null) patch.awaySince = Date.now();
        if (student.presence !== 'away') patch.presence = 'away';
        if (Object.keys(patch).length) update(ref(db, `queue/${student.id}`), patch);
      }
    }
  }, [queue, sensorStatus]);

  /** Remove queue entries that have been away longer than the configured timeout. */
  useEffect(() => {
    const timeoutMs = awayTimeoutSeconds * 1000;
    const tick = () => {
      const now = Date.now();
      for (const student of queue) {
        if (student.beingHelped) continue;
        if (isApprovedAwayActive(student)) continue;
        const raw = sensorStatus[student.tableNum];
        if (isTablePresent(raw)) continue;
        const awaySince = student.awaySince;
        if (awaySince == null) continue;
        if (now - awaySince >= timeoutMs) {
          remove(ref(db, `queue/${student.id}`));
        }
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [queue, sensorStatus, awayTimeoutSeconds]);

  const setAwayTimeoutSeconds = useCallback((seconds) => {
    const n = Number(seconds);
    if (!Number.isFinite(n)) return;
    const clamped = Math.min(MAX_AWAY_TIMEOUT_SECONDS, Math.max(1, Math.floor(n)));
    update(ref(db, 'settings'), {
      awayTimeoutSeconds: clamped,
      awayTimeoutMinutes: null,
    });
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !tableNum) return;
    const tableKey = String(tableNum).trim();
    update(ref(db, `tables/${tableKey}`), {
      presence: 'present',
      updatedAt: serverTimestamp(),
    });
    const newRef = push(ref(db, 'queue'), {
      name,
      topic,
      tableNum: tableKey,
      timestamp: Date.now(),
      beingHelped: false,
      presence: 'present',
    });
    if (newRef.key) {
      sessionStorage.setItem(MY_QUEUE_ENTRY_KEY, newRef.key);
      setMyQueueEntryId(newRef.key);
    }
    setName('');
    setTopic('');
    setTableNum('');
  };

  const getWaitTime = (timestamp) => {
    if (!timestamp) return 'Just now';
    const mins = Math.floor((Date.now() - timestamp) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  const handleStartAnswering = (id) => {
    const helperName = taCheckInName.trim() || 'TA';
    update(ref(db, `queue/${id}`), {
      beingHelped: true,
      helperName,
      helpStartedAt: Date.now(),
    });
  };

  const handleStopAnswering = (id) => {
    update(ref(db, `queue/${id}`), {
      beingHelped: false,
      helperName: null,
      helpStartedAt: null,
    });
  };

  const handleFinishAnswering = (id) => {
    const student = queue.find((s) => s.id === id);
    removeQueueEntryAndMarkTableAbsent(id, student?.tableNum);
  };

  const handleDelete = (id) => {
    if (!window.confirm('Remove student?')) return;
    const student = queue.find((s) => s.id === id);
    removeQueueEntryAndMarkTableAbsent(id, student?.tableNum);
  };

  const handleReview = (id, message) => {
    const text = typeof message === 'string' ? message.trim() : '';
    if (!text) return;
    update(ref(db, `queue/${id}`), { status: text });
  };

  const handleResolveReview = (id) => {
    update(ref(db, `queue/${id}`), { status: '' });
  };

  const handleAwayTimeRequest = useCallback((id, durationSeconds, reason) => {
    if (id !== myQueueEntryId) return;
    const secs = Number(durationSeconds);
    const text = typeof reason === 'string' ? reason.trim() : '';
    if (!Number.isFinite(secs) || secs < 1 || secs > MAX_AWAY_REQUEST_SECONDS || !text) return;
    const student = queue.find((s) => s.id === id);
    const existing = student?.awayTimeRequest;
    if (existing?.status === 'pending') return;
    if (existing?.status === 'approved' && isApprovedAwayActive(student)) return;
    update(ref(db, `queue/${id}`), {
      awayTimeRequest: {
        durationSeconds: Math.floor(secs),
        durationMinutes: null,
        reason: text,
        requestedAt: Date.now(),
        status: 'pending',
      },
    });
  }, [myQueueEntryId, queue]);

  const handleAwayTimeApprove = useCallback((id) => {
    const student = queue.find((s) => s.id === id);
    const r = student?.awayTimeRequest;
    if (!r || String(r.status) !== 'pending') return;
    const secs = getAwayRequestDurationSeconds(r);
    if (secs == null || secs < 1) return;
    const approvedMs = Math.min(MAX_AWAY_REQUEST_SECONDS, Math.floor(secs)) * 1000;
    const approvedUntil = Date.now() + approvedMs;
    update(ref(db, `queue/${id}`), {
      awayTimeRequest: {
        durationSeconds: Math.min(MAX_AWAY_REQUEST_SECONDS, Math.floor(secs)),
        durationMinutes: null,
        reason: r.reason,
        requestedAt: r.requestedAt,
        status: 'approved',
        approvedUntil,
        decidedAt: Date.now(),
      },
    });
  }, [queue]);

  const handleAwayTimeDeny = useCallback((id) => {
    const student = queue.find((s) => s.id === id);
    const r = student?.awayTimeRequest;
    if (!r || String(r.status) !== 'pending') return;
    const ds = getAwayRequestDurationSeconds(r);
    update(ref(db, `queue/${id}`), {
      awayTimeRequest: {
        durationSeconds: ds != null ? Math.floor(ds) : null,
        durationMinutes: null,
        reason: r.reason,
        requestedAt: r.requestedAt,
        status: 'denied',
        decidedAt: Date.now(),
      },
    });
  }, [queue]);

  const handleImBack = useCallback(
    (id) => {
      if (id !== myQueueEntryId) return;
      const student = queue.find((s) => s.id === id);
      if (!student || !isApprovedAwayActive(student)) return;
      const tableKey = String(student.tableNum).trim();
      update(ref(db, `tables/${tableKey}`), {
        presence: 'present',
        updatedAt: serverTimestamp(),
      });
      update(ref(db, `queue/${id}`), { awayTimeRequest: null });
    },
    [myQueueEntryId, queue]
  );

  const handleUpdateMyTopic = useCallback(
    (id, topicText) => {
      if (id !== myQueueEntryId) return;
      const text = typeof topicText === 'string' ? topicText.trim() : '';
      update(ref(db, `queue/${id}`), { topic: text });
    },
    [myQueueEntryId]
  );

  return {
    name,
    setName,
    topic,
    setTopic,
    tableNum,
    setTableNum,
    myQueueEntryId,
    queue,
    sensorStatus,
    filter,
    setFilter,
    awayTimeoutSeconds,
    setAwayTimeoutSeconds,
    taCheckInName,
    taCheckInDraft,
    setTaCheckInDraft,
    commitTaCheckIn,
    replayTaPresence,
    availableTas,
    handleSubmit,
    getWaitTime,
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
  };
}
