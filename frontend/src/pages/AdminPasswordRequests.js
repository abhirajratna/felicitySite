import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import API from '../api';

export default function AdminPasswordRequests() {
  const [requests, setRequests] = useState([]);
  const [msg, setMsg] = useState('');
  const [comment, setComment] = useState({});
  const [credentials, setCredentials] = useState(null);
  const [filter, setFilter] = useState('pending');

  const fetchRequests = () => {
    API.get('/admin/password-reset-requests').then(r => setRequests(r.data.requests || [])).catch(() => {});
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleApprove = async (id) => {
    try {
      const res = await API.put(`/admin/password-reset-requests/${id}/approve`, { comment: comment[id] || '' });
      setMsg('Password reset approved');
      setCredentials(res.data.credentials);
      fetchRequests();
    } catch (err) {
      setMsg(err.response?.data?.msg || 'Failed');
    }
  };

  const handleReject = async (id) => {
    try {
      await API.put(`/admin/password-reset-requests/${id}/reject`, { comment: comment[id] || '' });
      setMsg('Request rejected');
      fetchRequests();
    } catch (err) {
      setMsg(err.response?.data?.msg || 'Failed');
    }
  };

  const filtered = requests.filter(r => filter === 'all' || r.status === filter);

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 700, margin: '20px auto', padding: 20 }}>
        <h2>Password Reset Requests</h2>
        {msg && <p style={{ color: 'green' }}>{msg}</p>}

        {/* Show generated credentials */}
        {credentials && (
          <div style={{ padding: 12, background: '#e8f5e9', border: '1px solid #4CAF50', borderRadius: 6, marginBottom: 16 }}>
            <strong>New Credentials Generated:</strong>
            <p style={{ margin: '4px 0', fontSize: 13 }}>Email: <code>{credentials.email}</code></p>
            <p style={{ margin: '4px 0', fontSize: 13 }}>Password: <code>{credentials.password}</code></p>
            <p style={{ fontSize: 11, color: '#888' }}>Share these securely with the organizer.</p>
            <button onClick={() => setCredentials(null)} style={{ padding: '4px 10px', cursor: 'pointer', fontSize: 12, marginTop: 4 }}>Dismiss</button>
          </div>
        )}

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {['pending', 'approved', 'rejected', 'all'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: '4px 14px', cursor: 'pointer', background: filter === f ? '#2196F3' : '#eee', color: filter === f ? '#fff' : '#333', border: 'none', borderRadius: 4, textTransform: 'capitalize' }}>
              {f} ({f === 'all' ? requests.length : requests.filter(r => r.status === f).length})
            </button>
          ))}
        </div>

        {filtered.length === 0 && <p style={{ color: '#888' }}>No {filter} requests.</p>}

        {filtered.map(req => (
          <div key={req._id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{req.organizer?.organizerName || 'Unknown'}</strong>
                <span style={{ fontSize: 12, color: '#888', marginLeft: 8 }}>{req.organizer?.email}</span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: req.status === 'pending' ? '#FF9800' : req.status === 'approved' ? '#4CAF50' : '#f44336' }}>
                {req.status.toUpperCase()}
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{new Date(req.createdAt).toLocaleString()}</div>
            {req.reason && <p style={{ fontSize: 13, margin: '6px 0 0' }}>Reason: {req.reason}</p>}
            {req.adminComment && <p style={{ fontSize: 13, margin: '4px 0 0', color: '#666' }}>Admin comment: {req.adminComment}</p>}

            {req.status === 'pending' && (
              <div style={{ marginTop: 10 }}>
                <input
                  value={comment[req._id] || ''}
                  onChange={e => setComment({ ...comment, [req._id]: e.target.value })}
                  placeholder="Admin comment (optional)..."
                  style={{ padding: 6, width: '100%', marginBottom: 8, fontSize: 12 }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => handleApprove(req._id)} style={{ padding: '6px 14px', cursor: 'pointer', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12 }}>
                    Approve & Generate Password
                  </button>
                  <button onClick={() => handleReject(req._id)} style={{ padding: '6px 14px', cursor: 'pointer', background: '#f44336', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12 }}>
                    Reject
                  </button>
                </div>
              </div>
            )}

            {req.status === 'approved' && req.generatedPassword && (
              <p style={{ fontSize: 12, marginTop: 6, color: '#4CAF50' }}>Generated password: <code>{req.generatedPassword}</code></p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
