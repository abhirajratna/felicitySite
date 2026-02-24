import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Onboarding from './pages/Onboarding';
import ParticipantDashboard from './pages/ParticipantDashboard';
import MyEventsDashboard from './pages/MyEventsDashboard';
import BrowseEvents from './pages/BrowseEvents';
import EventDetails from './pages/EventDetails';
import TicketView from './pages/TicketView';
import ClubsListing from './pages/ClubsListing';
import OrganizerDetail from './pages/OrganizerDetail';
import Profile from './pages/Profile';
import OrganizerDashboard from './pages/OrganizerDashboard';
import OrganizerEventDetail from './pages/OrganizerEventDetail';
import CreateEvent from './pages/CreateEvent';
import OrganizerProfile from './pages/OrganizerProfile';
import OrganizerOngoingEvents from './pages/OrganizerOngoingEvents';
import AdminDashboard from './pages/AdminDashboard';
import AdminManageOrganizers from './pages/AdminManageOrganizers';
import AdminPasswordRequests from './pages/AdminPasswordRequests';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : user.role === 'organizer' ? '/organizer' : '/dashboard'} /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to={user.onboardingDone === false ? '/onboarding' : '/dashboard'} /> : <Register />} />

      {/* Participant routes */}
      <Route path="/onboarding" element={<ProtectedRoute roles={['participant']}><Onboarding /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute roles={['participant']}><ParticipantDashboard /></ProtectedRoute>} />
      <Route path="/my-events" element={<ProtectedRoute roles={['participant']}><MyEventsDashboard /></ProtectedRoute>} />
      <Route path="/browse" element={<ProtectedRoute roles={['participant']}><BrowseEvents /></ProtectedRoute>} />
      <Route path="/events/:id" element={<ProtectedRoute roles={['participant', 'organizer', 'admin']}><EventDetails /></ProtectedRoute>} />
      <Route path="/ticket/:ticketId" element={<ProtectedRoute roles={['participant', 'organizer', 'admin']}><TicketView /></ProtectedRoute>} />
      <Route path="/clubs" element={<ProtectedRoute roles={['participant']}><ClubsListing /></ProtectedRoute>} />
      <Route path="/clubs/:organizerId" element={<ProtectedRoute roles={['participant']}><OrganizerDetail /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute roles={['participant']}><Profile /></ProtectedRoute>} />

      {/* Organizer routes */}
      <Route path="/organizer" element={<ProtectedRoute roles={['organizer']}><OrganizerDashboard /></ProtectedRoute>} />
      <Route path="/organizer/create-event" element={<ProtectedRoute roles={['organizer']}><CreateEvent /></ProtectedRoute>} />
      <Route path="/organizer/event/:id" element={<ProtectedRoute roles={['organizer']}><OrganizerEventDetail /></ProtectedRoute>} />
      <Route path="/organizer/profile" element={<ProtectedRoute roles={['organizer']}><OrganizerProfile /></ProtectedRoute>} />
      <Route path="/organizer/ongoing" element={<ProtectedRoute roles={['organizer']}><OrganizerOngoingEvents /></ProtectedRoute>} />

      {/* Admin routes */}
      <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/manage" element={<ProtectedRoute roles={['admin']}><AdminManageOrganizers /></ProtectedRoute>} />
      <Route path="/admin/password-requests" element={<ProtectedRoute roles={['admin']}><AdminPasswordRequests /></ProtectedRoute>} />

      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
