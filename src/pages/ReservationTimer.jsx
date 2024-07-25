import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { supabase } from "../client";

const ReservationTimer = ({
  remainingTime,
  reservedSeats,
  handleConfirmOrderButtonClick,
}) => {
  const [seatPrices, setSeatPrices] = useState({});
  const [seatPositions, setSeatPositions] = useState({});
  const [totalPrice, setTotalPrice] = useState(0);

// Inside ReservationTimer component

useEffect(() => {
  const fetchSeatDetails = async () => {
    try {
      // Fetch prices and seat positions based on reserved seats
      const { data: ticketData, error: ticketError } = await supabase
        .from("tickets")
        .select("seat_id, price")
        .in("seat_id", reservedSeats);

      if (ticketError) throw ticketError;

      const seatIds = [...new Set(ticketData.map(ticket => ticket.seat_id))];

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

      // Map seat_id to price
      const priceMap = {};
      let total = 0;
      ticketData.forEach(ticket => {
        if (!priceMap[ticket.seat_id]) {
          priceMap[ticket.seat_id] = ticket.price;
          total += ticket.price || 0;
        }
      });

      setSeatPositions(seatPositionMap);
      setSeatPrices(priceMap);
      setTotalPrice(total);
    } catch (error) {
      console.error("Error fetching seat details:", error.message);
    }
  };

  if (reservedSeats.length > 0) {
    fetchSeatDetails();
  }
}, [reservedSeats]);


  return (
    <div className="corner-component">
      <h1>CART</h1>
      <div className="reservation-timer">
        Reservation expires in: <span className="timer">{remainingTime}</span>{" "}
        seconds
      </div>
      <div className="order-details">
        <h3>ORDER DETAILS</h3>
        {reservedSeats.map((seatId) => (
          <div key={seatId}>
            Seat Position: {seatPositions[seatId] || "N/A"} | Price: €{seatPrices[seatId] || "N/A"}
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
    </div>
  );
};

ReservationTimer.propTypes = {
  remainingTime: PropTypes.number.isRequired,
  reservedSeats: PropTypes.array.isRequired,
  handleConfirmOrderButtonClick: PropTypes.func.isRequired,
};

export default ReservationTimer;
