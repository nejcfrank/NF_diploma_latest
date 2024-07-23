import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../client";
import "../styling/Homepage.css";

const Homepage = ({ token }) => {
  const [events, setEvents] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data: eventsData, error } = await supabase
        .from("event")
        .select(`
          event_id,
          title,
          date,
          hall_id,
          halls (
            name
          )
        `);

      if (error) {
        throw error;
      }

      // Ensure data is an array
      if (Array.isArray(eventsData)) {
        setEvents(eventsData);
      } else {
        console.error("Unexpected data format:", eventsData);
      }
    } catch (error) {
      console.error("Error fetching events:", error.message);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    navigate("/");
  };

  const handleReserveSeats = (eventId, hallName) => {
    navigate(`${hallName}/${eventId}`);
  };

  const navigateToCreateEvent = () => {
    navigate('/create-event', { state: { token } });
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
            <div className="tooltip">{token?.user?.user_metadata?.full_name}</div>
          </div>
        </div>
      </nav>

      <div className="events-container">
        {events.length > 0 ? (
          events.map((event) => (
            <div key={event.event_id} className="event-item">
              <div className="event-details">
                <h2>{event.title}</h2>
                <p>Date: {event.date}</p>
                <p>Location: {event.halls?.name}</p> {/* Displaying hall name */}
                <button
                  onClick={() =>
                    handleReserveSeats(event.event_id, event.halls?.name) // Passing hall name to reserve seats function
                  }
                >
                  RESERVE SEATS
                </button>
              </div>
              <div className="event-banner" />
            </div>
          ))
        ) : (
          <p>No events available</p>
        )}
      </div>
    </div>
  );
};

export default Homepage;
