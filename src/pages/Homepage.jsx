import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../client";
import Navbar from "./Navbar"; // Import the shared Navbar component
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

      if (Array.isArray(eventsData)) {
        setEvents(eventsData);
      } else {
        console.error("Unexpected data format:", eventsData);
      }
    } catch (error) {
      console.error("Error fetching events:", error.message);
    }
  };

  const handleReserveSeats = (eventId, hallName) => {
    navigate(`${hallName}/${eventId}`);
  };

  // Function to format date and time
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);

    const formattedDate = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
    const formattedTime = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date);

    return `DATE AND TIME: ${formattedDate} at ${formattedTime.replace(':', 'h')}`;
  };

  return (
    <div className="homepage-container">
      <Navbar token={token} /> {/* Use the shared Navbar component */}

      <div className="events-container">
        {events.length > 0 ? (
          events.map((event) => (
            <div key={event.event_id} className="event-item">
              <div className="event-details">
                <h2>{event.title}</h2>
                <p>{formatDate(event.date)}</p> {/* Displaying formatted date */}
                <p>Location: {event.halls?.name}</p> {/* Displaying hall name */}
                <button
                  onClick={() =>
                    handleReserveSeats(event.event_id, event.halls?.name) // Passing hall name to reserve seats function
                  }
                >
                  RESERVE SEATS
                </button>
              </div>
              {/* Removed event-banner */}
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
