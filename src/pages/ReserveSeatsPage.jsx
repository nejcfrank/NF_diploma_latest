import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../client";
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
  const [remainingTime, setRemainingTime] = useState(300);
  const timerId = useRef(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Function to fetch and process seat data
  const fetchSeats = async () => {
    try {
      // Fetch ticket and seat data with a join, including hall_id
      const { data: tickets, error: ticketsError } = await supabase
        .from("tickets")
        .select(
          `
        *,
        seats: seat_id (seat_position),
        hall_id
      `
        )
        .eq("event_id", eventId)
        .order("seat_id", { ascending: true });

      if (ticketsError) throw ticketsError;

      // Create a mapping of seat positions to their respective seat IDs
      const seatMapping = tickets.reduce((acc, ticket) => {
        const seatPosition = ticket.seats?.seat_position; // Retrieve seat_position from the joined seat data

        if (!seatPosition) {
          console.warn(
            `Seat position is missing for seat_id: ${ticket.seat_id}`
          );
          return acc;
        }

        const rowMatch = seatPosition.match(/[A-Z]+/);
        const numberMatch = seatPosition.match(/\d+/);

        if (!rowMatch || !numberMatch) {
          console.warn(
            `Invalid seat position format for seat_id: ${ticket.seat_id}`
          );
          return acc;
        }

        const row = rowMatch[0];
        const number = parseInt(numberMatch[0], 10);

        if (!acc[row]) {
          acc[row] = [];
        }

        acc[row].push({ ...ticket, row, number });
        return acc;
      }, {});

      // Sort seats within each row by seat number
      const sortedSeats = Object.keys(seatMapping)
        .sort() // Sort rows (e.g., 'A', 'B', 'C', ...)
        .reduce((acc, row) => {
          const seatsInRow = seatMapping[row];
          seatsInRow.sort((a, b) => a.number - b.number); // Sort seats within the row by number
          return acc.concat(seatsInRow);
        }, []);

      // Update the seat states
      const updatedSeats = sortedSeats.map((ticket) => ({
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
      alert(
        "You cannot unselect this seat because it was not selected by you."
      );
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
      const event = await fetchEventDetails();

      if (!event) {
        alert("Error fetching event details.");
        return;
      }

      if (isEventStarted(event.date)) {
        alert("The event has already started. You cannot reserve tickets.");
        navigate("/homepage");
        return;
      }

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
        alert(
          "One or more of the selected seats are already reserved or unavailable."
        );
        return;
      }

      const now = new Date();
      const expirationTime = now.getTime() + 300000; // 1 minute from now

      const storedReservation = JSON.parse(
        localStorage.getItem("reservation")
      ) || { seats: [] };

      if (storedReservation.seats.length > 0) {
        const updateReservedAtPromises = storedReservation.seats.map(
          (seatId) => {
            return supabase
              .from("tickets")
              .update({ reserved_at: now })
              .eq("seat_id", seatId)
              .eq("event_id", eventId);
          }
        );
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

      if (timerId.current) {
        clearInterval(timerId.current);
      }
      startTimer(300);

      localStorage.setItem("showComponent", "true");
      setShowComponent(true);
    } catch (error) {
      console.error("Error processing reserve operation:", error.message);
    }
  };

  const handleCancelReservationClick = async () => {
    try {
      const userId = token.user.user_metadata.sub;
      const storedReservation = JSON.parse(localStorage.getItem("reservation"));
      const seatsToCancel = storedReservation ? storedReservation.seats : [];

      if (seatsToCancel.length === 0) {
        alert("No reservations to cancel.");
        return;
      }

      // Update seats to mark them as not reserved
      const { error: updateError } = await supabase
        .from("tickets")
        .update({
          reserved: false,
          reserved_at: null,
          interaction_made_by_user: null,
        })
        .in("seat_id", seatsToCancel)
        .eq("event_id", eventId)
        .eq("interaction_made_by_user", userId); // Ensure the user is the one who reserved the seats

      if (updateError) throw updateError;

      // Fetch the updated seat data
      await fetchSeats(); // Refresh seat data

      // Cleanup
      localStorage.removeItem("reservation");
      localStorage.removeItem("remainingTime");
      setShowComponent(false);
      setSelectedSeats([]);
      setReservedSeats([]);
    } catch (error) {
      console.error("Error canceling reservation:", error.message);
    }
  };

  // Start the reservation timer
  const startTimer = (initialTime) => {
    let timeLeft = initialTime;

    timerId.current = setInterval(() => {
      timeLeft -= 1;
      if (timeLeft < 0) {
        clearInterval(timerId.current);
        handleReservationExpiration();
        return;
      }
      setRemainingTime(timeLeft);
      localStorage.setItem("remainingTime", timeLeft);
    }, 1000);
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
        .filter((seat) => seat.selected && !seat.reserved) // Only reset seats that are selected and not reserved
        .map((seat) => seat.seat_id);

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
      const event = await fetchEventDetails();

      if (!event) {
        alert("Error fetching event details.");
        return;
      }

      if (isEventStarted(event.date)) {
        alert("The event has already started. You cannot buy tickets.");
        navigate("/homepage");
        return;
      }

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

      // Redirect to OrderDetails with ticket info
      navigate("/order-details", { state: { tickets: updatedSeatsData } });

      // Cleanup
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
  const isEventStarted = (eventDate) => {
    const now = new Date();
    return now > new Date(eventDate);
  };

  const fetchEventDetails = async () => {
    try {
      const { data: event, error } = await supabase
        .from("event")
        .select("date")
        .eq("event_id", eventId)
        .single();

      if (error) throw error;

      return event;
    } catch (error) {
      console.error("Error fetching event details:", error.message);
      return null;
    }
  };

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
      if (timerId.current) clearInterval(timerId.current);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [eventId, token, resetSelectedSeats]);

  // Cleanup function to handle seat reset on component unmount
  useEffect(() => {
    return () => {
      resetSelectedSeats();
      if (timerId.current) clearInterval(timerId.current);
    };
  }, [resetSelectedSeats]);

  const seatMapping = seats.reduce((acc, seat) => {
    if (!acc[seat.row]) acc[seat.row] = [];
    acc[seat.row].push(seat);
    return acc;
  }, {});

  // Handle zoom in
  const handleZoomIn = () => {
    setZoomLevel((prevZoomLevel) => Math.min(prevZoomLevel + 0.1, 3)); // Increase zoom level, with a max of 3
  };

  // Handle zoom out
  const handleZoomOut = () => {
    setZoomLevel((prevZoomLevel) => Math.max(prevZoomLevel - 0.1, 0.5)); // Decrease zoom level, with a min of 0.5
  };

  /*
const stressTest = async () => {
  const promises = [];
  const now = new Date(); // Get the current time
  const utcNow = now.toISOString(); // Convert to UTC ISO string

  // Create 50 reservation attempts
  for (let index = 0; index < 50; index++) {
    promises.push(
      supabase
        .from("tickets")
        .update({
          reserved: true,
          reserved_at: utcNow,
          interaction_made_by_user: index + 1,
          selected: false,
        })
        .eq("seat_id", selectedSeats[0])
        .eq("event_id", eventId)
    );
  }

  // Handle the results of all promises
  try {
    const results = await Promise.allSettled(promises); // Promise.all ensures all are called at once

    // Track successful reservation
    let successfulReservation = null;

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        console.log(
          `Promise ${index + 1} resolved with value:`,
          result.value
        );
        // Check if the reservation was successful and store the result
        if (!successfulReservation) {
          successfulReservation = {
            index: index + 1,
            ...result.value,
          };
        }
      } else {
        console.error(
          `Promise ${index + 1} rejected with reason:`,
          result.reason
        );
      }
    });

    // Log the details of the successful reservation
    if (successfulReservation) {
      console.log(
        `Successfully reserved seat with request number ${successfulReservation.index}`
      );
      console.log(`Details:`, successfulReservation);
    } else {
      console.log("No successful reservations.");
    }
  } catch (error) {
    console.error("Error in stress test:", error.message);
  }
};
*/


  return (
    <>
      <Navbar
        navigateToHome={() => navigate("/homepage")}
        navigateToEvents={() => navigate("/homepage")}
        navigateToCreateEvent={() => navigate("/create-event")}
        handleLogout={handleLogout}
      />
      <div className="background-container"></div>
      <div className="page-container">
        {/*
      {token?.user?.user_metadata?.role === "admin" && (
        <button className="stresstest" onClick={stressTest}>
          STRESS TEST
        </button>
      )}
      */}
        <div className="hall-layout">
          <div className="zoom-controls">
            <button onClick={handleZoomIn}>+</button>
            <button onClick={handleZoomOut}>-</button>
          </div>
          <div
            className="seats-container"
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: "center center",
            }}
          >
            <div className="stage">STAGE</div>
            {Object.keys(seatMapping).map((row, rowIndex) => (
              <div className="seats-row" key={rowIndex}>
                <div className="seat-number">{row}</div>{" "}
                {/* Row labels (A, B, C, ...) */}
                <div className="seats-row-container">
                  {seatMapping[row].map((seat) => (
                    <div
                      key={seat.seat_id}
                      className={`seat ${
                        seat.selected
                          ? seat.isUserSelection
                            ? "user-selection"
                            : "selected"
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
            ))}
            {selectedSeats.length > 0 && (
              <button
                className="reserve-button"
                onClick={handleReserveButtonClick}
              >
                RESERVE
              </button>
            )}
          </div>
        </div>

        {showComponent && (
          <ReservationTimer
            remainingTime={remainingTime}
            reservedSeats={reservedSeats}
            handleConfirmOrderButtonClick={handleConfirmOrderButtonClick}
            handleCancelReservationClick={handleCancelReservationClick}
          />
        )}
      </div>
    </>
  );
};

export default ReserveSeatsPage;
