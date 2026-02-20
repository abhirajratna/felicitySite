import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import API from '../api';

export default function OrganizerDashboard() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [carouselIdx, setCarouselIdx] = useState(0);

  useEffect(() => {
    API.get('/events/organizer/mine').then(r => setEvents(r.data.events)).catch(() => {});
    API.get('/events/analytics/mine').then(r => setAnalytics(r.data)).catch(() => {});
  }, []);

  const statusColor = (s) => {
    const map = { draft: '#888', published: '#2196F3', ongoing: '#FF9800', completed: '#4CAF50', closed: '#999', cancelled: '#f44336' };
    return map[s] || '#333';
  };

  const prev = () => setCarouselIdx(i => Math.max(0, i - 1));
  const next = () => setCarouselIdx(i => Math.min(events.length - 1, i + 1));

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 900, margin: '20px auto', padding: 20 }}>
        <h2>Organizer Dashboard</h2>
        <p>Welcome, <strong>{user?.organizerName || user?.name}</strong> — {user?.category || 'N/A'}</p>

        {/* Events Carousel */}
        <div style={{ marginTop: 20, padding: 20, background: '#f9f9f9', borderRadius: 8 }}>
          <h3>Your Events ({events.length})</h3>
          {events.length === 0 ? (
            <p style={{ color: '#888' }}>No events created yet. <Link to="/organizer/create-event">Create one</Link></p>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={prev} disabled={carouselIdx === 0} style={{ padding: '8px 12px', cursor: 'pointer' }}>&lt;</button>
                <div style={{ flex: 1, display: 'flex', gap: 12, overflow: 'hidden' }}>
                  {events.slice(carouselIdx, carouselIdx + 3).map(ev => (
                    <div key={ev._id} style={{ flex: '1 1 200px', border: '1px solid #ddd', borderRadius: 8, padding: 12, background: '#fff', minWidth: 180 }}>
                      <h4 style={{ margin: '0 0 6px' }}>{ev.title}</h4>
                      <p style={{ margin: '2px 0', fontSize: 13 }}>Type: {ev.eventType}</p>
                      <p style={{ margin: '2px 0', fontSize: 13 }}>
                        Status: <span style={{ color: statusColor(ev.status), fontWeight: 600 }}>{ev.status}</span>
                      </p>
                      <p style={{ margin: '2px 0', fontSize: 13 }}>Registrations: {ev.registrations?.filter(r => r.status === 'confirmed').length || 0}</p>
                      <Link to={`/organizer/event/${ev._id}`} style={{ fontSize: 13 }}>View / Manage →</Link>
                    </div>
                  ))}
                </div>
                <button onClick={next} disabled={carouselIdx >= events.length - 3} style={{ padding: '8px 12px', cursor: 'pointer' }}>&gt;</button>
              </div>
            </div>
          )}
        </div>

        {/* Analytics */}
        <div style={{ marginTop: 20, padding: 20, background: '#f5f5f5', borderRadius: 8 }}>
          <h3>Event Analytics (Completed Events)</h3>
          {analytics ? (
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <div style={{ padding: 16, background: '#fff', border: '1px solid #ddd', borderRadius: 8, minWidth: 140, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{analytics.totalEvents}</div>
                <div style={{ fontSize: 13, color: '#666' }}>Completed Events</div>
              </div>
              <div style={{ padding: 16, background: '#fff', border: '1px solid #ddd', borderRadius: 8, minWidth: 140, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{analytics.totalRegistrations}</div>
                <div style={{ fontSize: 13, color: '#666' }}>Total Registrations</div>
              </div>
              <div style={{ padding: 16, background: '#fff', border: '1px solid #ddd', borderRadius: 8, minWidth: 140, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700 }}>₹{analytics.totalRevenue}</div>
                <div style={{ fontSize: 13, color: '#666' }}>Total Revenue</div>
              </div>
              <div style={{ padding: 16, background: '#fff', border: '1px solid #ddd', borderRadius: 8, minWidth: 140, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{analytics.totalMerchSales}</div>
                <div style={{ fontSize: 13, color: '#666' }}>Merch Sales</div>
              </div>
            </div>
          ) : (
            <p style={{ color: '#888' }}>Loading analytics...</p>
          )}
        </div>
      </div>
    </div>
  );
}
