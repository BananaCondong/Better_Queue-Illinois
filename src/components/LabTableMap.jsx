import { isTablePresent, isApprovedAwayActive } from '../hooks/useOfficeHourQueue';

/**
 * @typedef {'unoccupied' | 'occupied' | 'away' | 'approved-away'} TableVisualState
 */

/**
 * @param {string|number} tableNum
 * @param {Record<string, unknown>} sensorStatus
 * @param {Array<{ tableNum?: string|number }>} queue
 * @returns {TableVisualState}
 */
export function getTableMapStatus(tableNum, sensorStatus, queue) {
  const t = String(tableNum);
  const atTable = queue.filter((s) => String(s.tableNum) === t);
  if (atTable.some((s) => isApprovedAwayActive(s))) return 'approved-away';

  const raw = sensorStatus[t] ?? sensorStatus[tableNum];
  const present = isTablePresent(raw);
  const inQueue = atTable.length > 0;

  if (present) return 'occupied';
  if (inQueue) return 'away';
  return 'unoccupied';
}

const statusLabel = {
  unoccupied: 'Unoccupied',
  occupied: 'Occupied',
  away: 'Away',
  'approved-away': 'Approved away',
};

/** Four rows of five, row-major (matches physical layout front → back). */
const TABLE_ROWS = [
  [1, 2, 3, 4, 5],
  [6, 7, 8, 9, 10],
  [11, 12, 13, 14, 15],
  [16, 17, 18, 19, 20],
];

export default function LabTableMap({ sensorStatus, queue }) {
  return (
    <div className="lab-map">
      <p className="lab-map__intro">
        Floor plan: tables 1–20 in four rows of five. The open area on the left is the aisle; each
        square is a table. Amber means TA-approved temporary away; otherwise colors follow sensors
        and the queue.
      </p>
      <section
        className="lab-map__room"
        aria-label="Lab room floor plan: aisle on the left, twenty tables in four by five grid on the right"
      >
        <div className="lab-map__aisle">
          <span className="lab-map__aisle-label">Aisle</span>
        </div>
        <div
          className="lab-map__tables-area"
          role="group"
          aria-label="Lab tables 1 through 20, four rows of five"
        >
          {TABLE_ROWS.map((row, rowIndex) => (
            <div
              key={row.join('-')}
              className={`lab-map__row lab-map__row--spacer-${rowIndex}`}
            >
              {row.map((num) => {
                const status = getTableMapStatus(num, sensorStatus, queue);
                return (
                  <div
                    key={num}
                    className={`lab-map__cell lab-map__cell--${status}`}
                    role="img"
                    aria-label={`Table ${num}, ${statusLabel[status]}`}
                  >
                    <span className="lab-map__cell-num">{num}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </section>
      <ul className="lab-map__legend">
        <li>
          <span className="lab-map__swatch lab-map__swatch--unoccupied" aria-hidden="true" />
          Unoccupied
        </li>
        <li>
          <span className="lab-map__swatch lab-map__swatch--occupied" aria-hidden="true" />
          Occupied
        </li>
        <li>
          <span className="lab-map__swatch lab-map__swatch--away" aria-hidden="true" />
          Away
        </li>
        <li>
          <span className="lab-map__swatch lab-map__swatch--approved-away" aria-hidden="true" />
          Approved away
        </li>
      </ul>
    </div>
  );
}
