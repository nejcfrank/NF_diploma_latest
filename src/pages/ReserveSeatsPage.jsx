import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../client";
import "../styling/reserveseatspage.css"; 

const ReserveSeatsPage = () => {
  const { eventId } = useParams();
  const [seats, setSeats] = useState([]);

  useEffect(() => {
    fetchSeats(); // Fetch seats when component mounts
  
    // Subscribe to real-time changes in the "seats" table
    const seatsSubscription = supabase
      .channel(`realtime:event_id=${eventId}`)
      .on('INSERT', handleSeatUpdate)
      .on('UPDATE', handleSeatUpdate)
      .on('DELETE', handleSeatUpdate)
      .subscribe();
  
    // Clean up subscription on component unmount
    return () => {
      seatsSubscription.unsubscribe();
    };
  }, [eventId]);

  const fetchSeats = async () => {
    try {
      const { data, error } = await supabase
        .from("seats")
        .select("*")
        .eq("event_id", eventId);

      if (error) {
        throw error;
      }

      setSeats(data);
    } catch (error) {
      console.error("Error fetching seats:", error.message);
    }
  };

  const handleSeatUpdate = (payload) => {
    // Update the seat in the local state based on the real-time change
    setSeats((prevSeats) =>
      prevSeats.map((prevSeat) =>
        prevSeat.id === payload.new.id ? payload.new : prevSeat
      )
    );
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
        <div className="seat-grid">
          {seats.map((seat) => (
            <div
              key={seat.seat_id}
              className={`seat ${seat.availability ? "available" : "unavailable"}`}
            >
              {seat.seat_number}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReserveSeatsPage;
