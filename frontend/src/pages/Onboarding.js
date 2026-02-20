import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api';

const INTEREST_OPTIONS = [
  'Technology', 'Music', 'Dance', 'Art', 'Drama',
  'Sports', 'Literature', 'Photography', 'Gaming', 'Robotics',
];

export default function Onboarding() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [interests, setInterests] = useState([]);
  const [organizers, setOrganizers] = useState([]);
  const [followedClubs, setFollowedClubs] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    API.get('/user/organizers-list')
      .then((res) => setOrganizers(res.data.organizers))
      .catch(() => {});
  }, []);

  const toggleInterest = (item) => {
    setInterests((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const toggleClub = (id) => {
    setFollowedClubs((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    setError('');
    try {
      const res = await API.put('/user/preferences', { interests, followedClubs });
      updateUser(res.data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to save preferences');
    }
  };

  const handleSkip = async () => {
    try {
      await API.put('/user/skip-onboarding');
      updateUser({ onboardingDone: true });
      navigate('/dashboard');
    } catch (err) {
      setError('Failed to skip');
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: '60px auto', padding: 20 }}>
      <h2>Welcome, {user?.firstName || user?.name}!</h2>
      <p>Set your preferences (you can change these later in your profile).</p>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <h3>Areas of Interest</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {INTEREST_OPTIONS.map((item) => (
          <button
            key={item}
            onClick={() => toggleInterest(item)}
            style={{
              padding: '6px 14px',
              border: '1px solid #ccc',
              borderRadius: 4,
              cursor: 'pointer',
              background: interests.includes(item) ? '#4CAF50' : '#fff',
              color: interests.includes(item) ? '#fff' : '#333',
            }}
          >
            {item}
          </button>
        ))}
      </div>

      {organizers.length > 0 && (
        <>
          <h3>Follow Clubs / Organizers</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {organizers.map((org) => (
              <button
                key={org._id}
                onClick={() => toggleClub(org._id)}
                style={{
                  padding: '6px 14px',
                  border: '1px solid #ccc',
                  borderRadius: 4,
                  cursor: 'pointer',
                  background: followedClubs.includes(org._id) ? '#2196F3' : '#fff',
                  color: followedClubs.includes(org._id) ? '#fff' : '#333',
                }}
              >
                {org.organizerName || org.name}
              </button>
            ))}
          </div>
        </>
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={handleSave} style={{ padding: '8px 24px', cursor: 'pointer', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: 4 }}>
          Save Preferences
        </button>
        <button onClick={handleSkip} style={{ padding: '8px 24px', cursor: 'pointer', background: '#999', color: '#fff', border: 'none', borderRadius: 4 }}>
          Skip for Now
        </button>
      </div>
    </div>
  );
}
