import { Routes, Route, Navigate } from 'react-router-dom';
import StudentPage from './pages/StudentPage';
import TAPage from './pages/TAPage';
import TableMapPage from './pages/TableMapPage';
import './App.css';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<StudentPage />} />
      <Route path="/ta" element={<TAPage />} />
      <Route path="/map" element={<TableMapPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
