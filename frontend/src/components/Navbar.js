import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = () => { logout(); navigate('/login'); };

  const linkStyle = { marginRight: 16, textDecoration: 'none', color: '#333', fontWeight: 500 };

  let links = [];
  let displayName = '';

  if (user.role === 'participant') {
    links = [
      { to: '/dashboard', label: 'Dashboard' },
      { to: '/browse', label: 'Browse Events' },
      { to: '/clubs', label: 'Clubs / Organizers' },
      { to: '/profile', label: 'Profile' },
    ];
    displayName = `${user.firstName} ${user.lastName}`;
  } else if (user.role === 'organizer') {
    links = [
      { to: '/organizer', label: 'Dashboard' },
      { to: '/organizer/create-event', label: 'Create Event' },
      { to: '/organizer/ongoing', label: 'Ongoing Events' },
      { to: '/organizer/profile', label: 'Profile' },
    ];
    displayName = user.organizerName || user.name;
  } else if (user.role === 'admin') {
    links = [
      { to: '/admin', label: 'Dashboard' },
      { to: '/admin/manage', label: 'Manage Clubs/Organizers' },
      { to: '/admin/password-requests', label: 'Password Requests' },
    ];
    displayName = 'Admin';
  }

  return (
    <nav style={{ padding: '10px 20px', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa' }}>
      <div>
        {links.map(l => (
          <Link key={l.to} to={l.to} style={linkStyle}>{l.label}</Link>
        ))}
      </div>
      <div>
        <span style={{ marginRight: 12, fontSize: 13, color: '#666' }}>{displayName}</span>
        <button onClick={handleLogout} style={{ padding: '4px 14px', cursor: 'pointer' }}>Logout</button>
      </div>
    </nav>
  );
}
