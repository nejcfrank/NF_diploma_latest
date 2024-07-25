import React from "react";
import PropTypes from "prop-types";
import "../styling/reserveseatspage.css";

const SeatsLayout = ({ seats, toggleSeatSelection }) => {
  const rowSeatCounts = [24, ];
  const seatLabels = "ABCDEFG";

  return (
    <div className="hall-layout">
      <div className="stage">STAGE</div>
      <h6 className="parter">PARTER</h6>
      <div className="seats-container">
        {rowSeatCounts.slice(0, 11).map((seatCount, rowIndex) => (
          <div
            className={`seats-row ${rowIndex === 5 ? "horizontal-gap" : ""}`}
            key={rowIndex}
          >
            <div className="seat-number">{seatLabels.charAt(rowIndex)}</div>
            <div className="seats-row-container">
              {seats
                .slice(
                  rowSeatCounts.slice(0, rowIndex).reduce((a, b) => a + b, 0),
                  rowSeatCounts
                    .slice(0, rowIndex + 1)
                    .reduce((a, b) => a + b, 0)
                )
                .map((seat) => (
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
        {rowSeatCounts.slice(11).map((seatCount, rowIndex) => (
          <div className="seats-row" key={rowIndex + 11}>
            <div className="seat-number">
              {seatLabels.charAt(rowIndex + 11)}
            </div>
            <div className="seats-row-container">
              {seats
                .slice(
                  rowSeatCounts
                    .slice(0, rowIndex + 11)
                    .reduce((a, b) => a + b, 0),
                  rowSeatCounts
                    .slice(0, rowIndex + 12)
                    .reduce((a, b) => a + b, 0)
                )
                .map((seat) => (
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
      isUserSelection: PropTypes.bool.isRequired,
    })
  ).isRequired,
  toggleSeatSelection: PropTypes.func.isRequired,
};

export default SeatsLayout;
