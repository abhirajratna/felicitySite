import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api';
import Navbar from '../components/Navbar';

export default function OrganizerDetail() {
  const { organizerId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [org, setOrg] = useState(null);
  const [events, setEvents] = useState([]);
  const [followed, setFollowed] = useState(
    (user?.followedClubs || []).map(c => (typeof c === 'object' ? c._id : c))
  );

  useEffect(() => {
    // Fetch organizer info from organizers list
    API.get('/user/organizers-list').then(res => {
      const found = res.data.organizers.find(o => o._id === organizerId);
      setOrg(found || null);
    }).catch(() => {});

    // Fetch events by this organizer
    API.get(`/events/organizer/${organizerId}`).then(res => setEvents(res.data.events)).catch(() => {});
  }, [organizerId]);

  const toggleFollow = async () => {
    try {
      const res = await API.put(`/user/follow/${organizerId}`);
      setFollowed(res.data.followedClubs);
    } catch {}
  };

  const now = new Date();
  const upcoming = events.filter(e => e.startDate && new Date(e.startDate) >= now);
  const past = events.filter(e => e.endDate ? new Date(e.endDate) < now : (e.startDate && new Date(e.startDate) < now));

  return (
    <>
      <Navbar />
      <div style={{ maxWidth: 650, margin: '20px auto', padding: 20 }}>
        <button onClick={() => navigate(-1)} style={{ marginBottom: 12, cursor: 'pointer' }}>&larr; Back</button>

        {org ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>{org.organizerName}</h2>
              {user?.role === 'participant' && (
                <button
                  onClick={toggleFollow}
                  style={{
                    padding: '6px 16px', cursor: 'pointer', borderRadius: 4, border: '1px solid #ccc',
                    background: followed.includes(organizerId) ? '#e91e63' : '#fff',
                    color: followed.includes(organizerId) ? '#fff' : '#333',
                  }}
                >
                  {followed.includes(organizerId) ? 'Unfollow' : 'Follow'}
                </button>
              )}
            </div>
            <p><strong>Category:</strong> {org.category || '-'}</p>
            <p><strong>Description:</strong> {org.description || '-'}</p>
            <p><strong>Contact:</strong> {org.contactEmail || '-'}</p>
          </>
        ) : (
          <p>Organizer not found.</p>
        )}

        <hr />
        <h3>Upcoming Events</h3>
        {upcoming.length === 0 ? <p style={{ color: '#888' }}>None.</p> : (
          upcoming.map(e => (
            <div key={e._id} style={{ border: '1px solid #eee', padding: 10, marginBottom: 8, borderRadius: 4 }}>
              <Link to={`/events/${e._id}`}>{e.title}</Link>
              <span style={{ marginLeft: 8, fontSize: 12, color: '#888' }}>{new Date(e.startDate).toLocaleDateString()}</span>
            </div>
          ))
        )}

        <h3>Past Events</h3>
        {past.length === 0 ? <p style={{ color: '#888' }}>None.</p> : (
          past.map(e => (
            <div key={e._id} style={{ border: '1px solid #eee', padding: 10, marginBottom: 8, borderRadius: 4, opacity: 0.7 }}>
              <Link to={`/events/${e._id}`}>{e.title}</Link>
              <span style={{ marginLeft: 8, fontSize: 12, color: '#888' }}>{new Date(e.startDate).toLocaleDateString()}</span>
            </div>
          ))
        )}
      </div>
    </>
  );
}
