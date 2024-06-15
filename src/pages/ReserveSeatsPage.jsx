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

    const storedReservation = JSON.parse(localStorage.getItem("reservation"));
    const storedTime = localStorage.getItem("remainingTime");

    if (storedReservation && storedTime) {
      const timeLeft = Math.ceil(
        (storedReservation.expirationTime - Date.now()) / 1000
      );

      if (timeLeft > 0) {
        setRemainingTime(timeLeft);
        startTimer(timeLeft);
        setShowComponent(true);
      } else {
        handleReservationExpiration();
      }
    }

    return () => {
      seatsSubscription.unsubscribe();
      clearInterval(timerId); // Clear any existing timers on unmount
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
        .order("seat_id", { ascending: true });

      if (error) {
        throw error;
      }

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

    if (selectedSeat.reserved || selectedSeat.bought_at) {
      alert("This seat has already been sold or reserved.");
      return;
    }

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
      await supabase
        .from("seats")
        .update({ selected: updatedSeat.selected })
        .eq("seat_id", seatId);
    } catch (error) {
      console.error("Error updating seat selection:", error.message);
    }
  };

  const handleReserveButtonClick = async () => {
    
    try {
      const { data: reservedSeats, error } = await supabase
        .from("seats")
        .select("seat_id")
        .in("seat_id", selectedSeats)
        .eq("reserved", true);
  
      if (error) {
        throw error;
      }
  
      if (reservedSeats.length > 0) {
        alert("One or more of the selected seats are already reserved.");
        return;
      }
      
      const now = new Date();
      const expirationTime = now.getTime() + 60000; // 1 minute from now
  
      const storedReservation = JSON.parse(
        localStorage.getItem("reservation")
      ) || { seats: [] };
  
      if (storedReservation.seats.length > 0) {
        const updateReservedAtPromises = storedReservation.seats.map(
          async (seatId) => {
            return supabase
              .from("seats")
              .update({ reserved_at: now })
              .eq("seat_id", seatId);
          }
        );
        await Promise.all(updateReservedAtPromises);
      }
      
  
      const reservationDetails = {
        seats: [...new Set([...storedReservation.seats, ...selectedSeats])],
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
            selected: false,
          })
          .eq("seat_id", seatId);
      });
  
      await Promise.all(reservePromises);
  
      const updatedSeats = seats.map((seat) =>
        reservationDetails.seats.includes(seat.seat_id)
          ? { ...seat, reserved: true, reserved_at: now, selected: false }
          : seat
      );
      setSeats(updatedSeats);
      setSelectedSeats([]);
  
      if (timerId) {
        clearInterval(timerId); // Clear previous timer
      }
      startTimer(60); // Start or restart timer for 60 seconds
  
      localStorage.setItem("showComponent", "true");
      setShowComponent(true);
  
      // Reload the page after making a reservation
      
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

      console.log(`Remaining time: ${timeLeft} seconds`); // Log remaining time

      if (timeLeft <= 0) {
        clearInterval(intervalId);
        handleReservationExpiration();
      }
    }, 1000);

    setTimerId(intervalId);
  };

  const handleReservationExpiration = async () => {
    try {
      const reservationDetails = JSON.parse(
        localStorage.getItem("reservation")
      );
      const expiredSeats = reservationDetails ? reservationDetails.seats : [];

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
      const reservationDetails = JSON.parse(
        localStorage.getItem("reservation")
      );
      const seatsToBuy = reservationDetails ? reservationDetails.seats : [];

      const { updateError } = await supabase
        .from("seats")
        .update({
          availability: false,
          bought_at: new Date(),
          reserved: false,
          reserved_at: null,
        })
        .in("seat_id", seatsToBuy);

      if (updateError) {
        throw updateError;
      }

      const { data: updatedSeatsData, error: fetchError } = await supabase
        .from("seats")
        .select("*")
        .in("seat_id", seatsToBuy);

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
