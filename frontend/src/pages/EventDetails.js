import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api';
import Navbar from '../components/Navbar';

export default function EventDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regMsg, setRegMsg] = useState('');
  const [regError, setRegError] = useState('');
  const [formAnswers, setFormAnswers] = useState({});
  const [merchOpts, setMerchOpts] = useState({ size: '', color: '', variant: '', quantity: 1 });
  const [paymentProof, setPaymentProof] = useState('');
  const [registrationResult, setRegistrationResult] = useState(null);

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyText, setReplyText] = useState({});
  const [showReplies, setShowReplies] = useState({});
  const [newMsgCount, setNewMsgCount] = useState(0);
  const [, setLastSeenCount] = useState(0);
  const pollRef = useRef(null);

  const [feedbacks, setFeedbacks] = useState([]);
  const [feedbackStats, setFeedbackStats] = useState(null);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [ratingFilter, setRatingFilter] = useState(0);

  useEffect(() => {
    API.get(`/events/${id}`)
      .then(res => { setEvent(res.data.event); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, [id]);

  const fetchMessages = useCallback(() => {
    API.get(`/discussions/${id}`).then(r => {
      const msgs = r.data.messages || [];
      setMessages(prev => {
        if (prev.length > 0 && msgs.length > prev.length) {
          setNewMsgCount(c => c + (msgs.length - prev.length));
        }
        return msgs;
      });
    }).catch(() => {});
  }, [id]);

  useEffect(() => {
    fetchMessages();
    pollRef.current = setInterval(fetchMessages, 5000);
    return () => clearInterval(pollRef.current);
  }, [fetchMessages]);

  useEffect(() => {
    API.get(`/feedback/${id}`).then(r => {
      setFeedbacks(r.data.feedbacks || []);
      setFeedbackStats({ avg: r.data.avgRating, total: r.data.totalRatings, distribution: r.data.distribution });
    }).catch(() => {});
  }, [id]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setRegError('File too large (max 5MB)'); return; }
    const reader = new FileReader();
    reader.onloadend = () => setPaymentProof(reader.result);
    reader.readAsDataURL(file);
  };

  if (loading) return <><Navbar /><div style={{ padding: 40, textAlign: 'center' }}>Loading...</div></>;
  if (!event) return <><Navbar /><div style={{ padding: 40, textAlign: 'center' }}>Event not found.</div></>;

  const now = new Date();
  const deadlinePassed = event.registrationDeadline && new Date(event.registrationDeadline) < now;
  const confirmedCount = (event.registrations || []).filter(r => r.status === 'confirmed').length;
  const limitReached = event.registrationLimit > 0 && confirmedCount >= event.registrationLimit;
  const outOfStock = event.eventType === 'merchandise' && event.stockQuantity <= 0;
  const alreadyRegistered = (event.registrations || []).some(
    r => r.participant?._id === user?.id && (r.status === 'confirmed' || r.status === 'pending_approval')
  );

  const canRegister = user?.role === 'participant' && !deadlinePassed && !limitReached && !outOfStock && !alreadyRegistered;

  const handleRegister = async () => {
    setRegMsg(''); setRegError(''); setRegistrationResult(null);
    try {
      let body;
      if (event.eventType === 'normal') {
        body = { formAnswers };
      } else {
        if (!paymentProof) { setRegError('Payment proof image is required'); return; }
        body = { ...merchOpts, paymentProof };
      }
      const res = await API.post(`/events/${id}/register`, body);
      setRegMsg(res.data.msg);
      setRegistrationResult({
        ticketId: res.data.ticketId,
        qrDataUrl: res.data.qrDataUrl || null,
        status: res.data.status || 'confirmed',
      });
      const updated = await API.get(`/events/${id}`);
      setEvent(updated.data.event);
    } catch (err) {
      setRegError(err.response?.data?.msg || 'Registration failed');
    }
  };

  const handlePostMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      await API.post(`/discussions/${id}`, { text: newMessage });
      setNewMessage('');
      fetchMessages();
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to post');
    }
  };

  const handleReply = async (messageId) => {
    if (!replyText[messageId]?.trim()) return;
    try {
      await API.post(`/discussions/${id}/${messageId}/reply`, { text: replyText[messageId] });
      setReplyText({ ...replyText, [messageId]: '' });
      fetchMessages();
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to reply');
    }
  };

  const handleReact = async (messageId, emoji) => {
    try {
      await API.put(`/discussions/${id}/${messageId}/react`, { emoji });
      fetchMessages();
    } catch (err) {}
  };

  const handleDeleteMsg = async (messageId) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      await API.delete(`/discussions/${id}/${messageId}`);
      fetchMessages();
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed');
    }
  };

  const handlePin = async (messageId) => {
    try {
      await API.put(`/discussions/${id}/${messageId}/pin`);
      fetchMessages();
    } catch (err) {}
  };

  const handleSubmitFeedback = async () => {
    if (myRating === 0) { setFeedbackMsg('Please select a rating'); return; }
    try {
      await API.post(`/feedback/${id}`, { rating: myRating, comment: myComment });
      setFeedbackMsg('Feedback submitted!');
      const r = await API.get(`/feedback/${id}`);
      setFeedbacks(r.data.feedbacks || []);
      setFeedbackStats({ avg: r.data.avgRating, total: r.data.totalRatings, distribution: r.data.distribution });
    } catch (err) {
      setFeedbackMsg(err.response?.data?.msg || 'Failed');
    }
  };

  const isOrganizer = user?.role === 'organizer' && event.organizer?._id === user?.id;
  const isRegistered = (event.registrations || []).some(r => r.participant?._id === user?.id && (r.status === 'confirmed' || r.status === 'pending_approval'));

  const pendingOrder = (event.registrations || []).find(
    r => r.participant?._id === user?.id && r.status === 'pending_approval'
  );

  return (
    <>
      <Navbar />
      <div style={{ maxWidth: 650, margin: '20px auto', padding: 20 }}>
        <button onClick={() => navigate(-1)} style={{ marginBottom: 12, cursor: 'pointer' }}>&larr; Back</button>

        <h2>{event.title}</h2>
        <span style={{ fontSize: 12, background: event.eventType === 'merchandise' ? '#FF9800' : '#2196F3', color: '#fff', padding: '2px 8px', borderRadius: 4 }}>
          {event.eventType}
        </span>

        <div style={{ marginTop: 16 }}>
          <p>{event.description}</p>
          <p><strong>Organizer:</strong> {event.organizer?.organizerName || '-'}</p>
          <p><strong>Start:</strong> {event.startDate ? new Date(event.startDate).toLocaleString() : 'TBA'}</p>
          <p><strong>End:</strong> {event.endDate ? new Date(event.endDate).toLocaleString() : 'TBA'}</p>
          <p><strong>Venue:</strong> {event.venue || 'TBA'}</p>
          <p><strong>Eligibility:</strong> {event.eligibility || 'all'}</p>
          <p><strong>Registration Deadline:</strong> {event.registrationDeadline ? new Date(event.registrationDeadline).toLocaleString() : 'None'}</p>
          <p><strong>Registration Limit:</strong> {event.registrationLimit || 'Unlimited'} (Registered: {confirmedCount})</p>
          {event.registrationFee > 0 && <p><strong>Fee:</strong> ₹{event.registrationFee}</p>}
          {event.tags?.length > 0 && <p><strong>Tags:</strong> {event.tags.join(', ')}</p>}
        </div>

        {event.eventType === 'merchandise' && (
          <div style={{ marginTop: 16, padding: 12, background: '#fff8e1', borderRadius: 6 }}>
            <h3>Item Details</h3>
            <p><strong>Price:</strong> ₹{event.price}</p>
            <p><strong>Item Type:</strong> {event.itemType || '-'}</p>
            {event.sizes?.length > 0 && <p><strong>Sizes:</strong> {event.sizes.join(', ')}</p>}
            {event.colors?.length > 0 && <p><strong>Colors:</strong> {event.colors.join(', ')}</p>}
            {event.variants?.length > 0 && <p><strong>Variants:</strong> {event.variants.join(', ')}</p>}
            <p><strong>Stock:</strong> {event.stockQuantity > 0 ? event.stockQuantity : 'Out of stock'}</p>
            <p><strong>Max per person:</strong> {event.purchaseLimitPerUser}</p>
          </div>
        )}

        {pendingOrder && (
          <div style={{ marginTop: 12, padding: 12, background: '#fff3e0', border: '1px solid #FF9800', borderRadius: 6 }}>
            <strong>Order Status:</strong> Pending Approval (Ticket: {pendingOrder.ticketId?.slice(0, 8)}...)
          </div>
        )}

        {user?.role === 'participant' && (
          <div style={{ marginTop: 20, padding: 16, border: '1px solid #ddd', borderRadius: 6 }}>
            <h3>Register / Purchase</h3>

            {regMsg && <p style={{ color: 'green' }}>{regMsg}</p>}
            {regError && <p style={{ color: 'red' }}>{regError}</p>}

            {registrationResult && (
              <div style={{ padding: 16, border: '2px solid #4CAF50', borderRadius: 8, marginBottom: 16, background: '#f0fff0', textAlign: 'center' }}>
                <h3 style={{ color: '#4CAF50', margin: '0 0 12px' }}>
                  {registrationResult.status === 'pending_approval' ? '⏳ Order Placed — Pending Approval' : '✅ Registration Confirmed!'}
                </h3>
                <p style={{ margin: '4px 0', fontFamily: 'monospace', fontSize: 13 }}>
                  <strong>Ticket ID:</strong> {registrationResult.ticketId}
                </p>
                {registrationResult.qrDataUrl && (
                  <div style={{ margin: '12px 0' }}>
                    <img src={registrationResult.qrDataUrl} alt="QR Code" style={{ width: 180, height: 180 }} />
                    <p style={{ fontSize: 12, color: '#666', margin: '8px 0 0' }}>Present this QR code at the venue</p>
                  </div>
                )}
                {registrationResult.status === 'pending_approval' && (
                  <p style={{ fontSize: 13, color: '#FF9800', margin: '8px 0 0' }}>
                    QR code will be generated once your payment is approved by the organizer.
                  </p>
                )}
                {registrationResult.status === 'confirmed' && (
                  <p style={{ fontSize: 12, color: '#666', margin: '8px 0 0' }}>
                    📧 A confirmation email with your ticket has been sent to your email address.
                  </p>
                )}
                <button onClick={() => navigate(`/ticket/${registrationResult.ticketId}`)}
                  style={{ marginTop: 12, padding: '8px 20px', cursor: 'pointer', background: '#2196F3', color: '#fff', border: 'none', borderRadius: 4 }}>
                  View Full Ticket
                </button>
              </div>
            )}

            {deadlinePassed && <p style={{ color: 'red' }}>Registration deadline has passed.</p>}
            {limitReached && <p style={{ color: 'red' }}>Registration limit reached.</p>}
            {outOfStock && <p style={{ color: 'red' }}>Out of stock.</p>}
            {alreadyRegistered && <p style={{ color: '#2196F3' }}>You are already registered for this event.</p>}

            {canRegister && event.eventType === 'normal' && event.customFormFields?.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                {event.customFormFields.map(f => (
                  <div key={f._id} style={{ marginBottom: 8 }}>
                    <label>{f.label} {f.required && '*'}</label><br />
                    {f.fieldType === 'select' ? (
                      <select value={formAnswers[f.label] || ''} onChange={e => setFormAnswers({ ...formAnswers, [f.label]: e.target.value })} required={f.required} style={{ padding: 6, width: '100%' }}>
                        <option value="">Select...</option>
                        {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : f.fieldType === 'textarea' ? (
                      <textarea value={formAnswers[f.label] || ''} onChange={e => setFormAnswers({ ...formAnswers, [f.label]: e.target.value })} required={f.required} style={{ padding: 6, width: '100%' }} />
                    ) : f.fieldType === 'checkbox' ? (
                      <input type="checkbox" checked={formAnswers[f.label] || false} onChange={e => setFormAnswers({ ...formAnswers, [f.label]: e.target.checked })} />
                    ) : (
                      <input type={f.fieldType || 'text'} value={formAnswers[f.label] || ''} onChange={e => setFormAnswers({ ...formAnswers, [f.label]: e.target.value })} required={f.required} style={{ padding: 6, width: '100%' }} />
                    )}
                  </div>
                ))}
              </div>
            )}

            {canRegister && event.eventType === 'merchandise' && (
              <div style={{ marginBottom: 12 }}>
                {event.sizes?.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <label>Size</label><br />
                    <select value={merchOpts.size} onChange={e => setMerchOpts({ ...merchOpts, size: e.target.value })} style={{ padding: 6 }}>
                      <option value="">Select size</option>
                      {event.sizes.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}
                {event.colors?.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <label>Color</label><br />
                    <select value={merchOpts.color} onChange={e => setMerchOpts({ ...merchOpts, color: e.target.value })} style={{ padding: 6 }}>
                      <option value="">Select color</option>
                      {event.colors.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                )}
                {event.variants?.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <label>Variant</label><br />
                    <select value={merchOpts.variant} onChange={e => setMerchOpts({ ...merchOpts, variant: e.target.value })} style={{ padding: 6 }}>
                      <option value="">Select variant</option>
                      {event.variants.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                )}
                <div style={{ marginBottom: 8 }}>
                  <label>Quantity</label><br />
                  <input type="number" min="1" max={event.purchaseLimitPerUser || 99} value={merchOpts.quantity} onChange={e => setMerchOpts({ ...merchOpts, quantity: parseInt(e.target.value) || 1 })} style={{ padding: 6, width: 80 }} />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label><strong>Payment Proof (required)</strong></label><br />
                  <input type="file" accept="image/*" onChange={handleFileChange} style={{ marginTop: 4 }} />
                  {paymentProof && <p style={{ fontSize: 11, color: 'green', margin: '4px 0' }}>Image attached</p>}
                </div>
              </div>
            )}

            {canRegister && (
              <button onClick={handleRegister} style={{ padding: '8px 24px', cursor: 'pointer', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: 4 }}>
                {event.eventType === 'merchandise' ? 'Purchase' : 'Register'}
              </button>
            )}
          </div>
        )}

        <div style={{ marginTop: 30, padding: 16, border: '1px solid #ddd', borderRadius: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Discussion Forum</h3>
            {newMsgCount > 0 && (
              <span
                onClick={() => { setNewMsgCount(0); setLastSeenCount(messages.length); }}
                style={{ cursor: 'pointer', background: '#f44336', color: '#fff', padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}
              >
                {newMsgCount} new message{newMsgCount > 1 ? 's' : ''} — Click to dismiss
              </span>
            )}
          </div>

          {(isRegistered || isOrganizer) && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Write a message..." style={{ flex: 1, padding: 8 }} onKeyDown={e => e.key === 'Enter' && handlePostMessage()} />
              <button onClick={handlePostMessage} style={{ padding: '8px 16px', cursor: 'pointer', background: '#2196F3', color: '#fff', border: 'none', borderRadius: 4 }}>Post</button>
            </div>
          )}

          {messages.length === 0 && <p style={{ color: '#888', fontSize: 13 }}>No messages yet.</p>}

          {messages.map(m => (
            <div key={m._id} style={{ marginBottom: 12, padding: 10, background: m.pinned ? '#fffde7' : m.isAnnouncement ? '#e3f2fd' : '#f9f9f9', borderRadius: 6, borderLeft: m.pinned ? '3px solid #FFC107' : m.isAnnouncement ? '3px solid #2196F3' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: 13 }}>
                  {m.user?.firstName || m.user?.organizerName || 'User'}
                  {m.isAnnouncement && <span style={{ fontSize: 11, color: '#1565C0', marginLeft: 6 }}>[Announcement]</span>}
                  {m.pinned && <span style={{ fontSize: 11, color: '#F57F17', marginLeft: 6 }}>[Pinned]</span>}
                </strong>
                <span style={{ fontSize: 11, color: '#888' }}>{new Date(m.createdAt).toLocaleString()}</span>
              </div>
              <p style={{ margin: '6px 0', fontSize: 14 }}>{m.text}</p>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                {['👍', '❤️', '😂'].map(emoji => {
                  const reactionUsers = m.reactions?.get ? m.reactions.get(emoji) : (m.reactions?.[emoji] || []);
                  const count = Array.isArray(reactionUsers) ? reactionUsers.length : 0;
                  return (
                    <button key={emoji} onClick={() => handleReact(m._id, emoji)} style={{ cursor: 'pointer', background: 'none', border: '1px solid #ddd', borderRadius: 12, padding: '2px 8px', fontSize: 13 }}>
                      {emoji} {count > 0 && count}
                    </button>
                  );
                })}

                <button onClick={() => setShowReplies({ ...showReplies, [m._id]: !showReplies[m._id] })} style={{ cursor: 'pointer', background: 'none', border: 'none', color: '#2196F3', fontSize: 12, marginLeft: 8 }}>
                  Replies ({m.replies?.length || 0})
                </button>

                {isOrganizer && (
                  <>
                    <button onClick={() => handlePin(m._id)} style={{ cursor: 'pointer', background: 'none', border: 'none', color: '#FF9800', fontSize: 12 }}>
                      {m.pinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button onClick={() => handleDeleteMsg(m._id)} style={{ cursor: 'pointer', background: 'none', border: 'none', color: '#f44336', fontSize: 12 }}>
                      Delete
                    </button>
                  </>
                )}
              </div>

              {showReplies[m._id] && (
                <div style={{ marginTop: 8, marginLeft: 16, borderLeft: '2px solid #ddd', paddingLeft: 10 }}>
                  {(m.replies || []).map((r, i) => (
                    <div key={i} style={{ marginBottom: 6, fontSize: 13 }}>
                      <strong>{r.user?.firstName || r.user?.organizerName || 'User'}</strong>
                      <span style={{ color: '#888', fontSize: 11, marginLeft: 6 }}>{new Date(r.createdAt).toLocaleString()}</span>
                      <p style={{ margin: '2px 0' }}>{r.text}</p>
                    </div>
                  ))}
                  {(isRegistered || isOrganizer) && (
                    <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                      <input value={replyText[m._id] || ''} onChange={e => setReplyText({ ...replyText, [m._id]: e.target.value })} placeholder="Reply..." style={{ flex: 1, padding: 4, fontSize: 12 }} onKeyDown={e => e.key === 'Enter' && handleReply(m._id)} />
                      <button onClick={() => handleReply(m._id)} style={{ padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>Reply</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 24, padding: 16, border: '1px solid #ddd', borderRadius: 6 }}>
          <h3>Feedback</h3>

          {feedbackStats && feedbackStats.total > 0 && (
            <div style={{ marginBottom: 12, padding: 10, background: '#f5f5f5', borderRadius: 6 }}>
              <strong>Average Rating:</strong> {'★'.repeat(Math.round(feedbackStats.avg))}{'☆'.repeat(5 - Math.round(feedbackStats.avg))} ({feedbackStats.avg?.toFixed(1)}/5)
              <span style={{ marginLeft: 12, fontSize: 13, color: '#888' }}>{feedbackStats.total} review{feedbackStats.total !== 1 ? 's' : ''}</span>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                {[5, 4, 3, 2, 1].map(s => (
                  <span key={s} style={{ marginRight: 10 }}>{s}★: {feedbackStats.distribution?.[s - 1] || 0}</span>
                ))}
              </div>
            </div>
          )}

          {user?.role === 'participant' && isRegistered && ['completed', 'closed'].includes(event.status) && (
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 13 }}>Rate this event (anonymous):</p>
              <div style={{ marginBottom: 6 }}>
                {[1, 2, 3, 4, 5].map(s => (
                  <span key={s} onClick={() => setMyRating(s)} style={{ cursor: 'pointer', fontSize: 24, color: s <= myRating ? '#FFC107' : '#ddd' }}>★</span>
                ))}
              </div>
              <textarea value={myComment} onChange={e => setMyComment(e.target.value)} placeholder="Optional comment..." rows={2} style={{ width: '100%', padding: 6, marginBottom: 6 }} />
              <button onClick={handleSubmitFeedback} style={{ padding: '6px 16px', cursor: 'pointer' }}>Submit Feedback</button>
              {feedbackMsg && <p style={{ fontSize: 12, color: feedbackMsg.includes('submitted') ? 'green' : 'red', marginTop: 4 }}>{feedbackMsg}</p>}
            </div>
          )}

          {feedbacks.length > 0 && (
            <div>
              <div style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                <label style={{ fontSize: 13 }}>Filter by rating:</label>
                <select value={ratingFilter} onChange={e => setRatingFilter(Number(e.target.value))} style={{ padding: 4, fontSize: 13 }}>
                  <option value={0}>All Ratings</option>
                  <option value={5}>5 Stars</option>
                  <option value={4}>4 Stars</option>
                  <option value={3}>3 Stars</option>
                  <option value={2}>2 Stars</option>
                  <option value={1}>1 Star</option>
                </select>
              </div>
              {feedbacks
                .filter(f => ratingFilter === 0 || f.rating === ratingFilter)
                .slice(0, 20)
                .map((f, i) => (
                <div key={i} style={{ marginBottom: 8, padding: 8, background: '#fafafa', borderRadius: 4, fontSize: 13 }}>
                  <span style={{ color: '#FFC107' }}>{'★'.repeat(f.rating)}{'☆'.repeat(5 - f.rating)}</span>
                  {f.comment && <p style={{ margin: '4px 0 0' }}>{f.comment}</p>}
                </div>
              ))}
              {feedbacks.filter(f => ratingFilter === 0 || f.rating === ratingFilter).length === 0 && (
                <p style={{ fontSize: 13, color: '#888' }}>No feedback matching this filter.</p>
              )}
            </div>
          )}
          {feedbacks.length === 0 && <p style={{ fontSize: 13, color: '#888' }}>No feedback yet.</p>}
        </div>
      </div>
    </>
  );
}
