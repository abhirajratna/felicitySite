import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import API from '../api';
import jsQR from 'jsqr';

export default function OrganizerEventDetail() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [msg, setMsg] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [editLimit, setEditLimit] = useState('');
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState('participants'); // participants | pending | attendance

  // Attendance/Scanner state
  const [manualTicket, setManualTicket] = useState('');
  const [scanResult, setScanResult] = useState('');
  const [checkedInList, setCheckedInList] = useState([]);
  const [notCheckedInList, setNotCheckedInList] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState({ total: 0, checkedIn: 0, notCheckedIn: 0 });
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animRef = useRef(null);

  const fetchEvent = () => {
    API.get(`/events/${id}`).then(r => {
      setEvent(r.data.event);
      setEditDesc(r.data.event.description);
      setEditDeadline(r.data.event.registrationDeadline ? r.data.event.registrationDeadline.slice(0, 16) : '');
      setEditLimit(r.data.event.registrationLimit || 0);
    }).catch(() => {});
  };
  const fetchAttendance = () => {
    API.get(`/events/attendance/${id}`).then(r => {
      setCheckedInList(r.data.checkedInList || []);
      setNotCheckedInList(r.data.notCheckedInList || []);
      setAttendanceStats({ total: r.data.total || 0, checkedIn: r.data.checkedIn || 0, notCheckedIn: r.data.notCheckedIn || 0 });
    }).catch(() => {});
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchEvent(); fetchAttendance(); }, [id]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  if (!event) return <div><Navbar /><div style={{ padding: 40, textAlign: 'center' }}>Loading...</div></div>;

  const confirmed = event.registrations?.filter(r => r.status === 'confirmed') || [];
  const pendingOrders = event.registrations?.filter(r => r.status === 'pending_approval') || [];
  const revenue = event.eventType === 'merchandise'
    ? confirmed.reduce((s, r) => s + (r.quantity || 1) * (event.price || 0), 0)
    : confirmed.length * (event.registrationFee || 0);

  const filteredRegs = event.registrations?.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (search) {
      const p = r.participant;
      const name = p ? `${p.firstName || ''} ${p.lastName || ''}`.toLowerCase() : '';
      const email = p?.email?.toLowerCase() || '';
      if (!name.includes(search.toLowerCase()) && !email.includes(search.toLowerCase())) return false;
    }
    return true;
  }) || [];

  const handleStatusChange = async (newStatus) => {
    try {
      await API.put(`/events/${id}`, { status: newStatus });
      setMsg(`Status changed to ${newStatus}`);
      fetchEvent();
    } catch (err) { setMsg(err.response?.data?.msg || 'Failed'); }
  };

  const handleSaveEdits = async () => {
    try {
      const updates = { description: editDesc };
      if (editDeadline) updates.registrationDeadline = editDeadline;
      if (editLimit) updates.registrationLimit = Number(editLimit);
      await API.put(`/events/${id}`, updates);
      setMsg('Updated successfully');
      setEditing(false);
      fetchEvent();
    } catch (err) { setMsg(err.response?.data?.msg || 'Failed'); }
  };

  const handleExportCSV = () => {
    window.open(`http://localhost:5000/api/events/export/${id}?token=${localStorage.getItem('token')}`, '_blank');
  };

  const handleAttendanceExport = () => {
    window.open(`http://localhost:5000/api/events/attendance-export/${id}?token=${localStorage.getItem('token')}`, '_blank');
  };

  // Payment approval handlers
  const handleApprove = async (ticketId) => {
    try {
      const res = await API.put(`/events/approve/${id}/${ticketId}`);
      setMsg(res.data.msg);
      fetchEvent();
    } catch (err) { setMsg(err.response?.data?.msg || 'Failed'); }
  };

  const handleReject = async (ticketId) => {
    if (!window.confirm('Reject this order?')) return;
    try {
      const res = await API.put(`/events/reject/${id}/${ticketId}`);
      setMsg(res.data.msg);
      fetchEvent();
    } catch (err) { setMsg(err.response?.data?.msg || 'Failed'); }
  };

  // QR Scanner handlers
  const handleScanResult = async (data) => {
    try {
      const parsed = JSON.parse(data);
      const res = await API.post(`/events/scan/${id}`, { ticketId: parsed.ticketId });
      setScanResult(`✅ ${res.data.msg} — ${res.data.participantName || res.data.participant?.name || 'Unknown'}`);
      fetchAttendance();
      fetchEvent();
    } catch (err) {
      if (typeof err === 'object' && err.response) {
        setScanResult(`❌ ${err.response?.data?.msg || 'Scan failed'}`);
      } else {
        setScanResult('❌ Invalid QR code data');
      }
    }
  };

  const handleManualCheckin = async () => {
    if (!manualTicket.trim()) return;
    try {
      const res = await API.post(`/events/manual-checkin/${id}/${manualTicket.trim()}`, { note: 'Manual entry' });
      setScanResult(`✅ ${res.data.msg}`);
      setManualTicket('');
      fetchAttendance();
      fetchEvent();
    } catch (err) { setScanResult(`❌ ${err.response?.data?.msg || 'Failed'}`); }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const img = new Image();
    const reader = new FileReader();
    reader.onloadend = () => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
          handleScanResult(code.data);
        } else {
          setScanResult('❌ No QR code found in image');
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      videoRef.current.play();
      setScanning(true);

      const scanLoop = () => {
        if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
          animRef.current = requestAnimationFrame(scanLoop);
          return;
        }
        const canvas = canvasRef.current;
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
          handleScanResult(code.data);
          stopCamera();
          return;
        }
        animRef.current = requestAnimationFrame(scanLoop);
      };
      animRef.current = requestAnimationFrame(scanLoop);
    } catch (err) {
      setScanResult('❌ Camera access denied or not available');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setScanning(false);
  };

  const statusColor = (s) => {
    const map = { draft: '#888', published: '#2196F3', ongoing: '#FF9800', completed: '#4CAF50', closed: '#999', cancelled: '#f44336' };
    return map[s] || '#333';
  };

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 900, margin: '20px auto', padding: 20 }}>
        <Link to="/organizer" style={{ fontSize: 13 }}>← Back to Dashboard</Link>

        <h2>{event.title}</h2>

        {msg && <p style={{ color: 'green', fontSize: 13 }}>{msg}</p>}

        {/* Overview */}
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 10 }}>
          <div><strong>Type:</strong> {event.eventType}</div>
          <div><strong>Status:</strong> <span style={{ color: statusColor(event.status), fontWeight: 600 }}>{event.status}</span></div>
          <div><strong>Eligibility:</strong> {event.eligibility}</div>
          <div><strong>Start:</strong> {event.startDate ? new Date(event.startDate).toLocaleDateString() : 'TBA'}</div>
          <div><strong>End:</strong> {event.endDate ? new Date(event.endDate).toLocaleDateString() : 'TBA'}</div>
          <div><strong>Venue:</strong> {event.venue || 'TBA'}</div>
          {event.eventType === 'merchandise' && <div><strong>Price:</strong> ₹{event.price}</div>}
          {event.eventType === 'normal' && event.registrationFee > 0 && <div><strong>Fee:</strong> ₹{event.registrationFee}</div>}
        </div>

        {/* Status actions */}
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          {event.status === 'draft' && <button onClick={() => handleStatusChange('published')} style={{ padding: '4px 12px', cursor: 'pointer', background: '#2196F3', color: '#fff', border: 'none', borderRadius: 4 }}>Publish</button>}
          {event.status === 'published' && <button onClick={() => handleStatusChange('ongoing')} style={{ padding: '4px 12px', cursor: 'pointer', background: '#FF9800', color: '#fff', border: 'none', borderRadius: 4 }}>Mark Ongoing</button>}
          {(event.status === 'published' || event.status === 'ongoing') && <button onClick={() => handleStatusChange('closed')} style={{ padding: '4px 12px', cursor: 'pointer', background: '#999', color: '#fff', border: 'none', borderRadius: 4 }}>Close Registrations</button>}
          {(event.status === 'ongoing' || event.status === 'published') && <button onClick={() => handleStatusChange('completed')} style={{ padding: '4px 12px', cursor: 'pointer', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: 4 }}>Mark Completed</button>}
          {event.status === 'draft' && <button onClick={() => handleStatusChange('cancelled')} style={{ padding: '4px 12px', cursor: 'pointer', background: '#f44336', color: '#fff', border: 'none', borderRadius: 4 }}>Cancel</button>}
        </div>

        {/* Inline edit for published events */}
        {(event.status === 'published' || event.status === 'draft') && (
          <div style={{ marginTop: 16, padding: 12, background: '#f9f9f9', borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0 }}>Edit</h4>
              {!editing && <button onClick={() => setEditing(true)} style={{ padding: '4px 12px', cursor: 'pointer', fontSize: 12 }}>Edit</button>}
            </div>
            {editing && (
              <div style={{ marginTop: 8 }}>
                <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Description</label>
                <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={3} style={{ width: '100%', padding: 6 }} />
                <label style={{ display: 'block', fontSize: 13, marginTop: 8, marginBottom: 4 }}>Registration Deadline</label>
                <input type="datetime-local" value={editDeadline} onChange={e => setEditDeadline(e.target.value)} style={{ padding: 6 }} />
                <label style={{ display: 'block', fontSize: 13, marginTop: 8, marginBottom: 4 }}>Registration Limit</label>
                <input type="number" value={editLimit} onChange={e => setEditLimit(e.target.value)} style={{ padding: 6, width: 100 }} />
                <div style={{ marginTop: 8 }}>
                  <button onClick={handleSaveEdits} style={{ padding: '4px 14px', cursor: 'pointer', marginRight: 8 }}>Save</button>
                  <button onClick={() => setEditing(false)} style={{ padding: '4px 14px', cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Analytics */}
        <div style={{ marginTop: 20, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ padding: 12, background: '#e3f2fd', borderRadius: 8, minWidth: 120, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{confirmed.length}</div>
            <div style={{ fontSize: 12 }}>Confirmed</div>
          </div>
          <div style={{ padding: 12, background: '#e8f5e9', borderRadius: 8, minWidth: 120, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700 }}>₹{revenue}</div>
            <div style={{ fontSize: 12 }}>Revenue</div>
          </div>
          {event.eventType === 'merchandise' && (
            <>
              <div style={{ padding: 12, background: '#fff3e0', borderRadius: 8, minWidth: 120, textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{pendingOrders.length}</div>
                <div style={{ fontSize: 12 }}>Pending Orders</div>
              </div>
              <div style={{ padding: 12, background: '#fce4ec', borderRadius: 8, minWidth: 120, textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{confirmed.reduce((s, r) => s + (r.quantity || 1), 0)}</div>
                <div style={{ fontSize: 12 }}>Items Sold</div>
              </div>
              <div style={{ padding: 12, background: '#ffecb3', borderRadius: 8, minWidth: 120, textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{event.stockQuantity}</div>
                <div style={{ fontSize: 12 }}>Stock Left</div>
              </div>
            </>
          )}
          <div style={{ padding: 12, background: '#f3e5f5', borderRadius: 8, minWidth: 120, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{attendanceStats.checkedIn}/{confirmed.length}</div>
            <div style={{ fontSize: 12 }}>Attendance</div>
          </div>
          <div style={{ padding: 12, background: '#e0f2f1', borderRadius: 8, minWidth: 120, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{event.viewCount || 0}</div>
            <div style={{ fontSize: 12 }}>Views</div>
          </div>
        </div>

        {/* Tab navigation */}
        <div style={{ marginTop: 20, display: 'flex', gap: 0, borderBottom: '2px solid #ddd' }}>
          {['participants', ...(event.eventType === 'merchandise' ? ['pending'] : []), 'attendance'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '8px 20px', cursor: 'pointer', background: tab === t ? '#fff' : '#f5f5f5', border: '1px solid #ddd', borderBottom: tab === t ? '2px solid #fff' : 'none', marginBottom: -2, fontWeight: tab === t ? 600 : 400, textTransform: 'capitalize' }}>
              {t === 'pending' ? `Pending Orders (${pendingOrders.length})` : t}
            </button>
          ))}
        </div>

        {/* ─── TAB: PARTICIPANTS ─────────────────────────────────── */}
        {tab === 'participants' && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h3 style={{ margin: 0 }}>Participants ({event.registrations?.length || 0})</h3>
              <button onClick={handleExportCSV} style={{ padding: '4px 14px', cursor: 'pointer', fontSize: 12 }}>Export CSV</button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input placeholder="Search name or email..." value={search} onChange={e => setSearch(e.target.value)} style={{ padding: 6, flex: 1 }} />
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: 6 }}>
                <option value="all">All Status</option>
                <option value="confirmed">Confirmed</option>
                <option value="pending_approval">Pending</option>
                <option value="cancelled">Cancelled</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: 6 }}>Name</th>
                  <th style={{ padding: 6 }}>Email</th>
                  <th style={{ padding: 6 }}>Reg Date</th>
                  <th style={{ padding: 6 }}>Payment</th>
                  <th style={{ padding: 6 }}>Attendance</th>
                  <th style={{ padding: 6 }}>Status</th>
                  <th style={{ padding: 6 }}>Ticket ID</th>
                  {event.eventType === 'merchandise' && <th style={{ padding: 6 }}>Size/Color/Qty</th>}
                </tr>
              </thead>
              <tbody>
                {filteredRegs.map(r => {
                  const p = r.participant;
                  const paymentInfo = event.eventType === 'merchandise'
                    ? (r.paymentProof ? 'Proof uploaded' : 'None')
                    : (event.registrationFee > 0 ? `₹${event.registrationFee}` : 'Free');
                  return (
                    <tr key={r.ticketId} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: 6 }}>{p ? `${p.firstName || ''} ${p.lastName || ''}` : 'N/A'}</td>
                      <td style={{ padding: 6 }}>{p?.email || ''}</td>
                      <td style={{ padding: 6 }}>{r.registeredAt ? new Date(r.registeredAt).toLocaleDateString() : ''}</td>
                      <td style={{ padding: 6, fontSize: 12 }}>{paymentInfo}</td>
                      <td style={{ padding: 6, fontSize: 12, color: r.attendanceChecked ? 'green' : '#888' }}>{r.attendanceChecked ? '✓ Checked In' : '—'}</td>
                      <td style={{ padding: 6, color: r.status === 'confirmed' ? 'green' : r.status === 'pending_approval' ? '#FF9800' : r.status === 'rejected' ? 'red' : '#888' }}>{r.status}</td>
                      <td style={{ padding: 6, fontSize: 11 }}>{r.ticketId?.slice(0, 8)}...</td>
                      {event.eventType === 'merchandise' && <td style={{ padding: 6 }}>{r.size || '-'}/{r.color || '-'}/{r.quantity || 1}</td>}
                    </tr>
                  );
                })}
                {filteredRegs.length === 0 && (
                  <tr><td colSpan={event.eventType === 'merchandise' ? 8 : 7} style={{ padding: 12, textAlign: 'center', color: '#888' }}>No participants found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ─── TAB: PENDING ORDERS ──────────────────────────────── */}
        {tab === 'pending' && (
          <div style={{ marginTop: 16 }}>
            <h3>Payment Approval ({pendingOrders.length} Pending)</h3>

            {/* Show pending orders first */}
            {pendingOrders.length === 0 && <p style={{ color: '#888' }}>No pending orders.</p>}
            {pendingOrders.map(r => {
              const p = r.participant;
              return (
                <div key={r.ticketId} style={{ border: '1px solid #FF9800', borderRadius: 8, padding: 12, marginBottom: 12, background: '#fff8e1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <strong>{p ? `${p.firstName || ''} ${p.lastName || ''}` : 'N/A'}</strong>
                      <span style={{ fontSize: 12, color: '#888', marginLeft: 8 }}>{p?.email}</span>
                      <span style={{ fontSize: 11, background: '#FF9800', color: '#fff', padding: '1px 6px', borderRadius: 3, marginLeft: 8 }}>Pending</span>
                      <div style={{ fontSize: 13, marginTop: 4 }}>
                        Size: {r.size || '-'} | Color: {r.color || '-'} | Qty: {r.quantity || 1} | Total: ₹{(r.quantity || 1) * (event.price || 0)}
                      </div>
                      <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Ticket: {r.ticketId?.slice(0, 12)}... | {new Date(r.registeredAt).toLocaleString()}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => handleApprove(r.ticketId)} style={{ padding: '6px 14px', cursor: 'pointer', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12 }}>Approve</button>
                      <button onClick={() => handleReject(r.ticketId)} style={{ padding: '6px 14px', cursor: 'pointer', background: '#f44336', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12 }}>Reject</button>
                    </div>
                  </div>
                  {/* Payment proof image */}
                  {r.paymentProof && (
                    <div style={{ marginTop: 8 }}>
                      <strong style={{ fontSize: 12 }}>Payment Proof:</strong>
                      <div style={{ marginTop: 4 }}>
                        <img src={r.paymentProof} alt="Payment proof" style={{ maxWidth: 300, maxHeight: 200, border: '1px solid #ddd', borderRadius: 4 }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Show rejected orders */}
            {(() => {
              const rejectedOrders = (event.registrations || []).filter(r => r.status === 'rejected');
              if (rejectedOrders.length === 0) return null;
              return (
                <>
                  <h4 style={{ marginTop: 20 }}>Rejected Orders ({rejectedOrders.length})</h4>
                  {rejectedOrders.map(r => {
                    const p = r.participant;
                    return (
                      <div key={r.ticketId} style={{ border: '1px solid #f44336', borderRadius: 8, padding: 12, marginBottom: 12, background: '#fff5f5', opacity: 0.8 }}>
                        <div>
                          <strong>{p ? `${p.firstName || ''} ${p.lastName || ''}` : 'N/A'}</strong>
                          <span style={{ fontSize: 12, color: '#888', marginLeft: 8 }}>{p?.email}</span>
                          <span style={{ fontSize: 11, background: '#f44336', color: '#fff', padding: '1px 6px', borderRadius: 3, marginLeft: 8 }}>Rejected</span>
                          <div style={{ fontSize: 13, marginTop: 4 }}>
                            Size: {r.size || '-'} | Color: {r.color || '-'} | Qty: {r.quantity || 1}
                          </div>
                          <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Ticket: {r.ticketId?.slice(0, 12)}... | {new Date(r.registeredAt).toLocaleString()}</div>
                        </div>
                        {r.paymentProof && (
                          <div style={{ marginTop: 8 }}>
                            <strong style={{ fontSize: 12 }}>Payment Proof:</strong>
                            <div style={{ marginTop: 4 }}>
                              <img src={r.paymentProof} alt="Payment proof" style={{ maxWidth: 200, maxHeight: 150, border: '1px solid #ddd', borderRadius: 4 }} />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              );
            })()}

            {/* Show approved/confirmed orders */}
            {(() => {
              const approvedOrders = (event.registrations || []).filter(r => r.status === 'confirmed');
              if (approvedOrders.length === 0) return null;
              return (
                <>
                  <h4 style={{ marginTop: 20 }}>Approved Orders ({approvedOrders.length})</h4>
                  {approvedOrders.map(r => {
                    const p = r.participant;
                    return (
                      <div key={r.ticketId} style={{ border: '1px solid #4CAF50', borderRadius: 8, padding: 12, marginBottom: 12, background: '#f0fff0' }}>
                        <div>
                          <strong>{p ? `${p.firstName || ''} ${p.lastName || ''}` : 'N/A'}</strong>
                          <span style={{ fontSize: 12, color: '#888', marginLeft: 8 }}>{p?.email}</span>
                          <span style={{ fontSize: 11, background: '#4CAF50', color: '#fff', padding: '1px 6px', borderRadius: 3, marginLeft: 8 }}>Approved</span>
                          <div style={{ fontSize: 13, marginTop: 4 }}>
                            Size: {r.size || '-'} | Color: {r.color || '-'} | Qty: {r.quantity || 1} | Total: ₹{(r.quantity || 1) * (event.price || 0)}
                          </div>
                          <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Ticket: {r.ticketId?.slice(0, 12)}... | {new Date(r.registeredAt).toLocaleString()}</div>
                        </div>
                      </div>
                    );
                  })}
                </>
              );
            })()}
          </div>
        )}

        {/* ─── TAB: ATTENDANCE ──────────────────────────────────── */}
        {tab === 'attendance' && (
          <div style={{ marginTop: 16 }}>
            <h3>Attendance & QR Scanner</h3>

            {scanResult && (
              <p style={{ padding: 8, background: scanResult.startsWith('✅') ? '#e8f5e9' : '#ffebee', borderRadius: 4, fontSize: 13, marginBottom: 12 }}>
                {scanResult}
              </p>
            )}

            {/* Scanner options */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
              {/* Camera scanning */}
              <div style={{ flex: 1, minWidth: 200, padding: 12, border: '1px solid #ddd', borderRadius: 8 }}>
                <h4 style={{ margin: '0 0 8px' }}>Camera Scan</h4>
                {!scanning ? (
                  <button onClick={startCamera} style={{ padding: '6px 16px', cursor: 'pointer', background: '#2196F3', color: '#fff', border: 'none', borderRadius: 4 }}>Start Camera</button>
                ) : (
                  <button onClick={stopCamera} style={{ padding: '6px 16px', cursor: 'pointer', background: '#f44336', color: '#fff', border: 'none', borderRadius: 4 }}>Stop Camera</button>
                )}
                <div style={{ marginTop: 8 }}>
                  <video ref={videoRef} style={{ width: '100%', maxWidth: 300, display: scanning ? 'block' : 'none' }} />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                </div>
              </div>

              {/* File upload */}
              <div style={{ flex: 1, minWidth: 200, padding: 12, border: '1px solid #ddd', borderRadius: 8 }}>
                <h4 style={{ margin: '0 0 8px' }}>Upload QR Image</h4>
                <input type="file" accept="image/*" onChange={handleFileUpload} />
              </div>

              {/* Manual entry */}
              <div style={{ flex: 1, minWidth: 200, padding: 12, border: '1px solid #ddd', borderRadius: 8 }}>
                <h4 style={{ margin: '0 0 8px' }}>Manual Ticket ID</h4>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input value={manualTicket} onChange={e => setManualTicket(e.target.value)} placeholder="Paste ticket ID..." style={{ flex: 1, padding: 6 }} onKeyDown={e => e.key === 'Enter' && handleManualCheckin()} />
                  <button onClick={handleManualCheckin} style={{ padding: '6px 12px', cursor: 'pointer' }}>Check In</button>
                </div>
              </div>
            </div>

            {/* Attendance stats */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <div style={{ padding: 10, background: '#e8f5e9', borderRadius: 6, textAlign: 'center', minWidth: 100 }}>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{attendanceStats.checkedIn}</div>
                <div style={{ fontSize: 11 }}>Checked In</div>
              </div>
              <div style={{ padding: 10, background: '#e3f2fd', borderRadius: 6, textAlign: 'center', minWidth: 100 }}>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{attendanceStats.total}</div>
                <div style={{ fontSize: 11 }}>Registered</div>
              </div>
              <div style={{ padding: 10, background: '#fff3e0', borderRadius: 6, textAlign: 'center', minWidth: 100 }}>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{attendanceStats.total > 0 ? Math.round(attendanceStats.checkedIn / attendanceStats.total * 100) : 0}%</div>
                <div style={{ fontSize: 11 }}>Rate</div>
              </div>
              <div style={{ padding: 10, background: '#ffebee', borderRadius: 6, textAlign: 'center', minWidth: 100 }}>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{attendanceStats.notCheckedIn}</div>
                <div style={{ fontSize: 11 }}>Not Scanned</div>
              </div>
              <button onClick={handleAttendanceExport} style={{ padding: '6px 14px', cursor: 'pointer', fontSize: 12, alignSelf: 'center' }}>Export Attendance CSV</button>
            </div>

            {/* Checked-in list */}
            <h4 style={{ margin: '16px 0 8px' }}>Checked In ({checkedInList.length})</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: 6 }}>Name</th>
                  <th style={{ padding: 6 }}>Email</th>
                  <th style={{ padding: 6 }}>Ticket ID</th>
                  <th style={{ padding: 6 }}>Checked In At</th>
                  <th style={{ padding: 6 }}>Note</th>
                </tr>
              </thead>
              <tbody>
                {checkedInList.map((a, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #eee', background: '#f0fff0' }}>
                    <td style={{ padding: 6 }}>{a.name || 'N/A'}</td>
                    <td style={{ padding: 6 }}>{a.email || ''}</td>
                    <td style={{ padding: 6, fontSize: 11 }}>{a.ticketId?.slice(0, 8)}...</td>
                    <td style={{ padding: 6 }}>{a.checkedAt ? new Date(a.checkedAt).toLocaleString() : '-'}</td>
                    <td style={{ padding: 6, fontSize: 11 }}>{a.note || '-'}</td>
                  </tr>
                ))}
                {checkedInList.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: 12, textAlign: 'center', color: '#888' }}>No one checked in yet</td></tr>
                )}
              </tbody>
            </table>

            {/* Not-yet-scanned list */}
            <h4 style={{ margin: '20px 0 8px' }}>Not Yet Scanned ({notCheckedInList.length})</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: 6 }}>Name</th>
                  <th style={{ padding: 6 }}>Email</th>
                  <th style={{ padding: 6 }}>Ticket ID</th>
                  <th style={{ padding: 6 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {notCheckedInList.map((a, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: 6 }}>{a.name || 'N/A'}</td>
                    <td style={{ padding: 6 }}>{a.email || ''}</td>
                    <td style={{ padding: 6, fontSize: 11 }}>{a.ticketId?.slice(0, 8)}...</td>
                    <td style={{ padding: 6 }}>
                      <button onClick={async () => {
                        try {
                          const res = await API.post(`/events/manual-checkin/${id}/${a.ticketId}`, { note: 'Manual check-in from dashboard' });
                          setScanResult(`✅ ${res.data.msg}`);
                          fetchAttendance();
                          fetchEvent();
                        } catch (err) { setScanResult(`❌ ${err.response?.data?.msg || 'Failed'}`); }
                      }} style={{ padding: '3px 10px', cursor: 'pointer', fontSize: 11, background: '#4CAF50', color: '#fff', border: 'none', borderRadius: 3 }}>Check In</button>
                    </td>
                  </tr>
                ))}
                {notCheckedInList.length === 0 && (
                  <tr><td colSpan={4} style={{ padding: 12, textAlign: 'center', color: '#888' }}>All participants checked in!</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
