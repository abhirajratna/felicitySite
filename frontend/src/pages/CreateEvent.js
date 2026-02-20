import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import API from '../api';

export default function CreateEvent() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '', description: '', eventType: 'normal', eligibility: 'all',
    registrationDeadline: '', startDate: '', endDate: '', registrationLimit: '',
    registrationFee: '', tags: '', venue: '',
    // merchandise
    price: '', itemType: '', sizes: '', colors: '', variants: '', stockQuantity: '', purchaseLimitPerUser: '1',
  });
  const [customFields, setCustomFields] = useState([]);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // Form builder
  const addField = () => {
    setCustomFields([...customFields, { label: '', fieldType: 'text', required: false, options: '', order: customFields.length }]);
  };
  const updateField = (idx, key, val) => {
    const updated = [...customFields];
    updated[idx][key] = val;
    setCustomFields(updated);
  };
  const removeField = (idx) => setCustomFields(customFields.filter((_, i) => i !== idx));
  const moveField = (idx, dir) => {
    const arr = [...customFields];
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    arr.forEach((f, i) => f.order = i);
    setCustomFields(arr);
  };

  const handleSubmit = async (e, status) => {
    e.preventDefault();
    setMsg(''); setError('');
    try {
      const data = {
        title: form.title,
        description: form.description,
        eventType: form.eventType,
        eligibility: form.eligibility,
        venue: form.venue,
        status,
      };
      if (form.registrationDeadline) data.registrationDeadline = form.registrationDeadline;
      if (form.startDate) data.startDate = form.startDate;
      if (form.endDate) data.endDate = form.endDate;
      if (form.registrationLimit) data.registrationLimit = Number(form.registrationLimit);
      if (form.registrationFee) data.registrationFee = Number(form.registrationFee);
      if (form.tags) data.tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);

      if (form.eventType === 'normal') {
        data.customFormFields = customFields.map(f => ({
          label: f.label,
          fieldType: f.fieldType,
          required: f.required,
          options: f.fieldType === 'select' ? f.options.split(',').map(o => o.trim()).filter(Boolean) : [],
          order: f.order,
        }));
      }

      if (form.eventType === 'merchandise') {
        data.price = Number(form.price) || 0;
        data.itemType = form.itemType;
        data.sizes = form.sizes ? form.sizes.split(',').map(s => s.trim()).filter(Boolean) : [];
        data.colors = form.colors ? form.colors.split(',').map(s => s.trim()).filter(Boolean) : [];
        data.variants = form.variants ? form.variants.split(',').map(s => s.trim()).filter(Boolean) : [];
        data.stockQuantity = Number(form.stockQuantity) || 0;
        data.purchaseLimitPerUser = Number(form.purchaseLimitPerUser) || 1;
      }

      const res = await API.post('/events', data);
      setMsg(`Event created as ${status}!`);
      setTimeout(() => navigate(`/organizer/event/${res.data.event._id}`), 1000);
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to create event');
    }
  };

  const inputStyle = { padding: 6, marginBottom: 8, width: '100%', boxSizing: 'border-box' };
  const labelStyle = { fontSize: 13, fontWeight: 500, display: 'block', marginTop: 8 };

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 700, margin: '20px auto', padding: 20 }}>
        <h2>Create Event</h2>

        {msg && <p style={{ color: 'green' }}>{msg}</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}

        <form>
          <label style={labelStyle}>Title *</label>
          <input name="title" value={form.title} onChange={handleChange} required style={inputStyle} />

          <label style={labelStyle}>Description</label>
          <textarea name="description" value={form.description} onChange={handleChange} rows={3} style={inputStyle} />

          <label style={labelStyle}>Event Type *</label>
          <select name="eventType" value={form.eventType} onChange={handleChange} style={inputStyle}>
            <option value="normal">Normal Event</option>
            <option value="merchandise">Merchandise</option>
          </select>

          <label style={labelStyle}>Eligibility</label>
          <select name="eligibility" value={form.eligibility} onChange={handleChange} style={inputStyle}>
            <option value="all">All</option>
            <option value="iiit">IIIT Only</option>
            <option value="non-iiit">Non-IIIT Only</option>
          </select>

          <label style={labelStyle}>Venue</label>
          <input name="venue" value={form.venue} onChange={handleChange} style={inputStyle} />

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Start Date</label>
              <input type="datetime-local" name="startDate" value={form.startDate} onChange={handleChange} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>End Date</label>
              <input type="datetime-local" name="endDate" value={form.endDate} onChange={handleChange} style={inputStyle} />
            </div>
          </div>

          <label style={labelStyle}>Registration Deadline</label>
          <input type="datetime-local" name="registrationDeadline" value={form.registrationDeadline} onChange={handleChange} style={inputStyle} />

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Registration Limit (0 = unlimited)</label>
              <input type="number" name="registrationLimit" value={form.registrationLimit} onChange={handleChange} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Registration Fee (₹)</label>
              <input type="number" name="registrationFee" value={form.registrationFee} onChange={handleChange} style={inputStyle} />
            </div>
          </div>

          <label style={labelStyle}>Tags (comma-separated)</label>
          <input name="tags" value={form.tags} onChange={handleChange} placeholder="tech, workshop, hackathon" style={inputStyle} />

          {/* Merchandise-specific fields */}
          {form.eventType === 'merchandise' && (
            <div style={{ marginTop: 12, padding: 12, background: '#fff3e0', borderRadius: 8 }}>
              <h4 style={{ margin: '0 0 8px' }}>Merchandise Details</h4>
              <label style={labelStyle}>Price (₹) *</label>
              <input type="number" name="price" value={form.price} onChange={handleChange} style={inputStyle} />
              <label style={labelStyle}>Item Type</label>
              <input name="itemType" value={form.itemType} onChange={handleChange} placeholder="T-Shirt, Hoodie, etc." style={inputStyle} />
              <label style={labelStyle}>Sizes (comma-separated)</label>
              <input name="sizes" value={form.sizes} onChange={handleChange} placeholder="S, M, L, XL" style={inputStyle} />
              <label style={labelStyle}>Colors (comma-separated)</label>
              <input name="colors" value={form.colors} onChange={handleChange} placeholder="Red, Blue, Black" style={inputStyle} />
              <label style={labelStyle}>Variants (comma-separated)</label>
              <input name="variants" value={form.variants} onChange={handleChange} style={inputStyle} />
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Stock Quantity</label>
                  <input type="number" name="stockQuantity" value={form.stockQuantity} onChange={handleChange} style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Purchase Limit / User</label>
                  <input type="number" name="purchaseLimitPerUser" value={form.purchaseLimitPerUser} onChange={handleChange} style={inputStyle} />
                </div>
              </div>
            </div>
          )}

          {/* Form Builder for Normal events */}
          {form.eventType === 'normal' && (
            <div style={{ marginTop: 12, padding: 12, background: '#e3f2fd', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0 }}>Custom Registration Form</h4>
                <button type="button" onClick={addField} style={{ padding: '4px 12px', cursor: 'pointer', fontSize: 12 }}>+ Add Field</button>
              </div>

              {customFields.map((f, idx) => (
                <div key={idx} style={{ marginTop: 10, padding: 10, background: '#fff', borderRadius: 6, border: '1px solid #ddd' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: '#666' }}>#{idx + 1}</span>
                    <button type="button" onClick={() => moveField(idx, -1)} disabled={idx === 0} style={{ padding: '2px 6px', cursor: 'pointer', fontSize: 11 }}>↑</button>
                    <button type="button" onClick={() => moveField(idx, 1)} disabled={idx === customFields.length - 1} style={{ padding: '2px 6px', cursor: 'pointer', fontSize: 11 }}>↓</button>
                    <button type="button" onClick={() => removeField(idx)} style={{ padding: '2px 6px', cursor: 'pointer', fontSize: 11, color: 'red' }}>✕</button>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <input placeholder="Field Label" value={f.label} onChange={e => updateField(idx, 'label', e.target.value)} style={{ padding: 4, flex: 2 }} />
                    <select value={f.fieldType} onChange={e => updateField(idx, 'fieldType', e.target.value)} style={{ padding: 4, flex: 1 }}>
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="email">Email</option>
                      <option value="textarea">Textarea</option>
                      <option value="select">Dropdown</option>
                      <option value="checkbox">Checkbox</option>
                      <option value="file">File Upload</option>
                      <option value="date">Date</option>
                    </select>
                    <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input type="checkbox" checked={f.required} onChange={e => updateField(idx, 'required', e.target.checked)} />
                      Required
                    </label>
                  </div>
                  {f.fieldType === 'select' && (
                    <input placeholder="Options (comma-separated)" value={f.options} onChange={e => updateField(idx, 'options', e.target.value)} style={{ padding: 4, width: '100%', marginTop: 6 }} />
                  )}
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button type="button" onClick={e => handleSubmit(e, 'draft')} style={{ padding: '8px 20px', cursor: 'pointer', background: '#888', color: '#fff', border: 'none', borderRadius: 4 }}>Save as Draft</button>
            <button type="button" onClick={e => handleSubmit(e, 'published')} style={{ padding: '8px 20px', cursor: 'pointer', background: '#2196F3', color: '#fff', border: 'none', borderRadius: 4 }}>Publish</button>
          </div>
        </form>
      </div>
    </div>
  );
}
