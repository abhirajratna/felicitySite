import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import API from '../api';

export default function OrganizerProfile() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    organizerName: '', category: '', description: '', contactEmail: '', contactNumber: '', discordWebhook: '',
  });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  // Password reset request state
  const [resetReason, setResetReason] = useState('');
  const [resetRequests, setResetRequests] = useState([]);
  const [resetMsg, setResetMsg] = useState('');

  useEffect(() => {
    API.get('/user/profile').then(r => {
      const u = r.data.user;
      setForm({
        organizerName: u.organizerName || '',
        category: u.category || '',
        description: u.description || '',
        contactEmail: u.contactEmail || '',
        contactNumber: u.contactNumber || '',
        discordWebhook: u.discordWebhook || '',
      });
    }).catch(() => {});
    // Fetch existing password reset requests
    API.get('/user/password-reset-requests').then(r => setResetRequests(r.data.requests || [])).catch(() => {});
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setMsg(''); setError('');
    try {
      const res = await API.put('/user/profile', form);
      updateUser(res.data.user);
      setMsg('Profile updated');
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed');
    }
  };


  const handleResetRequest = async () => {
    setResetMsg('');
    try {
      await API.post('/user/password-reset-request', { reason: resetReason });
      setResetMsg('Request submitted! Admin will review it.');
      setResetReason('');
      const r = await API.get('/user/password-reset-requests');
      setResetRequests(r.data.requests || []);
    } catch (err) {
      setResetMsg(err.response?.data?.msg || 'Failed');
    }
  };

  const inputStyle = { padding: 6, marginBottom: 8, width: '100%', boxSizing: 'border-box' };
  const labelStyle = { fontSize: 13, fontWeight: 500, display: 'block', marginTop: 8 };
  const hasPending = resetRequests.some(r => r.status === 'pending');

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 600, margin: '20px auto', padding: 20 }}>
        <h2>Organizer Profile</h2>

        {msg && <p style={{ color: 'green' }}>{msg}</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}

        {/* Non-editable */}
        <div style={{ padding: 12, background: '#f5f5f5', borderRadius: 8, marginBottom: 16 }}>
          <p style={{ margin: '4px 0', fontSize: 13 }}><strong>Login Email (non-editable):</strong> {user?.email}</p>
        </div>

        {/* Editable fields */}
        <form onSubmit={handleSave}>
          <label style={labelStyle}>Organizer / Club Name</label>
          <input value={form.organizerName} onChange={e => setForm({ ...form, organizerName: e.target.value })} style={inputStyle} />

          <label style={labelStyle}>Category</label>
          <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Technical, Cultural, Sports..." style={inputStyle} />

          <label style={labelStyle}>Description</label>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} style={inputStyle} />

          <label style={labelStyle}>Contact Email</label>
          <input type="email" value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })} style={inputStyle} />

          <label style={labelStyle}>Contact Number</label>
          <input value={form.contactNumber} onChange={e => setForm({ ...form, contactNumber: e.target.value })} style={inputStyle} />

          <label style={labelStyle}>Discord Webhook URL</label>
          <input value={form.discordWebhook} onChange={e => setForm({ ...form, discordWebhook: e.target.value })} placeholder="https://discord.com/api/webhooks/..." style={inputStyle} />
          <p style={{ fontSize: 11, color: '#888', margin: '0 0 8px' }}>New events will be auto-posted to this Discord channel when published.</p>

          <button type="submit" style={{ padding: '8px 20px', cursor: 'pointer', marginTop: 8 }}>Save Profile</button>
        </form>

        <hr style={{ margin: '24px 0' }} />
        <h3>Request Password Reset (via Admin)</h3>
        <p style={{ fontSize: 13, color: '#666' }}>Forgot your password? Submit a reset request to the admin.</p>

        {resetMsg && <p style={{ fontSize: 13, color: resetMsg.includes('submitted') ? 'green' : 'red' }}>{resetMsg}</p>}

        {!hasPending ? (
          <div>
            <label style={labelStyle}>Reason (optional)</label>
            <textarea value={resetReason} onChange={e => setResetReason(e.target.value)} rows={2} placeholder="Why do you need a reset?" style={inputStyle} />
            <button onClick={handleResetRequest} style={{ padding: '8px 20px', cursor: 'pointer', background: '#FF9800', color: '#fff', border: 'none', borderRadius: 4 }}>Submit Reset Request</button>
          </div>
        ) : (
          <p style={{ color: '#FF9800', fontSize: 13 }}>You have a pending reset request. Please wait for admin review.</p>
        )}

        {/* Request history */}
        {resetRequests.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <h4 style={{ margin: '8px 0', fontSize: 14 }}>Request History</h4>
            {resetRequests.map(r => (
              <div key={r._id} style={{ padding: 8, marginBottom: 6, background: '#f9f9f9', borderRadius: 4, fontSize: 13 }}>
                <span style={{ color: r.status === 'pending' ? '#FF9800' : r.status === 'approved' ? 'green' : 'red', fontWeight: 600 }}>
                  {r.status.toUpperCase()}
                </span>
                <span style={{ marginLeft: 8, color: '#888' }}>{new Date(r.createdAt).toLocaleString()}</span>
                {r.reason && <p style={{ margin: '4px 0 0', fontSize: 12 }}>Reason: {r.reason}</p>}
                {r.adminComment && <p style={{ margin: '2px 0 0', fontSize: 12 }}>Admin: {r.adminComment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
