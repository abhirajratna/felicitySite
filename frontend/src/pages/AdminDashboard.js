import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import API from '../api';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [organizers, setOrganizers] = useState([]);
  const [participants, setParticipants] = useState([]);

  useEffect(() => {
    API.get('/admin/organizers').then(r => setOrganizers(r.data.organizers)).catch(() => {});
    API.get('/admin/participants').then(r => setParticipants(r.data.participants)).catch(() => {});
  }, []);

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 800, margin: '20px auto', padding: 20 }}>
        <h2>Admin Dashboard</h2>
        <p>Logged in as: <strong>{user?.email}</strong></p>

        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 16 }}>
          <div style={{ padding: 16, background: '#e3f2fd', borderRadius: 8, minWidth: 160, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{organizers.length}</div>
            <div style={{ fontSize: 13 }}>Clubs / Organizers</div>
          </div>
          <div style={{ padding: 16, background: '#e8f5e9', borderRadius: 8, minWidth: 160, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{participants.length}</div>
            <div style={{ fontSize: 13 }}>Participants</div>
          </div>
          <div style={{ padding: 16, background: '#fff3e0', borderRadius: 8, minWidth: 160, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{organizers.filter(o => o.isDisabled).length}</div>
            <div style={{ fontSize: 13 }}>Disabled Accounts</div>
          </div>
        </div>
      </div>
    </div>
  );
}
