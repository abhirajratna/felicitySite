import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import API from '../api';
import Navbar from '../components/Navbar';

export default function MyEventsDashboard() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [tab, setTab] = useState('upcoming');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/events/my/registrations')
      .then(res => { setEvents(res.data.events); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const now = new Date();

  const upcoming = events.filter(e =>
    e.myRegistrations.some(r => r.status === 'confirmed') &&
    (e.endDate ? new Date(e.endDate) >= now : (e.startDate ? new Date(e.startDate) >= now : true))
  );

  const normalHistory = events.filter(e => e.eventType === 'normal');
  const merchHistory = events.filter(e => e.eventType === 'merchandise');
  const completedHistory = events.filter(e =>
    e.status === 'completed' || (e.endDate && new Date(e.endDate) < now)
  );
  const cancelledHistory = events.filter(e =>
    e.myRegistrations.some(r => r.status === 'cancelled' || r.status === 'rejected') ||
    e.status === 'cancelled'
  );

  const tabs = [
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'normal', label: 'Normal' },
    { key: 'merchandise', label: 'Merchandise' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled/Rejected' },
  ];

  const getList = () => {
    switch (tab) {
      case 'upcoming': return upcoming;
      case 'normal': return normalHistory;
      case 'merchandise': return merchHistory;
      case 'completed': return completedHistory;
      case 'cancelled': return cancelledHistory;
      default: return upcoming;
    }
  };

  const currentList = getList();

  if (loading) return <><Navbar /><div style={{ padding: 40, textAlign: 'center' }}>Loading...</div></>;

  return (
    <>
      <Navbar />
      <div style={{ maxWidth: 700, margin: '20px auto', padding: 20 }}>
        <h2>My Events</h2>
        <p>Welcome, <strong>{user?.firstName} {user?.lastName}</strong></p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '6px 14px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: 4,
                background: tab === t.key ? '#333' : '#fff', color: tab === t.key ? '#fff' : '#333',
              }}
            >{t.label}</button>
          ))}
        </div>

        {currentList.length === 0 ? (
          <p style={{ color: '#888' }}>No events in this category.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
                <th style={{ padding: 6 }}>Event</th>
                <th style={{ padding: 6 }}>Type</th>
                <th style={{ padding: 6 }}>Organizer</th>
                <th style={{ padding: 6 }}>Status</th>
                <th style={{ padding: 6 }}>Ticket</th>
              </tr>
            </thead>
            <tbody>
              {currentList.map(e => {
                const reg = e.myRegistrations?.[0];
                return (
                  <tr key={e._id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: 6 }}>
                      <Link to={`/events/${e._id}`}>{e.title}</Link>
                    </td>
                    <td style={{ padding: 6 }}>{e.eventType}</td>
                    <td style={{ padding: 6 }}>{e.organizer?.organizerName || '-'}</td>
                    <td style={{ padding: 6 }}>{reg?.status || e.status}</td>
                    <td style={{ padding: 6 }}>
                      {reg?.ticketId ? (
                        <Link to={`/ticket/${reg.ticketId}`} style={{ fontSize: 12 }}>
                          {reg.ticketId.slice(0, 8)}...
                        </Link>
                      ) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
