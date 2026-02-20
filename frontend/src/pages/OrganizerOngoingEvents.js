import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import API from '../api';

export default function OrganizerOngoingEvents() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    API.get('/events/organizer/mine').then(r => {
      setEvents(r.data.events.filter(e => e.status === 'published' || e.status === 'ongoing'));
    }).catch(() => {});
  }, []);

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 800, margin: '20px auto', padding: 20 }}>
        <h2>Ongoing Events</h2>
        {events.length === 0 ? (
          <p style={{ color: '#888' }}>No ongoing or published events.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: 8 }}>Name</th>
                <th style={{ padding: 8 }}>Type</th>
                <th style={{ padding: 8 }}>Status</th>
                <th style={{ padding: 8 }}>Start Date</th>
                <th style={{ padding: 8 }}>Registrations</th>
                <th style={{ padding: 8 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map(ev => (
                <tr key={ev._id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: 8 }}>{ev.title}</td>
                  <td style={{ padding: 8 }}>{ev.eventType}</td>
                  <td style={{ padding: 8 }}>{ev.status}</td>
                  <td style={{ padding: 8 }}>{ev.startDate ? new Date(ev.startDate).toLocaleDateString() : 'TBA'}</td>
                  <td style={{ padding: 8 }}>{ev.registrations?.filter(r => r.status === 'confirmed').length || 0}</td>
                  <td style={{ padding: 8 }}><Link to={`/organizer/event/${ev._id}`}>Manage →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
