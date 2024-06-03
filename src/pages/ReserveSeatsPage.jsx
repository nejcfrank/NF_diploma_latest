import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../client";
import SeatsLayout from "./SeatsLayout";
import "../styling/reserveseatspage.css";

const ReserveSeatsPage = () => {
  const { eventId } = useParams();
  const [seats, setSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const intervalRef = useRef(null);

  useEffect(() => {
    fetchSeats(); // Fetch seats when component mounts

    // Subscribe to real-time changes in the "seats" table
    const seatsSubscription = supabase
      .channel("seats")
      .on("INSERT", handleSeatUpdate)
      .on("UPDATE", handleSeatUpdate)
      .on("DELETE", handleSeatUpdate)
      .subscribe();

    startFetchingSeats(); // Start fetching seats at intervals

    // Clean up subscription and interval on component unmount
    return () => {
      seatsSubscription.unsubscribe();
      clearInterval(intervalRef.current);
    };
  }, [eventId]);

  const startFetchingSeats = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fetchSeats, 10000); // Fetch every 10 seconds
  };

  const stopFetchingSeats = () => {
    clearInterval(intervalRef.current);
  };

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

      // Preserve the selected state of seats
      const updatedSeats = data.map((seat) => ({
        ...seat,
        selected: selectedSeats.includes(seat.seat_id),
      }));

      setSeats(updatedSeats);
    } catch (error) {
      console.error("Error fetching seats:", error.message);
    }
  };

  const handleSeatUpdate = () => {
    fetchSeats(); // Fetch seats after an update
  };

  const toggleSeatSelection = (seatId) => {
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

    // Stop fetching seats while making a selection
    stopFetchingSeats();
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
        startFetchingSeats(); // Resume fetching seats
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

      // Immediately update the local state to reflect the purchase
      const updatedSeats = seats.map((seat) =>
        selectedSeats.includes(seat.seat_id)
          ? { ...seat, selected: false, availability: false }
          : seat
      );
      setSeats(updatedSeats);
      setSelectedSeats([]); // Clear selected seats

      // Re-enable the periodic fetching of seats
      startFetchingSeats();
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
        startFetchingSeats(); // Resume fetching seats
        return;
      }

      // Proceed with reserving the seats
      const { error: reserveError } = await supabase
        .from("seats")
        .update({
          reserved: true,
          reserved_at: new Date(),
          reservation_expires_at: new Date(Date.now() + 60000), // 60 seconds from now
        })
        .in("seat_id", selectedSeats);

      if (reserveError) {
        throw reserveError;
      }

      // Fetch the updated seats after the reserve operation
      fetchSeats();
      startFetchingSeats(); // Resume fetching seats

      // Set a timeout to fetch seats after 60 seconds
      setTimeout(fetchSeats, 60000); // 60 seconds
    } catch (error) {
      console.error("Error processing reserve operation:", error.message);
    }
  };

  if (seats.length === 0) {
    return <div>Loading...</div>;
  }

  return (
    <div className="page-container">
      <SeatsLayout seats={seats} toggleSeatSelection={toggleSeatSelection} />
      {/* Render buttons if seats are selected */}
      {selectedSeats.length > 0 && (
        <>
          <button className="buy-button" onClick={handleBuyButtonClick}>
            BUY
          </button>
          <button className="reserve-button" onClick={handleReserveButtonClick}>
            RESERVE
          </button>
        </>
      )}
    </div>
  );
};

export default ReserveSeatsPage;
