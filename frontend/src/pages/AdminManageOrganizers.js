import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import API from '../api';

export default function AdminManageOrganizers() {
  const [organizers, setOrganizers] = useState([]);
  const [form, setForm] = useState({ organizerName: '', email: '', password: '', category: '', description: '', contactEmail: '' });
  const [resetForm, setResetForm] = useState({ id: '', newPassword: '' });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [generatedCreds, setGeneratedCreds] = useState(null);

  const fetchOrganizers = () => {
    API.get('/admin/organizers').then(r => setOrganizers(r.data.organizers)).catch(() => {});
  };
  useEffect(() => { fetchOrganizers(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setMsg(''); setError(''); setGeneratedCreds(null);
    try {
      const res = await API.post('/admin/create-organizer', form);
      setMsg('Organizer created successfully');
      if (res.data.credentials) {
        setGeneratedCreds(res.data.credentials);
      }
      setForm({ organizerName: '', email: '', password: '', category: '', description: '', contactEmail: '' });
      fetchOrganizers();
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed');
    }
  };

  const handleRemove = async (id) => {
    if (!window.confirm('Permanently remove this organizer? This cannot be undone.')) return;
    try {
      await API.delete(`/admin/remove-organizer/${id}`);
      setMsg('Organizer removed');
      fetchOrganizers();
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed');
    }
  };

  const handleToggleDisable = async (id) => {
    try {
      const res = await API.put(`/admin/disable-organizer/${id}`);
      setMsg(res.data.msg);
      fetchOrganizers();
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setMsg(''); setError('');
    try {
      await API.put(`/admin/reset-password/${resetForm.id}`, { newPassword: resetForm.newPassword });
      setMsg('Password reset successful');
      setResetForm({ id: '', newPassword: '' });
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed');
    }
  };

  const inputStyle = { padding: 6, marginRight: 8, marginBottom: 6 };

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 900, margin: '20px auto', padding: 20 }}>
        <h2>Manage Clubs / Organizers</h2>

        {msg && <p style={{ color: 'green' }}>{msg}</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}

        {/* Auto-generated credentials display */}
        {generatedCreds && (
          <div style={{ padding: 12, background: '#e8f5e9', borderRadius: 8, marginBottom: 16, border: '1px solid #4CAF50' }}>
            <h4 style={{ margin: '0 0 8px' }}>Generated Credentials (share with organizer):</h4>
            <p style={{ margin: '2px 0', fontSize: 14 }}><strong>Email:</strong> {generatedCreds.email}</p>
            <p style={{ margin: '2px 0', fontSize: 14 }}><strong>Password:</strong> {generatedCreds.password}</p>
            <button onClick={() => setGeneratedCreds(null)} style={{ marginTop: 8, padding: '4px 12px', cursor: 'pointer', fontSize: 12 }}>Dismiss</button>
          </div>
        )}

        {/* Create organizer form */}
        <div style={{ padding: 16, background: '#f9f9f9', borderRadius: 8, marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 10px' }}>Add New Club/Organizer</h3>
          <p style={{ fontSize: 12, color: '#666', margin: '0 0 10px' }}>
            Email and password are auto-generated if left blank. Credentials will be shown after creation.
          </p>
          <form onSubmit={handleCreate}>
            <input placeholder="Organizer Name *" value={form.organizerName} onChange={e => setForm({ ...form, organizerName: e.target.value })} required style={inputStyle} />
            <input placeholder="Email (auto-generated)" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={inputStyle} />
            <input placeholder="Password (auto-generated)" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} style={inputStyle} />
            <input placeholder="Category" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={inputStyle} />
            <input placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={inputStyle} />
            <input placeholder="Contact Email" value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })} style={inputStyle} />
            <button type="submit" style={{ padding: '6px 16px', cursor: 'pointer' }}>Create</button>
          </form>
        </div>

        {/* Organizers table */}
        <h3>All Clubs/Organizers ({organizers.length})</h3>
        {organizers.length === 0 ? (
          <p style={{ color: '#888' }}>No organizers yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: 6 }}>Name</th>
                <th style={{ padding: 6 }}>Email</th>
                <th style={{ padding: 6 }}>Category</th>
                <th style={{ padding: 6 }}>Status</th>
                <th style={{ padding: 6 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {organizers.map(org => (
                <tr key={org._id} style={{ borderBottom: '1px solid #eee', opacity: org.isDisabled ? 0.5 : 1 }}>
                  <td style={{ padding: 6 }}>{org.organizerName || org.name}</td>
                  <td style={{ padding: 6 }}>{org.email}</td>
                  <td style={{ padding: 6 }}>{org.category || '-'}</td>
                  <td style={{ padding: 6 }}>{org.isDisabled ? <span style={{ color: 'red' }}>Disabled</span> : <span style={{ color: 'green' }}>Active</span>}</td>
                  <td style={{ padding: 6 }}>
                    <button onClick={() => handleToggleDisable(org._id)} style={{ padding: '3px 8px', cursor: 'pointer', fontSize: 11, marginRight: 4, border: '1px solid #888', borderRadius: 3, background: 'none' }}>
                      {org.isDisabled ? 'Enable' : 'Disable'}
                    </button>
                    <button onClick={() => handleRemove(org._id)} style={{ padding: '3px 8px', cursor: 'pointer', fontSize: 11, color: 'red', border: '1px solid red', borderRadius: 3, background: 'none' }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Reset password */}
        <div style={{ marginTop: 20, padding: 16, background: '#f9f9f9', borderRadius: 8 }}>
          <h3 style={{ margin: '0 0 10px' }}>Reset Organizer Password</h3>
          <form onSubmit={handleResetPassword} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select value={resetForm.id} onChange={e => setResetForm({ ...resetForm, id: e.target.value })} required style={{ padding: 6 }}>
              <option value="">Select Organizer</option>
              {organizers.map(org => (
                <option key={org._id} value={org._id}>{org.organizerName || org.name} ({org.email})</option>
              ))}
            </select>
            <input placeholder="New Password" value={resetForm.newPassword} onChange={e => setResetForm({ ...resetForm, newPassword: e.target.value })} required style={{ padding: 6 }} />
            <button type="submit" style={{ padding: '6px 16px', cursor: 'pointer' }}>Reset</button>
          </form>
        </div>
      </div>
    </div>
  );
}
