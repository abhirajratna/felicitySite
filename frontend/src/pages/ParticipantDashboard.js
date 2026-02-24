import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, Navigate } from 'react-router-dom';
import API from '../api';
import Navbar from '../components/Navbar';

export default function ParticipantDashboard() {
  const { user } = useAuth();
  const [upcoming, setUpcoming] = useState([]);

  // Redirect to onboarding if not done
  if (user && user.role === 'participant' && user.onboardingDone === false) {
    return <Navigate to="/onboarding" replace />;
  }

  useEffect(() => {
    API.get('/events/my/registrations')
      .then(res => {
        const now = new Date();
        const up = res.data.events.filter(e =>
          e.myRegistrations?.some(r => r.status === 'confirmed') &&
          (e.startDate ? new Date(e.startDate) >= now : true)
        );
        setUpcoming(up.slice(0, 5));
      })
      .catch(() => {});
  }, []);

  return (
    <>
      <Navbar />
      <div style={{ maxWidth: 600, margin: '20px auto', padding: 20 }}>
        <h2>Dashboard</h2>
        <p>Welcome, <strong>{user?.firstName} {user?.lastName}</strong> ({user?.email})</p>
        <p>Type: {user?.participantType === 'iiit' ? 'IIIT Student' : 'Non-IIIT Participant'}</p>
        {user?.collegeName && <p>College / Org: {user.collegeName}</p>}

        {user?.interests?.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <strong>Interests:</strong>{' '}
            {user.interests.map(i => (
              <span key={i} style={{ background: '#e0e0e0', padding: '2px 8px', borderRadius: 4, fontSize: 12, marginRight: 4 }}>{i}</span>
            ))}
          </div>
        )}

        <div style={{ marginTop: 24, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
          <h3>Upcoming Registered Events</h3>
          {upcoming.length === 0 ? (
            <p style={{ color: '#888' }}>No upcoming events. <Link to="/browse">Browse events</Link></p>
          ) : (
            <ul style={{ paddingLeft: 20 }}>
              {upcoming.map(e => (
                <li key={e._id} style={{ marginBottom: 6 }}>
                  <Link to={`/events/${e._id}`}>{e.title}</Link>
                  <span style={{ fontSize: 12, color: '#888', marginLeft: 8 }}>
                    {e.startDate ? new Date(e.startDate).toLocaleDateString() : 'TBA'} | {e.organizer?.organizerName || '-'}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link to="/my-events" style={{ fontSize: 13 }}>View all my events &rarr;</Link>
        </div>
      </div>
    </>
  );
}
