import React from "react";
import PropTypes from "prop-types";
import "../styling/reserveseatspage.css";

const SeatsLayout = ({ seats, toggleSeatSelection }) => {
  // Define the number of seats in each row
  const rowSeatCounts = [24, 28, 28, 30, 30, 31, 30, 28, 25, 20, 19, 16, 25, 20, 19, 16];
  // Define seat labels (A, B, C, ...)
  const seatLabels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  return (
    <div className="page-container">
      <div className="top-left-corner">
        <p className="upp">SELECTED <div className="square yellow"></div></p>
        <p className="upp">UNAVAILABLE <div className="square red"></div></p>
        <p className="upp">AVAILABLE <div className="square green"></div></p>
        <p>RESERVED<div className="square orange"></div></p>
      </div>
      <div className="hall-layout">
        <div className="stage">STAGE</div>
        <h6 className="parter">PARTER</h6>
        <div className="seats-container">
          {rowSeatCounts.slice(0, 11).map((seatCount, rowIndex) => (
            <div
              className={`seats-row ${
                rowIndex === 5 ? "horizontal-gap" : ""
              }`}
              key={rowIndex}
            >
              <div className="seat-number">
                {seatLabels.charAt(rowIndex)}
              </div> {/* Display seat letter */}
              <div className="seats-row-container">
                {seats
                  .slice(
                    rowSeatCounts.slice(0, rowIndex).reduce((a, b) => a + b, 0),
                    rowSeatCounts.slice(0, rowIndex + 1).reduce((a, b) => a + b, 0)
                  )
                  .map((seat) => (
                    <div
                      key={seat.seat_id}
                      className={`seat ${
                        seat.selected
                          ? "selected"
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
        </div>
        <h6 className="balkon">BALKON</h6>
        <div className="seats-container">
          {rowSeatCounts.slice(11).map((seatCount, rowIndex) => (
            <div className="seats-row" key={rowIndex + 11}>
              <div className="seat-number">
                {seatLabels.charAt(rowIndex + 11)}
              </div> {/* Display seat letter */}
              <div className="seats-row-container">
                {seats
                  .slice(
                    rowSeatCounts.slice(0, rowIndex + 11).reduce((a, b) => a + b, 0),
                    rowSeatCounts.slice(0, rowIndex + 12).reduce((a, b) => a + b, 0)
                  )
                  .map((seat) => (
                    <div
                      key={seat.seat_id}
                      className={`seat ${
                        seat.selected
                          ? "selected"
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
        </div>
      </div>
    </div>
  );
};

SeatsLayout.propTypes = {
  seats: PropTypes.arrayOf(
    PropTypes.shape({
      seat_id: PropTypes.number.isRequired,
      selected: PropTypes.bool.isRequired,
      reserved: PropTypes.bool.isRequired,
      availability: PropTypes.bool.isRequired,
    })
  ).isRequired,
  toggleSeatSelection: PropTypes.func.isRequired,
};

export default SeatsLayout;
