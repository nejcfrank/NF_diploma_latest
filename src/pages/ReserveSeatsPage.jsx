import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../client";
import SeatsLayout from "./SeatsLayout";
import ReservationTimer from "./ReservationTimer";
import Navbar from "./Navbar";
import "../styling/reserveseatspage.css";

const ReserveSeatsPage = ({ token }) => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [seats, setSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [reservedSeats, setReservedSeats] = useState([]);
  
  const [showComponent, setShowComponent] = useState(false);
  const [remainingTime, setRemainingTime] = useState(60);
  const [timerId, setTimerId] = useState(null);

  // Fetch seat data from Supabase
  const fetchSeats = async () => {
    try {
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("event_id", eventId)
        .order("seat_id", { ascending: true });

      if (error) throw error;

      const updatedSeats = data.map((ticket) => ({
        ...ticket,
        selected: ticket.selected || false,
        highlight: ticket.reserved || ticket.selected,
        isUserSelection:
          ticket.selected &&
          ticket.interaction_made_by_user === token.user.user_metadata.sub,
      }));

      setSeats(updatedSeats);
    } catch (error) {
      console.error("Error fetching tickets:", error.message);
    }
  };

  // Update seat data on changes
  const handleSeatUpdate = () => fetchSeats();

  // Toggle seat selection and update the database
  const toggleSeatSelection = async (seatId) => {
    const seatIndex = seats.findIndex((seat) => seat.seat_id === seatId);
    if (seatIndex === -1) return;
  
    const selectedSeat = seats[seatIndex];
  
    if (
      selectedSeat.reserved ||
      selectedSeat.bought_at ||
      !selectedSeat.availability
    ) {
      alert("This seat has already been sold, reserved, or is unavailable.");
      return;
    }
  
    const newSelectedStatus = !selectedSeat.selected;
  
    if (
      !newSelectedStatus &&
      selectedSeat.interaction_made_by_user !== token.user.user_metadata.sub
    ) {
      alert("You cannot unselect this seat because it was not selected by you.");
      return;
    }
  
    const updatedSeats = [...seats];
    updatedSeats[seatIndex] = {
      ...updatedSeats[seatIndex],
      selected: newSelectedStatus,
      interaction_made_by_user: newSelectedStatus
        ? token.user.user_metadata.sub
        : null,
      isUserSelection: newSelectedStatus,
    };
  
    setSeats(updatedSeats);
  
    try {
      const { error } = await supabase
        .from("tickets")
        .update({
          selected: newSelectedStatus,
          interaction_made_by_user: newSelectedStatus
            ? token.user.user_metadata.sub
            : null,
        })
        .eq("seat_id", seatId)
        .eq("event_id", eventId);
  
      if (error) throw error;
  
      const selectedSeatIds = updatedSeats
        .filter((seat) => seat.selected)
        .map((seat) => seat.seat_id);
      setSelectedSeats(selectedSeatIds);
    } catch (error) {
      console.error("Error updating seat reservation status:", error.message);
    }
  };
  

  // Handle the reserve button click
  const handleReserveButtonClick = async () => {
    try {
      const userSelectedSeats = selectedSeats.filter((seatId) => {
        const seat = seats.find((s) => s.seat_id === seatId);
        return seat && seat.isUserSelection;
      });
  
      if (userSelectedSeats.length === 0) {
        alert("No seats selected by you to reserve.");
        return;
      }
  
      const { data: reservedSeats, error: reservedError } = await supabase
        .from("tickets")
        .select("seat_id")
        .in("seat_id", userSelectedSeats)
        .eq("reserved", true)
        .eq("event_id", eventId);
  
      if (reservedError) throw reservedError;
  
      const { data: unavailableSeats, error: availabilityError } =
        await supabase
          .from("tickets")
          .select("seat_id")
          .in("seat_id", userSelectedSeats)
          .eq("availability", false)
          .eq("event_id", eventId);
  
      if (availabilityError) throw availabilityError;
  
      if (unavailableSeats.length > 0 || reservedSeats.length > 0) {
        alert("One or more of the selected seats are already reserved or unavailable.");
        return;
      }
  
      const now = new Date();
      const expirationTime = now.getTime() + 60000; // 1 minute from now
  
      const storedReservation = JSON.parse(localStorage.getItem("reservation")) || { seats: [] };
  
      if (storedReservation.seats.length > 0) {
        const updateReservedAtPromises = storedReservation.seats.map((seatId) => {
          return supabase
            .from("tickets")
            .update({ reserved_at: now })
            .eq("seat_id", seatId)
            .eq("event_id", eventId);
        });
        await Promise.all(updateReservedAtPromises);
      }
  
      const reservationDetails = {
        seats: [...new Set([...storedReservation.seats, ...userSelectedSeats])],
        expirationTime,
      };
      localStorage.setItem("reservation", JSON.stringify(reservationDetails));
  
      const reservePromises = userSelectedSeats.map((seatId) => {
        return supabase
          .from("tickets")
          .update({
            reserved: true,
            reserved_at: now,
            interaction_made_by_user: token.user.user_metadata.sub,
            selected: false,
          })
          .eq("seat_id", seatId)
          .eq("event_id", eventId);
      });
  
      await Promise.all(reservePromises);
  
      const updatedSeats = seats.map((seat) =>
        reservationDetails.seats.includes(seat.seat_id)
          ? { ...seat, reserved: true, reserved_at: now, selected: false }
          : seat
      );
  
      setSeats(updatedSeats);
      setSelectedSeats([]);
      setReservedSeats(reservationDetails.seats);
  
      if (timerId) {
        clearInterval(timerId);
      }
      startTimer(60);
  
      localStorage.setItem("showComponent", "true");
      setShowComponent(true);
    } catch (error) {
      console.error("Error processing reserve operation:", error.message);
    }
  };
  

  // Start the reservation timer
  const startTimer = (initialTime) => {
    let timeLeft = initialTime;
  
    const intervalId = setInterval(() => {
      timeLeft -= 1;
      if (timeLeft < 0) {
        clearInterval(intervalId);
        handleReservationExpiration();
        return;
      }
      setRemainingTime(timeLeft);
      localStorage.setItem("remainingTime", timeLeft);
    }, 1000);
  
    setTimerId(intervalId);
  };
  
  // Reset seats selected by the user
  const resetSelectedSeats = useCallback(async () => {
    try {
      const userId = token.user.user_metadata.sub;

      // Fetch seats selected by the user
      const { data: selectedSeats, error: fetchError } = await supabase
        .from("tickets")
        .select("seat_id, selected, reserved")
        .eq("interaction_made_by_user", userId)
        .eq("event_id", eventId);

      if (fetchError) throw fetchError;

      // Filter seats to reset based on their state
      const seatIdsToReset = selectedSeats
        .filter(seat => seat.selected && !seat.reserved) // Only reset seats that are selected and not reserved
        .map(seat => seat.seat_id);

      // Only proceed if there are seats to reset
      if (seatIdsToReset.length > 0) {
        const { error } = await supabase
          .from("tickets")
          .update({ selected: false, interaction_made_by_user: null })
          .in("seat_id", seatIdsToReset)
          .eq("event_id", eventId);

        if (error) throw error;
      }

      await fetchSeats();
    } catch (error) {
      console.error("Error resetting selected seats:", error.message);
    }
  }, [eventId, token]);

  // Handle reservation expiration
  const handleReservationExpiration = async () => {
    try {
      const reservationDetails = JSON.parse(
        localStorage.getItem("reservation")
      );
      const expiredSeats = reservationDetails ? reservationDetails.seats : [];

      const expirePromises = expiredSeats.map(async (seatId) => {
        return supabase
          .from("tickets")
          .update({
            reserved: false,
            reserved_at: null,
            interaction_made_by_user: null,
          })
          .eq("seat_id", seatId);
      });

      await Promise.all(expirePromises);

      fetchSeats();
      setReservedSeats([]);
      localStorage.removeItem("reservation");
      localStorage.removeItem("remainingTime");
      setShowComponent(false);
    } catch (error) {
      console.error("Error handling reservation expiration:", error.message);
    }
  };

  // Confirm order and process the payment
  const handleConfirmOrderButtonClick = async () => {
    try {
      const reservationDetails = JSON.parse(
        localStorage.getItem("reservation")
      );
      const seatsToBuy = reservationDetails ? reservationDetails.seats : [];

      if (seatsToBuy.length === 0) {
        alert("No seats selected for purchase.");
        return;
      }

      const now = new Date();

      // Update seats to mark them as bought
      const { error: updateError } = await supabase
        .from("tickets")
        .update({
          availability: false,
          bought_at: now,
          reserved: false,
          reserved_at: null,
        })
        .in("seat_id", seatsToBuy)
        .eq("event_id", eventId)
        .eq("interaction_made_by_user", token.user.user_metadata.sub) // Ensure the user is the one who reserved the seats
        .eq("reserved", true); // Ensure the seats are reserved

      if (updateError) throw updateError;

      // Fetch the updated seat data
      const { data: updatedSeatsData, error: fetchError } = await supabase
        .from("tickets")
        .select("*")
        .in("seat_id", seatsToBuy)
        .eq("event_id", eventId);

      if (fetchError) throw fetchError;

      // Update the local state
      const updatedSeats = seats.map((seat) =>
        seatsToBuy.includes(seat.seat_id)
          ? updatedSeatsData.find((s) => s.seat_id === seat.seat_id)
          : seat
      );

      setSeats(updatedSeats);
      localStorage.removeItem("reservation");
      localStorage.removeItem("remainingTime");
      setShowComponent(false);
      setSelectedSeats([]);
    } catch (error) {
      console.error("Error confirming order:", error.message);
    }
  };

  // Handle user logout
  const handleLogout = async () => {
    try {
      await resetSelectedSeats(); // Ensure seats selected by the user are unselected
      localStorage.removeItem("reservation");
      localStorage.removeItem("remainingTime");
      sessionStorage.removeItem("token");
      navigate("/");
    } catch (error) {
      console.error("Error during logout:", error.message);
    }
  };

  const navigateToEvents = () => navigate("/homepage");
  const navigateToCreateEvent = () => navigate("/create-event");
  const navigateToHome = () => navigate("/homepage");

  useEffect(() => {
    const fetchData = async () => {
      await resetSelectedSeats();
      await fetchSeats();
    };
  
    fetchData();
  
    const seatsSubscription = supabase
      .channel("tickets")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tickets" },
        handleSeatUpdate
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "tickets" },
        handleSeatUpdate
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "tickets" },
        handleSeatUpdate
      )
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
        setReservedSeats(storedReservation.seats);
      } else {
        handleReservationExpiration();
      }
    }
  
    const handleBeforeUnload = async () => {
      try {
        await resetSelectedSeats();
        localStorage.removeItem("reservation");
        localStorage.removeItem("remainingTime");
        setSeats((prevSeats) =>
          prevSeats.map((seat) => ({
            ...seat,
            selected: false,
            interaction_made_by_user: null,
          }))
        );
      } catch (error) {
        console.error("Error handling before unload:", error.message);
      }
    };
  
    window.addEventListener("beforeunload", handleBeforeUnload);
  
    return () => {
      seatsSubscription.unsubscribe();
      if (timerId) clearInterval(timerId);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [eventId, token, resetSelectedSeats]);
  
  

  // Cleanup function to handle seat reset on component unmount
  useEffect(() => {
    return () => {
      resetSelectedSeats();
      if (timerId) clearInterval(timerId);
    };
  }, [resetSelectedSeats, timerId]);
  


  return (
    <>
      <Navbar
        navigateToHome={navigateToHome}
        navigateToEvents={navigateToEvents}
        navigateToCreateEvent={navigateToCreateEvent}
        handleLogout={handleLogout}
      />
      <div className="background-container"></div>
      <div className="page-container">
        <SeatsLayout seats={seats} toggleSeatSelection={toggleSeatSelection} />
        {selectedSeats.length > 0 && (
          <button className="reserve-button" onClick={handleReserveButtonClick}>
            RESERVE
          </button>
        )}
        {showComponent && (
          <ReservationTimer
            remainingTime={remainingTime}
            reservedSeats={reservedSeats}
            handleConfirmOrderButtonClick={handleConfirmOrderButtonClick}
          />
        )}
      </div>
    </>
  );
};

export default ReserveSeatsPage;
