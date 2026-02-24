import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../api';
import Navbar from '../components/Navbar';

export default function BrowseEvents() {
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [eligibility, setEligibility] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [followedOnly, setFollowedOnly] = useState(false);
  const [showTrending, setShowTrending] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchEvents = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (type) params.append('type', type);
    if (eligibility) params.append('eligibility', eligibility);
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    if (followedOnly) params.append('followedOnly', 'true');
    if (showTrending) params.append('trending', 'true');

    API.get(`/events?${params.toString()}`)
      .then(res => { setEvents(res.data.events); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchEvents(); }, [showTrending, followedOnly]); // eslint-disable-line

  const handleSearch = (e) => { e.preventDefault(); fetchEvents(); };

  return (
    <>
      <Navbar />
      <div style={{ maxWidth: 800, margin: '20px auto', padding: 20 }}>
        <h2>Browse Events</h2>

        <form onSubmit={handleSearch} style={{ marginBottom: 16 }}>
          <input
            placeholder="Search events or organizers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: 8, width: 300, marginRight: 8 }}
          />
          <button type="submit" style={{ padding: '8px 16px', cursor: 'pointer' }}>Search</button>
        </form>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
          <select value={type} onChange={e => setType(e.target.value)} style={{ padding: 6 }}>
            <option value="">All Types</option>
            <option value="normal">Normal</option>
            <option value="merchandise">Merchandise</option>
          </select>
          <select value={eligibility} onChange={e => setEligibility(e.target.value)} style={{ padding: 6 }}>
            <option value="">All Eligibility</option>
            <option value="iiit">IIIT Only</option>
            <option value="non-iiit">Non-IIIT Only</option>
          </select>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ padding: 6 }} placeholder="From" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ padding: 6 }} placeholder="To" />
          <label style={{ fontSize: 13 }}>
            <input type="checkbox" checked={followedOnly} onChange={e => setFollowedOnly(e.target.checked)} /> Followed Clubs
          </label>
          <label style={{ fontSize: 13 }}>
            <input type="checkbox" checked={showTrending} onChange={e => setShowTrending(e.target.checked)} /> Trending (Top 5)
          </label>
          <button onClick={fetchEvents} style={{ padding: '6px 14px', cursor: 'pointer' }}>Apply</button>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : events.length === 0 ? (
          <p style={{ color: '#888' }}>No events found.</p>
        ) : (
          <div>
            {events.map(e => (
              <div key={e._id} style={{ border: '1px solid #ddd', borderRadius: 6, padding: 14, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <Link to={`/events/${e._id}`} style={{ fontWeight: 600, fontSize: 16 }}>{e.title}</Link>
                    <span style={{ marginLeft: 8, fontSize: 12, background: e.eventType === 'merchandise' ? '#FF9800' : '#2196F3', color: '#fff', padding: '2px 8px', borderRadius: 4 }}>
                      {e.eventType}
                    </span>
                    {e.trendScore !== undefined && (
                      <span style={{ marginLeft: 6, fontSize: 11, color: '#e91e63' }}>🔥 {e.trendScore} views</span>
                    )}
                    {e.recommendationScore > 0 && (
                      <span style={{ marginLeft: 6, fontSize: 11, background: '#4CAF50', color: '#fff', padding: '1px 6px', borderRadius: 4 }}>⭐ Recommended</span>
                    )}
                  </div>
                  <span style={{ fontSize: 12, color: '#888' }}>
                    {e.startDate ? new Date(e.startDate).toLocaleDateString() : 'TBA'}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: '#555', margin: '6px 0' }}>{e.description?.slice(0, 120)}{e.description?.length > 120 ? '...' : ''}</p>
                <div style={{ fontSize: 12, color: '#888' }}>
                  Organizer: {e.organizer?.organizerName || '-'} | Eligibility: {e.eligibility || 'all'}
                  {e.registrationFee > 0 && ` | Fee: ₹${e.registrationFee}`}
                  {e.tags?.length > 0 && ` | ${e.tags.join(', ')}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
