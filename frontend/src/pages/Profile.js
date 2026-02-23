import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../api';
import Navbar from '../components/Navbar';

const INTEREST_OPTIONS = [
  'Technology', 'Music', 'Dance', 'Art', 'Drama',
  'Sports', 'Literature', 'Photography', 'Gaming', 'Robotics',
];

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [contactNumber, setContactNumber] = useState(user?.contactNumber || '');
  const [collegeName, setCollegeName] = useState(user?.collegeName || '');
  const [interests, setInterests] = useState(user?.interests || []);
  const [organizers, setOrganizers] = useState([]);
  const [followedClubs, setFollowedClubs] = useState(
    (user?.followedClubs || []).map(c => (typeof c === 'object' ? c._id : c))
  );
  const [msg, setMsg] = useState('');
  const [pwForm, setPwForm] = useState({ currentPassword: '' });
  const [pwMsg, setPwMsg] = useState('');

  useEffect(() => {
    API.get('/user/organizers-list').then(res => setOrganizers(res.data.organizers)).catch(() => {});
  }, []);

  const toggleInterest = (item) => {
    setInterests(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };
  const toggleClub = (id) => {
    setFollowedClubs(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSaveProfile = async () => {
    try {
      await API.put('/user/profile', { firstName, lastName, contactNumber, collegeName });
      await API.put('/user/preferences', { interests, followedClubs });
      // Refresh user
      const res = await API.get('/auth/me');
      updateUser(res.data.user);
      setMsg('Profile saved!');
      setTimeout(() => setMsg(''), 2000);
    } catch {
      setMsg('Failed to save');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwMsg('');
    try {
      const res = await API.put('/user/change-password', { currentPassword: pwForm.currentPassword });
      setPwMsg(res.data.msg);
      setPwForm({ currentPassword: '' });
    } catch (err) {
      setPwMsg(err.response?.data?.msg || 'Failed');
    }
  };

  return (
    <>
      <Navbar />
      <div style={{ maxWidth: 500, margin: '20px auto', padding: 20 }}>
        <h2>Profile</h2>

        {msg && <p style={{ color: 'green' }}>{msg}</p>}

        {/* Non-editable fields */}
        <p><strong>Email:</strong> {user?.email}</p>
        <p><strong>Participant Type:</strong> {user?.participantType === 'iiit' ? 'IIIT Student' : 'Non-IIIT Participant'}</p>

        {/* Editable fields */}
        <div style={{ marginBottom: 12 }}>
          <label>First Name</label><br />
          <input value={firstName} onChange={e => setFirstName(e.target.value)} style={{ width: '100%', padding: 8 }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Last Name</label><br />
          <input value={lastName} onChange={e => setLastName(e.target.value)} style={{ width: '100%', padding: 8 }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Contact Number</label><br />
          <input value={contactNumber} onChange={e => setContactNumber(e.target.value)} style={{ width: '100%', padding: 8 }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>College / Organization</label><br />
          <input value={collegeName} onChange={e => setCollegeName(e.target.value)} style={{ width: '100%', padding: 8 }} />
        </div>

        <h3>Areas of Interest</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {INTEREST_OPTIONS.map(item => (
            <button key={item} onClick={() => toggleInterest(item)} style={{
              padding: '6px 14px', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer',
              background: interests.includes(item) ? '#4CAF50' : '#fff',
              color: interests.includes(item) ? '#fff' : '#333',
            }}>{item}</button>
          ))}
        </div>

        {organizers.length > 0 && (
          <>
            <h3>Follow Clubs / Organizers</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {organizers.map(org => (
                <button key={org._id} onClick={() => toggleClub(org._id)} style={{
                  padding: '6px 14px', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer',
                  background: followedClubs.includes(org._id) ? '#2196F3' : '#fff',
                  color: followedClubs.includes(org._id) ? '#fff' : '#333',
                }}>{org.organizerName || org.name}</button>
              ))}
            </div>
          </>
        )}

        <button onClick={handleSaveProfile} style={{ padding: '8px 24px', cursor: 'pointer', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: 4 }}>
          Save Profile
        </button>

        <hr style={{ margin: '24px 0' }} />
        <h3>Reset Password</h3>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>A new random password will be generated and sent to your email.</p>
        {pwMsg && <p style={{ color: pwMsg.includes('success') || pwMsg.includes('sent') ? 'green' : 'red' }}>{pwMsg}</p>}
        <form onSubmit={handleChangePassword}>
          <div style={{ marginBottom: 10 }}>
            <label>Current Password (to verify identity)</label><br />
            <input type="password" value={pwForm.currentPassword} onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })} required style={{ width: '100%', padding: 8 }} />
          </div>
          <button type="submit" style={{ padding: '8px 24px', cursor: 'pointer', background: '#FF9800', color: '#fff', border: 'none', borderRadius: 4 }}>Reset Password & Email Me</button>
        </form>
      </div>
    </>
  );
}
