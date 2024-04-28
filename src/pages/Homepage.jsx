import React from "react";
import { useNavigate } from "react-router-dom";
import "../styling/Homepage.css"; // Import CSS file

const Homepage = ({ token }) => {
  const navigate = useNavigate();

  function handleLogout() {
    sessionStorage.removeItem("token");
    navigate("/");
  }

  // Dummy event data for showcasing
  const events = [
    { id: 1, title: "Event 1", date: "2024-05-01", location: "Location 1" },
    { id: 2, title: "Event 2", date: "2024-05-05", location: "Location 2" },
    { id: 3, title: "Event 3", date: "2024-05-10", location: "Location 3" },
  ];

  return (
    <div className="homepage-container">
      <div className="header">
        <div className="user-info">
          <span>User: {token.user.user_metadata.full_name}</span>
          <button className="logout-button" onClick={handleLogout}>Logout</button>
        </div>
      </div>
      <div className="events-container">
        <h2>Upcoming Events</h2>
        <ul className="event-list">
          {events.map((event) => (
            <li key={event.id} className="event-item">
              <div>
                <h3>{event.title}</h3>
                <p>Date: {event.date}</p>
                <p>Location: {event.location}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Homepage;
