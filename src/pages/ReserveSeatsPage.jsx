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
      .channel("seats")
      .on("INSERT", handleSeatUpdate)
      .on("UPDATE", handleSeatUpdate)
      .on("DELETE", handleSeatUpdate)
      .subscribe();

    // Periodically fetch the latest seat data
    const interval = setInterval(fetchSeats, 30000); // Every 30 seconds

    // Clean up subscription and interval on component unmount
    return () => {
      seatsSubscription.unsubscribe();
      clearInterval(interval);
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
    const updatedSeat = payload.new;
    setSeats((prevSeats) =>
      prevSeats.map((prevSeat) =>
        prevSeat.seat_id === updatedSeat.seat_id ? updatedSeat : prevSeat
      )
    );
  };

  const toggleSeatSelection = async (seatId) => {
    try {
      const seat = seats.find((seat) => seat.seat_id === seatId);
      if (!seat.availability || seat.reserved) {
        alert("Seat already taken or reserved");
        return;
      }

      const updatedSeats = seats.map((seat) =>
        seat.seat_id === seatId ? { ...seat, selected: !seat.selected } : seat
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
      // Fetch the availability status of selected seats from the server
      const { data: seatAvailability, error } = await supabase
        .from("seats")
        .select("availability, reserved")
        .in("seat_id", selectedSeats);

      if (error) {
        throw error;
      }

      // Check if any of the selected seats are already taken or reserved
      const takenSeats = seatAvailability.filter(
        (seat) => !seat.availability || seat.reserved
      );

      if (takenSeats.length > 0) {
        alert(
          "Sorry, some of the selected seats are already taken or reserved."
        );
        // Refresh the page to update seat availability
        fetchSeats();
        return;
      }

      // Proceed with buying the seats
      const { updateError } = await supabase
        .from("seats")
        .update({ selected: false, availability: false, bought_at: new Date() })
        .in("seat_id", selectedSeats);

      if (updateError) {
        throw updateError;
      }

      // Fetch the updated seats after the buy operation
      fetchSeats();
    } catch (error) {
      console.error("Error processing buy operation:", error.message);
    }
  };

  const handleReserveButtonClick = async () => {
    try {
      // Fetch the availability status of selected seats from the server
      const { data: seatAvailability, error } = await supabase
        .from("seats")
        .select("availability, reserved")
        .in("seat_id", selectedSeats);

      if (error) {
        throw error;
      }

      // Check if any of the selected seats are already taken or reserved
      const takenSeats = seatAvailability.filter(
        (seat) => !seat.availability || seat.reserved
      );

      if (takenSeats.length > 0) {
        alert(
          "Sorry, some of the selected seats are already taken or reserved."
        );
        // Refresh the page to update seat availability
        fetchSeats();
        return;
      }

      // Proceed with reserving the seats
      const { error: reserveError } = await supabase
        .from("seats")
        .update({
          reserved: true,
          reserved_at: new Date(),
          reservation_expires_at: new Date(Date.now() + 58000), // 60 seconds from now
        })
        .in("seat_id", selectedSeats);

      if (reserveError) {
        throw reserveError;
      }

      // Fetch the updated seats after the reserve operation
      fetchSeats();
    } catch (error) {
      console.error("Error processing reserve operation:", error.message);
    }
  };

  if (seats.length === 0) {
    return <div>Loading...</div>;
  }

  return (
    <div className="page-container">
      <h1>SEATS</h1>
      <div className="hall-layout">
        <div className="seats-container">
          {seats.map((seat) => (
            <div
              key={seat.seat_id}
              className={`seat ${
                seat.selected
                  ? "selected"
                  : seat.reserved
                  ? "reserved"
                  : seat.availability
                  ? "available"
                  : "unavailable"
              }`}
              onClick={() => toggleSeatSelection(seat.seat_id)}
            ></div>
          ))}
        </div>
      </div>
      {selectedSeats.length > 0 && (
        <button className="buy-button" onClick={handleBuyButtonClick}>
          BUY
        </button>
      )}
      {selectedSeats.length > 0 && (
        <button className="reserve-button" onClick={handleReserveButtonClick}>
          RESERVE
        </button>
      )}
    </div>
  );
};

export default ReserveSeatsPage;
