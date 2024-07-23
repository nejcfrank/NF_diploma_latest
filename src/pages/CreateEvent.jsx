import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../client"; // Ensure you have Supabase client set up
import Navbar from "./Navbar"; // Import the shared Navbar component
import "../styling/CreateEvent.css";

const CreateEvent = ({ token }) => {
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [selectedHall, setSelectedHall] = useState("");
  const [halls, setHalls] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }

    // Fetch halls from Supabase
    const fetchHalls = async () => {
      const { data, error } = await supabase.from("halls").select("*");
      if (error) {
        console.error("Error fetching halls:", error.message);
        return;
      }
      setHalls(data);
    };

    fetchHalls();
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    try {
      // Step 1: Insert Event
      const { data: eventData, error: eventError } = await supabase
        .from("event")
        .insert([
          {
            title: eventName,
            date: eventDate,
            hall_id: selectedHall,
          }
        ])
        .select(); // Use .select() to get the inserted record
  
      if (eventError) {
        console.error("Error inserting event:", eventError.message);
        throw eventError;
      }
  
      if (!eventData || eventData.length === 0) {
        throw new Error("Event data is null or undefined");
      }
  
      const insertedEvent = eventData[0];
      const eventId = insertedEvent.event_id;
  
      console.log("Inserted Event Data:", insertedEvent);
  
      // Step 2: Fetch Seats for the Selected Hall
      const { data: seats, error: seatsError } = await supabase
        .from("seats")
        .select("seat_id, seat_position")
        .eq("hall_id", selectedHall);
  
      if (seatsError) {
        console.error("Error fetching seats:", seatsError.message);
        throw seatsError;
      }
  
      if (!seats || seats.length === 0) {
        throw new Error("No seats found for the selected hall");
      }
  
      console.log("Seats Data:", seats);
  
      // Step 3: Insert Tickets for Each Seat
      const ticketInserts = seats.map((seat) => ({
        seat_id: seat.seat_id, // Ensure this matches actual seat_id in the database
        hall_id: selectedHall,
        event_id: eventId,
        availability: true,
        selected: false,
        price: 10,
        bought_at: null,
        reserved_at: null,
        reserved: false,
        interaction_made_by_user: null,
      }));
  
      console.log("Ticket Inserts Data:", ticketInserts);
  
      const { error: ticketError } = await supabase
        .from("tickets")
        .insert(ticketInserts);
  
      if (ticketError) {
        console.error("Error inserting tickets:", ticketError.message);
        throw ticketError;
      }
  
      alert("Event created and tickets populated!");
      navigate("/homepage");
    } catch (error) {
      alert("Error creating event or tickets: " + error.message);
    }
  };

  return (
    <div className="create-event-container">
      <Navbar token={token} /> {/* Use the shared Navbar component */}

      <div className="create-event-content">
        <h2>Create Event</h2>
        <form onSubmit={handleSubmit} className="create-event-form">
          <label>
            Event Name:
            <input
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              required
            />
          </label>
          <label>
            Event Date:
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              required
            />
          </label>
          <label>
            Event Location:
            <select
              value={selectedHall}
              onChange={(e) => setSelectedHall(Number(e.target.value))}
              required
            >
              <option value="">Select a hall</option>
              {halls.map((hall) => (
                <option key={hall.hall_id} value={hall.hall_id}>
                  {hall.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">Create Event</button>
        </form>
      </div>
    </div>
  );
};

export default CreateEvent;
