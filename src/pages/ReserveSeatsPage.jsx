// eslint-disable-next-line no-unused-vars
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../client";

const ReserveSeatsPage = () => {
  const { eventId } = useParams();
  const [seats, setSeats] = useState([]);

  useEffect(() => {
    fetchSeats();
  }, []);

  const fetchSeats = async () => {
    try {
      // Fetch seats data based on event ID
      const { data: seatsData, error: seatsError } = await supabase
        .from("seats")
        .select("*")
        .eq("event_id", eventId);

      if (seatsError) {
        throw seatsError;
      }

      setSeats(seatsData);
    } catch (error) {
      console.error("Error fetching seats:", error.message);
    }
  };

  // Function to handle seat reservation
  // eslint-disable-next-line no-unused-vars
  const handleSeatReservation = (seatId) => {
    // Implement seat reservation logic
  };

  if (seats.length === 0) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>SEATS</h1>
      <div className="hall-layout">
        {/* Render hall layout with seats */}
        {/* Example: */}
        {seats.map((seat) => (
          <button
            key={seat.seat_id}
            onClick={() => handleSeatReservation(seat.seat_id)}
            disabled={!seat.availability}
          >
            {seat.seat_number}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ReserveSeatsPage;
