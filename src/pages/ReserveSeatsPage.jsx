import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom"; // Import useNavigate
import { supabase } from "../client";
import SeatsLayout from "./SeatsLayout";
import ReservationTimer from "./ReservationTimer";
import "../styling/reserveseatspage.css";

const ReserveSeatsPage = ({ token }) => {
  const { eventId } = useParams();
  const navigate = useNavigate(); // Initialize navigate
  const [seats, setSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [reservedSeats, setReservedSeats] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [showComponent, setShowComponent] = useState(false);
  const [remainingTime, setRemainingTime] = useState(60);
  const [timerId, setTimerId] = useState(null);

  useEffect(() => {
    fetchSeats(); // Fetch seats when component mounts

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
        setReservedSeats(storedReservation.seats); // Update reserved seats state
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
            .from("tickets")
            .select("*")
            .eq("event_id", eventId)
            .order("seat_id", { ascending: true });

        if (error) {
            throw error;
        }

        const updatedSeats = data.map((ticket) => ({
            ...ticket,
            selected: ticket.selected || false,
            highlight: ticket.reserved || ticket.selected,
            isUserSelection: ticket.selected && ticket.interaction_made_by_user === token.user.user_metadata.sub,
        }));

        setSeats(updatedSeats);
    } catch (error) {
        console.error("Error fetching tickets:", error.message);
    }
};


const handleSeatUpdate = () => {
  fetchSeats(); // Fetch seats after an update
};

const toggleSeatSelection = async (seatId) => {
  const seatIndex = seats.findIndex((seat) => seat.seat_id === seatId);
  if (seatIndex === -1) return; // Seat not found

  const selectedSeat = seats[seatIndex];

  // Check seat availability and current reservation status
  if (selectedSeat.reserved || selectedSeat.bought_at || !selectedSeat.availability) {
      alert("This seat has already been sold, reserved, or is unavailable.");
      return;
  }

  const newSelectedStatus = !selectedSeat.selected;

  // If trying to unselect, check if the current user is the one who selected the seat
  if (!newSelectedStatus && selectedSeat.interaction_made_by_user !== token.user.user_metadata.sub) {
      alert("You cannot unselect this seat because it was not selected by you.");
      return;
  }

  // Update local state
  const updatedSeats = [...seats];
  updatedSeats[seatIndex] = {
      ...updatedSeats[seatIndex],
      selected: newSelectedStatus,
      interaction_made_by_user: newSelectedStatus ? token.user.user_metadata.sub : null,
      isUserSelection: newSelectedStatus,
  };

  setSeats(updatedSeats);

  // Update the ticket in the database
  try {
      const { error } = await supabase
          .from("tickets")
          .update({
              selected: newSelectedStatus,
              interaction_made_by_user: newSelectedStatus ? token.user.user_metadata.sub : null,
          })
          .eq("seat_id", seatId)
          .eq("event_id", eventId); // Ensure event_id is included in the update query

      if (error) {
          throw error;
      }

      // Update selectedSeats array in state
      const selectedSeatIds = updatedSeats.filter((seat) => seat.selected).map((seat) => seat.seat_id);
      setSelectedSeats(selectedSeatIds);
  } catch (error) {
      console.error("Error updating seat reservation status:", error.message);
  }
};


const handleReserveButtonClick = async () => {
  try {
      // Filter out seats selected by other users
      const userSelectedSeats = selectedSeats.filter((seatId) => {
          const seat = seats.find((s) => s.seat_id === seatId);
          return seat && seat.isUserSelection;
      });

      if (userSelectedSeats.length === 0) {
          alert("No seats selected by you to reserve.");
          return;
      }

      // Check if any of the user-selected seats are already reserved
      const { data: reservedSeats, error: reservedError } = await supabase
          .from("tickets")
          .select("seat_id")
          .in("seat_id", userSelectedSeats)
          .eq("reserved", true)
          .eq("event_id", eventId); // Ensure event_id is included in the query

      if (reservedError) {
          throw reservedError;
      }

      // Check if any of the user-selected seats are unavailable
      const { data: unavailableSeats, error: availabilityError } = await supabase
          .from("tickets")
          .select("seat_id")
          .in("seat_id", userSelectedSeats)
          .eq("availability", false)
          .eq("event_id", eventId); // Ensure event_id is included in the query

      if (availabilityError) {
          throw availabilityError;
      }

      // If any seats are unavailable or already reserved, show an alert and exit
      if (unavailableSeats.length > 0 || reservedSeats.length > 0) {
          alert("One or more of the selected seats are already reserved or unavailable.");
          return;
      }

      const now = new Date();
      const expirationTime = now.getTime() + 60000; // 1 minute from now

      // Retrieve any existing reservation details from local storage
      const storedReservation = JSON.parse(localStorage.getItem("reservation")) || { seats: [] };

      // Update the reserved_at timestamp for already reserved seats
      if (storedReservation.seats.length > 0) {
          const updateReservedAtPromises = storedReservation.seats.map((seatId) => {
              return supabase
                  .from("tickets")
                  .update({ reserved_at: now })
                  .eq("seat_id", seatId)
                  .eq("event_id", eventId); // Ensure event_id is included in the update query
          });
          await Promise.all(updateReservedAtPromises);
      }

      // Update reservation details
      const reservationDetails = {
          seats: [...new Set([...storedReservation.seats, ...userSelectedSeats])],
          expirationTime,
      };
      localStorage.setItem("reservation", JSON.stringify(reservationDetails));

      // Reserve the selected tickets
      const reservePromises = userSelectedSeats.map((seatId) => {
          return supabase
              .from("tickets")
              .update({
                  reserved: true,
                  reserved_at: now,
                  interaction_made_by_user: token.user.user_metadata.sub,
                  selected: false, // Ensure selected is reset
              })
              .eq("seat_id", seatId)
              .eq("event_id", eventId); // Ensure event_id is included in the update query
      });

      await Promise.all(reservePromises);

      // Update the seats state with the newly reserved seats
      const updatedSeats = seats.map((seat) =>
          reservationDetails.seats.includes(seat.seat_id)
              ? { ...seat, reserved: true, reserved_at: now, selected: false }
              : seat
      );

      setSeats(updatedSeats);
      setSelectedSeats([]);
      setReservedSeats(reservationDetails.seats);

      if (timerId) {
          clearInterval(timerId); // Clear previous timer
      }
      startTimer(60); // Start or restart timer for 60 seconds

      localStorage.setItem("showComponent", "true");
      setShowComponent(true);
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

      const { error: updateError } = await supabase
        .from("tickets")
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
        .from("tickets")
        .select("*")
        .in("seat_id", seatsToBuy);

      if (fetchError) {
        throw fetchError;
      }

      setSeats(updatedSeatsData);
      localStorage.removeItem("reservation");
      localStorage.removeItem("remainingTime");
      setShowComponent(false);
    } catch (error) {
      console.error("Error confirming order:", error.message);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    navigate("/"); // Navigate to homepage on logout
  };

  const navigateToEvents = () => {
    navigate("/homepage"); // Navigate to homepage
  };

  const navigateToCreateEvent = () => {
    navigate("/create-event"); // Navigate to create event page
  };
  const navigateToHome = () => {
    navigate("/homepage"); // Navigate to create event page
  };

  return (
    <>
      <nav className="navbar">
        <div className="nav-item" onClick={navigateToHome}>
          <div className="nav-left"></div>
          <div className="logo"></div>
        </div>
        <div className="nav-right">
          <div className="nav-item dropdown-container">
            Help
            <div className="dropdown">
              <div className="top-left-corner">
                <div className="upp">
                  <p className="myselection">SELECTED BY ME</p>
                </div>

                <div className="upp">
                  <p className="yellow">SELECTED BY OTHER</p>
                </div>

                <div className="upp">
                  <p className="red">UNAVAILABLE</p>
                </div>
                <div className="upp">
                  <p className="green">AVAILABLE</p>
                </div>
                <div className="upp">
                  <p className="orange">RESERVED</p>
                </div>
              </div>
            </div>
          </div>
          <div className="nav-item" onClick={navigateToEvents}>
            Events
          </div>
          <div className="nav-item" onClick={navigateToCreateEvent}>
            Create Event
          </div>
          <div className="nav-item" onClick={handleLogout}>
            Logout
          </div>
          <div className="avatar-container">
            <div className="avatar"></div>
            <div className="tooltip">User Profile</div>
          </div>
        </div>
      </nav>
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
