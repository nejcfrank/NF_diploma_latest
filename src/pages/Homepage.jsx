// eslint-disable-next-line no-unused-vars
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../client";
import "../styling/Homepage.css"; // Import CSS file

const Homepage = ({ token }) => {
  const [events, setEvents] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data: eventsData, error } = await supabase.from("events").select("*");
      if (error) {
        throw error;
      }
      setEvents(eventsData);
    } catch (error) {
      console.error("Error fetching events:", error.message);
    }
  };

  function handleLogout() {
    sessionStorage.removeItem("token");
    navigate("/");
  }

  const handleReserveSeats = (eventId, eventLocation) => {
    navigate(`${eventLocation}/${eventId}`); // Navigate to the desired URL
  };

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
            <li key={event.event_id} className="event-item">
              <div>
                <h3>{event.title}</h3>
                <p>Date: {event.date}</p>
                <p>Location: {event.location}</p>
                <button onClick={() => handleReserveSeats(event.event_id, event.location)}>RESERVE SEATS</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Homepage;
