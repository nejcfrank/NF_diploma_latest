import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../client";
import SeatsLayout from "./SeatsLayout";
import "../styling/reserveseatspage.css";

const ReserveSeatsPage = ({ token }) => {
  const { eventId } = useParams();
  const [seats, setSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [showComponent, setShowComponent] = useState(false);
  const [remainingTime, setRemainingTime] = useState(60);
  const [timerId, setTimerId] = useState(null);

  useEffect(() => {
    fetchSeats(); // Fetch seats when component mounts

    const seatsSubscription = supabase
      .channel("seats")
      .on("INSERT", handleSeatUpdate)
      .on("UPDATE", handleSeatUpdate)
      .on("DELETE", handleSeatUpdate)
      .subscribe();

    // Retrieve remaining time from localStorage
    const storedTime = localStorage.getItem("remainingTime");
    if (storedTime) {
      const timeLeft = parseInt(storedTime, 10);
      if (timeLeft > 0) {
        setRemainingTime(timeLeft);
        startTimer(timeLeft);
      }
    }

    return () => {
      seatsSubscription.unsubscribe();
    };
  }, [eventId]);

  useEffect(() => {
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

    const selectedSeat = seats[seatIndex];

    // Check if the seat is already reserved or bought
    if (selectedSeat.reserved || selectedSeat.bought_at) {
      alert("Apologies, but this seat has already been sold or reserved.");
      return;
    }

    // Toggle the selection status of the seat
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

  const handleReserveButtonClick = async () => {
    try {
      const now = new Date();
      const expirationTime = now.getTime() + 60000; // Expiration time is 1 minute from now

      // Clear previous reservation timer
      clearInterval(timerId);

      const reservationDetails = {
        seats: selectedSeats,
        expirationTime,
      };
      localStorage.setItem("reservation", JSON.stringify(reservationDetails));

      const reservePromises = selectedSeats.map(async (seatId) => {
        return supabase
          .from("seats")
          .update({
            reserved: true,
            reserved_at: now,
            bought_by_user: token.user.user_metadata.full_name,
          })
          .eq("seat_id", seatId);
      });

      await Promise.all(reservePromises);

      // Update local seat state
      const updatedSeats = seats.map((seat) =>
        selectedSeats.includes(seat.seat_id)
          ? { ...seat, reserved: true }
          : seat
      );
      setSeats(updatedSeats);

      startTimer(60); // Start the timer for 60 seconds

      // Set showComponent to true in localStorage
      localStorage.setItem("showComponent", "true");
    } catch (error) {
      console.error("Error processing reserve operation:", error.message);
    }
  };

  const startTimer = (initialTime) => {
    let timeLeft = initialTime;

    const intervalId = setInterval(() => {
      timeLeft -= 1;
      setRemainingTime(timeLeft);
      localStorage.setItem("remainingTime", timeLeft);

      console.log(`Remaining time: ${timeLeft} seconds`);

      if (timeLeft <= 0) {
        clearInterval(intervalId);
        handleReservationExpiration();
      }
    }, 1000);

    // Save the interval ID in state
    setTimerId(intervalId);
  };

  const handleReservationExpiration = async () => {
    try {
      const reservationDetails = JSON.parse(
        localStorage.getItem("reservation")
      );
      const expiredSeats = reservationDetails.seats;

      const expirePromises = expiredSeats.map(async (seatId) => {
        return supabase
          .from("seats")
          .update({
            reserved: false,
            reserved_at: null,
            bought_by_user: null,
          })
          .eq("seat_id", seatId);
      });

      await Promise.all(expirePromises);

      fetchSeats();
      localStorage.removeItem("reservation");
      localStorage.removeItem("remainingTime");
    } catch (error) {
      console.error("Error handling reservation expiration:", error.message);
    }
    setShowComponent(false);
  };

  const handleConfirmOrderButtonClick = async () => {
    try {
      const { updateError } = await supabase
        .from("seats")
        .update({
          availability: false,
          bought_at: new Date(),
          reserved: false,
          reserved_at: null,
        })
        .in("seat_id", selectedSeats);

      if (updateError) {
        throw updateError;
      }

      const { data: updatedSeatsData, error: fetchError } = await supabase
        .from("seats")
        .select("*")
        .in("seat_id", selectedSeats);

      if (fetchError) {
        throw fetchError;
      }

      console.log("Seat data after confirming order:", updatedSeatsData);

      setSelectedSeats([]);
      fetchSeats();
      localStorage.removeItem("reservation");
      localStorage.removeItem("remainingTime");
    } catch (error) {
      console.error("Error processing order confirmation:", error.message);
    }
  };

  return (
    <div className="page-container">
      <SeatsLayout seats={seats} toggleSeatSelection={toggleSeatSelection} />
      {selectedSeats.length > 0 && (
        <>
          <button className="reserve-button" onClick={handleReserveButtonClick}>
            RESERVE
          </button>
          {showComponent && (
            <div className="corner-component">
              <p>Reserved for: {remainingTime} seconds</p>
              <button
                className="buy-button"
                onClick={handleConfirmOrderButtonClick}
              >
                CONFIRM ORDER
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReserveSeatsPage;
