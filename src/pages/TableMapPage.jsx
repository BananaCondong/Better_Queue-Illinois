import { useOfficeHourQueue } from '../hooks/useOfficeHourQueue';
import HeaderNav from '../components/HeaderNav';
import LabTableMap from '../components/LabTableMap';

export default function TableMapPage() {
  const q = useOfficeHourQueue();

  return (
    <div className="app-wrapper">
      <HeaderNav title="Lab map" />

      <div className="container container--map">
        <LabTableMap sensorStatus={q.sensorStatus} queue={q.queue} />
      </div>
    </div>
  );
}
