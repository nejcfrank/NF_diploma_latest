import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../client";
import Navbar from "./Navbar";
import "../styling/Homepage.css";
import { FaEdit, FaTrashAlt } from 'react-icons/fa';

const Homepage = ({ token }) => {
  const [events, setEvents] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  const [editEventDetails, setEditEventDetails] = useState({
    title: '',
    date: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchEvents();
    checkAdminRole();
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
        const sortedEvents = eventsData.sort((a, b) => new Date(a.date) - new Date(b.date));
        setEvents(sortedEvents);
      } else {
        console.error("Unexpected data format:", eventsData);
      }
    } catch (error) {
      console.error("Error fetching events:", error.message);
    }
  };

  const checkAdminRole = () => {
    if (token?.user?.user_metadata?.role === 'admin') {
      setIsAdmin(true);
    }
  };

  const handleReserveSeats = (eventId, hallName) => {
    navigate(`${hallName}/${eventId}`);
  };

  const handleEditEvent = async (eventId) => {
    try {
      const { error } = await supabase
        .from('event')
        .update({
          title: editEventDetails.title,
          date: editEventDetails.date
        })
        .eq('event_id', eventId);

      if (error) {
        throw error;
      }

      fetchEvents(); // Refetch and sort events after editing
      setEditingEventId(null);
    } catch (error) {
      console.error("Error updating event:", error.message);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      const { error: deleteTicketsError } = await supabase
        .from('tickets')
        .delete()
        .eq('event_id', eventId);

      if (deleteTicketsError) {
        throw deleteTicketsError;
      }

      const { error: deleteEventError } = await supabase
        .from('event')
        .delete()
        .eq('event_id', eventId);

      if (deleteEventError) {
        throw deleteEventError;
      }

      fetchEvents(); // Refetch and sort events after deletion
    } catch (error) {
      console.error("Error deleting event and tickets:", error.message);
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const formattedDate = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
    const formattedTime = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
    return `DATE AND TIME: ${formattedDate} at ${formattedTime.replace(':', 'h')}`;
  };

  const handleEditChange = (e) => {
    setEditEventDetails({
      ...editEventDetails,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="homepage-container">
      <Navbar token={token} />

      <div className="events-container">
        {events.length > 0 ? (
          events.map((event) => (
            <div key={event.event_id} className="event-item">
              {isAdmin && (
                <div className="admin-actions">
                  <FaEdit
                    className="edit-button"
                    onClick={() => {
                      setEditingEventId(event.event_id);
                      setEditEventDetails({
                        title: event.title,
                        date: event.date
                      });
                    }}
                  />
                  <FaTrashAlt
                    className="delete-button"
                    onClick={() => handleDeleteEvent(event.event_id)}
                  />
                </div>
              )}
              <div className="event-details">
                {editingEventId === event.event_id ? (
                  <div className="edit-form-container">
                    <div className="edit-form">
                      <h2>Edit Event</h2>
                      <input
                        type="text"
                        name="title"
                        value={editEventDetails.title}
                        onChange={handleEditChange}
                        className="input-field"
                        placeholder="Event Title"
                      />
                      <input
                        type="datetime-local"
                        name="date"
                        value={editEventDetails.date.slice(0, 16)}
                        onChange={handleEditChange}
                        className="input-field"
                      />
                      <div className="edit-actions">
                        <button
                          className="save-changes-button"
                          onClick={() => handleEditEvent(event.event_id)}
                        >
                          Save Changes
                        </button>
                        <button
                          className="cancel-edit-button"
                          onClick={() => setEditingEventId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <h2>{event.title}</h2>
                    <p>{formatDate(event.date)}</p>
                    <p>Location: {event.halls?.name}</p>
                    <button
                      className="reserve-seats-button"
                      onClick={() =>
                        handleReserveSeats(event.event_id, event.halls?.name)
                      }
                    >
                      RESERVE SEATS
                    </button>
                  </>
                )}
              </div>
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
