import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { supabase } from "../client";
import "../styling/reserveseatspage.css";

const ReservationTimer = ({
  remainingTime,
  reservedSeats,
  handleConfirmOrderButtonClick,
  handleCancelReservationClick, // Add this prop
}) => {
  const [seatDetails, setSeatDetails] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);

  useEffect(() => {
    const fetchSeatDetails = async () => {
      try {
        // Fetch ticket data
        const { data: ticketData, error: ticketError } = await supabase
          .from("tickets")
          .select("seat_id, price, event_id, hall_id")
          .in("seat_id", reservedSeats);

        if (ticketError) throw ticketError;

        const seatIds = [...new Set(ticketData.map(ticket => ticket.seat_id))];

        // Fetch seat positions
        const { data: seatData, error: seatError } = await supabase
          .from("seats")
          .select("seat_id, seat_position")
          .in("seat_id", seatIds);

        if (seatError) throw seatError;

        // Map seat_id to seat_position
        const seatPositionMap = {};
        seatData.forEach(seat => {
          seatPositionMap[seat.seat_id] = seat.seat_position;
        });

        // Map event_id to event title and hall_id
        const eventIds = [...new Set(ticketData.map(ticket => ticket.event_id))];
        const { data: eventData, error: eventError } = await supabase
          .from("event")
          .select("event_id, title, hall_id")
          .in("event_id", eventIds);

        if (eventError) throw eventError;

        // Map hall_id to hall name
        const hallIds = [...new Set(eventData.map(event => event.hall_id))];
        const { data: hallData, error: hallError } = await supabase
          .from("halls")
          .select("hall_id, name")
          .in("hall_id", hallIds);

        if (hallError) throw hallError;

        // Create a map of event and hall details
        const eventMap = {};
        eventData.forEach(event => {
          eventMap[event.event_id] = {
            title: event.title,
            hallId: event.hall_id,
          };
        });

        const hallMap = {};
        hallData.forEach(hall => {
          hallMap[hall.hall_id] = hall.name;
        });

        // Combine all the details
        const detailedSeats = ticketData.map(ticket => {
          const seatPosition = seatPositionMap[ticket.seat_id];
          const event = eventMap[ticket.event_id] || {};
          const hallName = hallMap[event.hallId] || "N/A";
          return {
            seatId: ticket.seat_id,
            seatPosition,
            price: ticket.price,
            eventTitle: event.title || "N/A",
            hallName,
          };
        });

        // Calculate total price
        const total = detailedSeats.reduce((acc, seat) => acc + (seat.price || 0), 0);
        setSeatDetails(detailedSeats);
        setTotalPrice(total);
      } catch (error) {
        console.error("Error fetching seat details:", error.message);
      }
    };

    if (reservedSeats.length > 0) {
      fetchSeatDetails();
    }
  }, [reservedSeats]);

  const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  return (
    <div className="reservation-timer-container">
      <h1 className="title">CART</h1>
      <div className="reservation-timer">
        Reservation expires in: <span className="timer">{formatTime(remainingTime)}</span>
        <hr></hr>
      </div>
      <div className="order-details">
        <h3 className="details-title">ORDER DETAILS</h3>
        {seatDetails.map(({ seatId, seatPosition, price, eventTitle, hallName }) => (
          <div key={seatId} className="seat-detail">
            <div className="seat-detail-header">
              <strong>Seat Position:</strong> {seatPosition || "N/A"}
            </div>
            <div className="seat-detail-body">
              <div><strong>Price:</strong> €{price || "N/A"}</div>
              <br />
              <div><strong>Event:</strong> {eventTitle}</div>
              <div><strong>Hall:</strong> {hallName}</div>
            </div>
            <hr />
          </div>
        ))}
        <div className="total-price">
          <strong>Total Price: €{totalPrice}</strong>
        </div>
      </div>
      <button
        className="confirm-order-button"
        onClick={handleConfirmOrderButtonClick}
      >
        BUY NOW
      </button>
      <button
        className="cancel-reservation-button"
        onClick={handleCancelReservationClick} // Handle cancel reservation
      >
        CANCEL RESERVATION
      </button>
    </div>
  );
};

ReservationTimer.propTypes = {
  remainingTime: PropTypes.number.isRequired,
  reservedSeats: PropTypes.array.isRequired,
  handleConfirmOrderButtonClick: PropTypes.func.isRequired,
  handleCancelReservationClick: PropTypes.func.isRequired, // Add this prop type
};

export default ReservationTimer;
