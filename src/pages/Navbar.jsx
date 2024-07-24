// src/components/Navbar.js
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styling/Navbar.css'; // Adjust the path as necessary

const Navbar = ({ token }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    navigate('/');
  };

  const navigateToCreateEvent = () => {
    navigate('/create-event', { state: { token } });
  };

  const navigateToHome = () => {
    navigate('/homepage');
  };

  const isActive = (path) => location.pathname === path ? 'nav-item active' : 'nav-item';

  return (
    <nav className="navbar">
      <div className="nav-left">
        {/* Logo is a clickable div that navigates to homepage */}
        <div className="logo" onClick={navigateToHome} />
      </div>
      <div className="nav-right">
        <div className={isActive('/homepage')} onClick={() => navigate('/homepage')}>
          Events
        </div>
        <div className={isActive('/create-event')} onClick={navigateToCreateEvent}>
          Create Event
        </div>
        <div className="nav-item" onClick={handleLogout}>
          Logout
        </div>
        <div className="avatar-container">
          <div className="avatar" />
          <div className="tooltip">{token?.user?.user_metadata?.full_name}</div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
