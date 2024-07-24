import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { supabase } from "../client";

const ReservationTimer = ({
  remainingTime,
  reservedSeats,
  handleConfirmOrderButtonClick,
}) => {
  const [seatPrices, setSeatPrices] = useState({});
  const [totalPrice, setTotalPrice] = useState(0);

  useEffect(() => {
    // Function to fetch seat prices for all reserved seats
    const fetchSeatPrices = async () => {
      try {
        const { data, error } = await supabase
          .from("seats")
          .select("seat_id, price")
          .in("seat_id", reservedSeats);

        if (error) {
          throw error;
        }

        // Create a map of seat_id to price
        const priceMap = {};
        let total = 0;
        data.forEach((seat) => {
          priceMap[seat.seat_id] = seat.price;
          total += seat.price || 0;
        });

        setSeatPrices(priceMap);
        setTotalPrice(total);
      } catch (error) {
        console.error("Error fetching seat prices:", error.message);
      }
    };

    if (reservedSeats.length > 0) {
      fetchSeatPrices();
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
            Seat number: {seatId} | Price: €{seatPrices[seatId] || "N/A"}
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
