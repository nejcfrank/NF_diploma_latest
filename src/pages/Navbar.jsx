// src/components/Navbar.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styling/Navbar.css'; // Adjust the path as necessary

const Navbar = ({ token }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    navigate('/');
  };

  const navigateToCreateEvent = () => {
    navigate('/create-event', { state: { token } });
  };

  const navigateToEvents = () => {
    navigate('/homepage');
  };

  const navigateToHome = () => {
    navigate('/homepage');
  };

  return (
    <nav className="navbar">
      <div className="nav-left">
        <div className="nav-item" onClick={navigateToHome}>
          <div className="nav-left"></div>
          <div className="logo"></div>
        </div>
        
      </div>
      <div className="nav-right">
      <div className="nav-item" onClick={navigateToEvents}>
          Events
        </div>
        <div className="nav-item" onClick={navigateToCreateEvent}>
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
