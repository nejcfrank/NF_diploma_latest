import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styling/Navbar.css'; // Adjust the path as necessary

const Navbar = ({ token, isLoginPage }) => {
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
    if (!isLoginPage) {
      navigate('/homepage');
    }
  };

  const isActive = (path) => (location.pathname === path ? 'nav-item active' : 'nav-item');

  // Access user metadata
  const userMetaData = token?.user?.user_metadata;
  const isAdmin = userMetaData?.role === 'admin';

  return (
    <nav className="navbar">
      <div className="nav-left">
        {/* Conditionally disable logo click if on login or signup page */}
        <div 
          className="logo" 
          onClick={isLoginPage ? null : navigateToHome} 
          style={{ cursor: isLoginPage ? 'default' : 'pointer' }}
        />
      </div>
      <div className="nav-right">
        {!isLoginPage && (
          <>
            <div className={isActive('/homepage')} onClick={() => navigate('/homepage')}>
              Events
            </div>
            {isAdmin && (
              <div className={isActive('/create-event')} onClick={navigateToCreateEvent}>
                Create Event
              </div>
            )}
            <div className="nav-item" onClick={handleLogout}>
              Logout
            </div>
            <div className="avatar-container">
              <div className="avatar" />
              <div className="tooltip">{userMetaData?.full_name}</div>
            </div>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
