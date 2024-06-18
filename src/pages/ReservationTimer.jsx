import React from 'react';

const ReservationTimer = ({ remainingTime, handleConfirmOrderButtonClick}) => {
  return (
    <div className="corner-component">
      <div className="reservation-timer">
        Reservation expires in: <span className="timer">{remainingTime}</span> seconds
      </div>


      <button className="confirm-order-button" onClick={handleConfirmOrderButtonClick}>
        Confirm Order
      </button>
    </div>
  );
};

export default ReservationTimer;
