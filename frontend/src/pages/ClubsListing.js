import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api';
import Navbar from '../components/Navbar';

export default function ClubsListing() {
  const { user } = useAuth();
  const [organizers, setOrganizers] = useState([]);
  const [followed, setFollowed] = useState(
    (user?.followedClubs || []).map(c => (typeof c === 'object' ? c._id : c))
  );

  useEffect(() => {
    API.get('/user/organizers-list').then(res => setOrganizers(res.data.organizers)).catch(() => {});
  }, []);

  const toggleFollow = async (orgId) => {
    try {
      const res = await API.put(`/user/follow/${orgId}`);
      setFollowed(res.data.followedClubs);
    } catch {}
  };

  return (
    <>
      <Navbar />
      <div style={{ maxWidth: 700, margin: '20px auto', padding: 20 }}>
        <h2>Clubs / Organizers</h2>
        {organizers.length === 0 ? (
          <p style={{ color: '#888' }}>No organizers yet.</p>
        ) : (
          organizers.map(org => (
            <div key={org._id} style={{ border: '1px solid #ddd', borderRadius: 6, padding: 14, marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Link to={`/clubs/${org._id}`} style={{ fontWeight: 600, fontSize: 15 }}>{org.organizerName}</Link>
                <p style={{ margin: '4px 0', fontSize: 13, color: '#666' }}>Category: {org.category || '-'}</p>
                <p style={{ margin: 0, fontSize: 13, color: '#888' }}>{org.description?.slice(0, 100) || ''}</p>
              </div>
              {user?.role === 'participant' && (
                <button
                  onClick={() => toggleFollow(org._id)}
                  style={{
                    padding: '6px 16px', cursor: 'pointer', borderRadius: 4, border: '1px solid #ccc',
                    background: followed.includes(org._id) ? '#e91e63' : '#fff',
                    color: followed.includes(org._id) ? '#fff' : '#333',
                  }}
                >
                  {followed.includes(org._id) ? 'Unfollow' : 'Follow'}
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}
