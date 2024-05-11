import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../client";
import "../styling/reserveseatspage.css";

const ReserveSeatsPage = () => {
  const { eventId } = useParams();
  const [seats, setSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);

  useEffect(() => {
    fetchSeats(); // Fetch seats when component mounts

    // Subscribe to real-time changes in the "seats" table
    const seatsSubscription = supabase
      .channel(`realtime:event_id=${eventId}`)
      .on("INSERT", handleSeatUpdate)
      .on("UPDATE", handleSeatUpdate)
      .on("DELETE", handleSeatUpdate)
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
        .eq("event_id", eventId)
        .order("seat_id", { ascending: true }); // Order by seat_id ascending

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

  const toggleSeatSelection = async (seatId) => {
    try {
      const seat = seats.find((seat) => seat.seat_id === seatId);
      if (!seat.availability) {
        alert("Seat already taken.");
        return;
      }
  
      const updatedSeats = seats.map((seat) =>
        seat.seat_id === seatId
          ? { ...seat, selected: !seat.selected }
          : seat
      );
      setSeats(updatedSeats);
  
      const selectedSeatIds = updatedSeats
        .filter((seat) => seat.selected)
        .map((seat) => seat.seat_id);
      setSelectedSeats(selectedSeatIds);
    } catch (error) {
      console.error("Error toggling seat selection:", error.message);
    }
  };
  

  const handleBuyButtonClick = async () => {
    try {
      const { error } = await supabase
        .from("seats")
        .update({ selected: false, availability: false })
        .in("seat_id", selectedSeats);

      if (error) {
        throw error;
      }

      // Fetch the updated seats after the buy operation
      fetchSeats();
    } catch (error) {
      console.error("Error processing buy operation:", error.message);
    }
  };

  if (seats.length === 0) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>SEATS</h1>
      <div className="hall-layout">
        <div className="seats">
          {seats.map((seat) => (
            <div
              key={seat.seat_id}
              className={`seat ${
                seat.selected
                  ? "selected"
                  : seat.availability
                  ? "available"
                  : "unavailable"
              }`}
              onClick={() => toggleSeatSelection(seat.seat_id)}
            >
              {seat.seat_number}
            </div>
          ))}
        </div>
      </div>
      <button onClick={handleBuyButtonClick}>BUY</button>
    </div>
  );
};

export default ReserveSeatsPage;
