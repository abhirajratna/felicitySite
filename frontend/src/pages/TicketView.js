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

        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          {qrDataUrl && <img src={qrDataUrl} alt="QR Code" style={{ width: 180, height: 180 }} />}
        </div>

        <table style={{ width: '100%' }}>
          <tbody>
            <tr><td><strong>Ticket ID</strong></td><td>{ticket.ticketId}</td></tr>
            <tr><td><strong>Status</strong></td><td>{ticket.status}</td></tr>
            <tr><td><strong>Event</strong></td><td>{event.title}</td></tr>
            <tr><td><strong>Type</strong></td><td>{event.eventType}</td></tr>
            <tr><td><strong>Date</strong></td><td>{event.startDate ? new Date(event.startDate).toLocaleString() : 'TBA'}</td></tr>
            <tr><td><strong>Venue</strong></td><td>{event.venue || 'TBA'}</td></tr>
            <tr><td><strong>Organizer</strong></td><td>{event.organizer?.organizerName || '-'}</td></tr>
            <tr><td><strong>Participant</strong></td><td>{participant?.firstName} {participant?.lastName}</td></tr>
            <tr><td><strong>Email</strong></td><td>{participant?.email}</td></tr>
            {ticket.size && <tr><td><strong>Size</strong></td><td>{ticket.size}</td></tr>}
            {ticket.color && <tr><td><strong>Color</strong></td><td>{ticket.color}</td></tr>}
            {ticket.quantity > 1 && <tr><td><strong>Quantity</strong></td><td>{ticket.quantity}</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
