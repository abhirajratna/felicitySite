import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api';
import Navbar from '../components/Navbar';

export default function TicketView() {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get(`/events/my/ticket/${ticketId}`)
      .then(res => { setData(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [ticketId]);

  if (loading) return <><Navbar /><div style={{ padding: 40, textAlign: 'center' }}>Loading...</div></>;
  if (!data) return <><Navbar /><div style={{ padding: 40, textAlign: 'center' }}>Ticket not found.</div></>;

  const { ticket, event, participant, qrDataUrl } = data;

  return (
    <>
      <Navbar />
      <div style={{ maxWidth: 500, margin: '20px auto', padding: 20, border: '2px solid #333', borderRadius: 8 }}>
        <button onClick={() => navigate(-1)} style={{ marginBottom: 12, cursor: 'pointer' }}>&larr; Back</button>
        <h2 style={{ textAlign: 'center' }}>Event Ticket</h2>

        {/* Status banner */}
        {ticket.status === 'pending_approval' && (
          <div style={{ textAlign: 'center', padding: 10, background: '#fff3e0', border: '1px solid #FF9800', borderRadius: 6, marginBottom: 16 }}>
            <strong style={{ color: '#FF9800' }}>⏳ Pending Approval</strong>
            <p style={{ fontSize: 12, color: '#888', margin: '4px 0 0' }}>Your payment is being reviewed. QR code will be generated upon approval.</p>
          </div>
        )}
        {ticket.status === 'rejected' && (
          <div style={{ textAlign: 'center', padding: 10, background: '#ffebee', border: '1px solid #f44336', borderRadius: 6, marginBottom: 16 }}>
            <strong style={{ color: '#f44336' }}>❌ Payment Rejected</strong>
            <p style={{ fontSize: 12, color: '#888', margin: '4px 0 0' }}>Your payment was rejected. Please contact the organizer or submit a new order.</p>
          </div>
        )}

        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          {ticket.status === 'confirmed' && qrDataUrl && <img src={qrDataUrl} alt="QR Code" style={{ width: 180, height: 180 }} />}
          {ticket.status !== 'confirmed' && (
            <div style={{ width: 180, height: 180, margin: '0 auto', background: '#f5f5f5', border: '2px dashed #ccc', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: 13 }}>
              QR code not available
            </div>
          )}
        </div>

        <table style={{ width: '100%' }}>
          <tbody>
            <tr><td><strong>Ticket ID</strong></td><td style={{ fontFamily: 'monospace', fontSize: 12 }}>{ticket.ticketId}</td></tr>
            <tr><td><strong>Status</strong></td><td style={{ color: ticket.status === 'confirmed' ? 'green' : ticket.status === 'pending_approval' ? '#FF9800' : ticket.status === 'rejected' ? 'red' : '#333' }}>{ticket.status === 'pending_approval' ? 'Pending Approval' : ticket.status}</td></tr>
            <tr><td><strong>Event</strong></td><td>{event.title}</td></tr>
            <tr><td><strong>Type</strong></td><td>{event.eventType}</td></tr>
            <tr><td><strong>Date</strong></td><td>{event.startDate ? new Date(event.startDate).toLocaleString() : 'TBA'}</td></tr>
            <tr><td><strong>Venue</strong></td><td>{event.venue || 'TBA'}</td></tr>
            <tr><td><strong>Organizer</strong></td><td>{event.organizer?.organizerName || '-'}</td></tr>
            <tr><td><strong>Participant</strong></td><td>{participant?.firstName} {participant?.lastName}</td></tr>
            <tr><td><strong>Email</strong></td><td>{participant?.email}</td></tr>
            {ticket.size && <tr><td><strong>Size</strong></td><td>{ticket.size}</td></tr>}
            {ticket.color && <tr><td><strong>Color</strong></td><td>{ticket.color}</td></tr>}
            {ticket.variant && <tr><td><strong>Variant</strong></td><td>{ticket.variant}</td></tr>}
            {ticket.quantity > 1 && <tr><td><strong>Quantity</strong></td><td>{ticket.quantity}</td></tr>}
            <tr><td><strong>Registered At</strong></td><td>{ticket.registeredAt ? new Date(ticket.registeredAt).toLocaleString() : '-'}</td></tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
