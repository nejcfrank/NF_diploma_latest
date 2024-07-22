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
      const { data: eventsData, error } = await supabase
        .from("events")
        .select("*");
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

  const navigateToCreateEvent = () => {
    navigate("/create-event");
  };

  const navigateToEvents = () => {
    navigate("/homepage");
  };

  return (
    <div className="homepage-container">
      <nav className="navbar">
        <div className="nav-left">
          <div className="nav-item" onClick={navigateToEvents}>
            Events
          </div>
          <div className="nav-item" onClick={navigateToCreateEvent}>
            Create Event
          </div>
        </div>
        <div className="nav-right">
          <div className="nav-item" onClick={handleLogout}>
            Logout
          </div>
          <div className="avatar-container">
            <div className="avatar" />
            <div className="tooltip">{token.user.user_metadata.full_name}</div>
          </div>
        </div>
      </nav>

      <div className="events-container">
        {events.map((event) => (
          <div key={event.event_id} className="event-item">
            <div className="event-details">
              <h2>{event.title}</h2>
              <p>Date: {event.date}</p>
              <p>Location: {event.location}</p>
              <button
                onClick={() =>
                  handleReserveSeats(event.event_id, event.location)
                }
              >
                RESERVE SEATS
              </button>
            </div>
            <div className="event-banner" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Homepage;
