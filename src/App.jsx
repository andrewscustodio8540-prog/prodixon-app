import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppLayout from './layouts/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Machines from './pages/Machines';
import Operators from './pages/Operators';
import ShiftEntry from './pages/ShiftEntry';
import Reports from './pages/Reports';
import Parts from './pages/Parts';
import Settings from './pages/Settings';
import Team from './pages/Team';
import Pricing from './pages/Pricing';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/pricing" element={<Pricing />} />

          <Route path="/" element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="machines" element={<Machines />} />
            <Route path="operators" element={<Operators />} />
            <Route path="parts" element={<Parts />} />
            <Route path="shift-entry" element={<ShiftEntry />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
            <Route path="team" element={<Team />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
