import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../client";
import SeatsLayout from "./SeatsLayout";
import "../styling/reserveseatspage.css";

const ReserveSeatsPage = () => {
  const { eventId } = useParams();
  const [seats, setSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0); // State to hold total price
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

    // Clean up subscription and interval on component unmount
    return () => {
      seatsSubscription.unsubscribe();
      clearInterval(intervalRef.current);
    };
  }, [eventId]);

  useEffect(() => {
    // Calculate total price whenever selected seats change
    const pricePerSeat = 10; // Set your price per seat here
    const totalPrice = selectedSeats.length * pricePerSeat;
    setTotalPrice(totalPrice);
  }, [selectedSeats]);

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

  const toggleSeatSelection = async (seatId) => {
    const seatIndex = seats.findIndex((seat) => seat.seat_id === seatId);
    if (seatIndex === -1) return; // Seat not found

    const updatedSeats = [...seats];
    const updatedSeat = { ...updatedSeats[seatIndex] };
    updatedSeat.selected = !updatedSeat.selected;
    updatedSeats[seatIndex] = updatedSeat;
    setSeats(updatedSeats);

    const selectedSeatIds = updatedSeats
      .filter((seat) => seat.selected)
      .map((seat) => seat.seat_id);
    setSelectedSeats(selectedSeatIds);

    try {
      // Update the selected field in the database only if selection status has changed
      if (updatedSeat.selected !== seats[seatIndex].selected) {
        await supabase
          .from("seats")
          .update({ selected: updatedSeat.selected })
          .eq("seat_id", seatId);
      }
    } catch (error) {
      console.error("Error updating seat selection:", error.message);
    }
  };

  const handleBuyButtonClick = async () => {
    try {
      // Fetch the availability status of selected seats from the server
      const { data: seatAvailabilityBefore, error } = await supabase
        .from("seats")
        .select("*")
        .in("seat_id", selectedSeats);

      if (error) {
        throw error;
      }

      // Check if any of the selected seats are already taken or reserved
      const takenSeats = seatAvailabilityBefore.filter(
        (seat) => !seat.availability || seat.reserved
      );

      if (takenSeats.length > 0) {
        alert(
          "Sorry, some of the selected seats are already taken or reserved."
        );
        // Refresh the page to update seat availability
        window.location.reload(); // Refresh the page
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

      // Fetch the updated seat data after the purchase
      const { data: seatAvailabilityAfter, error: fetchError } = await supabase
        .from("seats")
        .select("*")
        .in("seat_id", selectedSeats);

      if (fetchError) {
        throw fetchError;
      }

      console.log("Seat data after purchase:", seatAvailabilityAfter);

      // Immediately update the local state to reflect the purchase
      const updatedSeats = seats.map((seat) =>
        selectedSeats.includes(seat.seat_id)
          ? { ...seat, selected: false, availability: false }
          : seat
      );
      setSeats(updatedSeats);
      setSelectedSeats([]); // Clear selected seats

      // Re-enable the periodic fetching of seats
    } catch (error) {
      console.error("Error processing buy operation:", error.message);
      // Refresh the page if an error occurs
      window.location.reload(); // Refresh the page
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
          reservation_expires_at: new Date(Date.now() + 60000), // 60 seconds from now
        })
        .in("seat_id", selectedSeats);

      if (reserveError) {
        throw reserveError;
      }

      // Fetch the updated seats after the reserve operation
      fetchSeats();

      // Set a timeout to fetch seats after the reservation expires
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
            BUY for {totalPrice}€ {/* Display total price on the button */}
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