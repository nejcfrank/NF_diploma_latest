import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../client";
import SeatsLayout from "./SeatsLayout";
import "../styling/reserveseatspage.css";

const ReserveSeatsPage = ({ token }) => {
  const { eventId } = useParams();
  const [seats, setSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0); // State to hold total price
  const intervalRef = useRef(null);
  const [showComponent, setShowComponent] = useState(false);
  const [remainingTime, setRemainingTime] = useState(60); // Initial remaining time is 60 seconds
  const [selectedSeatsData, setSelectedSeatsData] = useState([]); // State to hold data for selected seats

  useEffect(() => {
    fetchSeats(); // Fetch seats when component mounts
    // Subscribe to real-time changes in the "seats" table
    const seatsSubscription = supabase
      .channel("seats")
      .on("INSERT", handleSeatUpdate)
      .on("UPDATE", handleSeatUpdate)
      .on("DELETE", handleSeatUpdate)
      .subscribe();


      const intervalId = setInterval(() => {
        fetchSeats();
      }, 5000);
    // Clean up subscription and interval on component unmount
    return () => {
      seatsSubscription.unsubscribe();
      clearInterval(intervalId);
    };
  }, [eventId]);

  useEffect(() => {
    // Calculate total price whenever selected seats change
    const pricePerSeat = 10; // Set your price per seat here
    const totalPrice = selectedSeats.length * pricePerSeat;
    setTotalPrice(totalPrice);
  }, [selectedSeats]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      const reservationDetails = JSON.parse(
        localStorage.getItem("reservation")
      );
      if (reservationDetails) {
        const { expirationTime } = reservationDetails;
        if (new Date().getTime() < expirationTime) {
          // Reservation is active, prompt the user
          event.preventDefault();
          event.returnValue = ""; // Some browsers require a return value to display the confirmation message
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const fetchSeats = async () => {
    try {
      const { data, error } = await supabase
        .from('seats')
        .select('*')
        .eq('event_id', eventId)
        .order('seat_id', { ascending: true });
  
      if (error) {
        throw error;
      }
  
      // Preserve the selected state of seats
      const updatedSeats = data.map((seat) => ({
        ...seat,
        selected: selectedSeatsData.some((selectedSeat) => selectedSeat.seat_id === seat.seat_id),
      }));
  
      setSeats(updatedSeats);
    } catch (error) {
      console.error('Error fetching seats:', error.message);
    }
  };

  const handleSeatUpdate = () => {
    // Fetch only the selected seats and update them
    const selectedSeatIds = seats.filter((seat) => seat.selected).map((seat) => seat.seat_id);
    if (selectedSeatIds.length > 0) {
      fetchSelectedSeats(selectedSeatIds);
    } else {
      fetchSeats(); // Fetch all seats if no seats are selected
    }
  };
  
  // Fetch selected seats
  const fetchSelectedSeats = async (selectedSeatIds) => {
    try {
      const { data: selectedSeatsData, error } = await supabase
        .from('seats')
        .select('*')
        .in('seat_id', selectedSeatIds);
  
      if (error) {
        throw error;
      }
  
      setSelectedSeatsData(selectedSeatsData); // Update selected seats data
    } catch (error) {
      console.error('Error fetching selected seats:', error.message);
    }
  };
  const toggleSeatSelection = async (seatId) => {
    const seatIndex = seats.findIndex((seat) => seat.seat_id === seatId);
    if (seatIndex === -1) return; // Seat not found

    const selectedSeat = seats[seatIndex];

    // Check if the seat is already reserved, if yes, display a message
    if (selectedSeat.reserved) {
      alert("Apologies, but this seat has already been reserved.");
      fetchSeats(); // Refresh the seats to reflect the current state
      return; // Do nothing further if the seat is already reserved
    }

    // Check if the seat is already reserved or bought
    if (selectedSeat.reserved || selectedSeat.bought_at) {
      alert("Apologies, but this seat has already been sold or reserved.");
      return; // Do nothing if the seat is reserved or bought
    }

    // Toggle the selection status of the seat
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
      // Update the selected field in the database only if selection status has changed
      if (updatedSeat.selected !== seats[seatIndex].selected) {
        await supabase
          .from("seats")
          .update({ selected: updatedSeat.selected })
          .eq("seat_id", seatId);
      }
    } catch (error) {
      console.error("Error updating seat selection:", error.message);
    }
  };

  const handleBuyButtonClick = async () => {
    try {
      // Fetch the availability status of selected seats from the server
      const { data: seatAvailabilityBefore, error } = await supabase
        .from("seats")
        .select("*")
        .in("seat_id", selectedSeats);

      if (error) {
        throw error;
      }

      // Check if any of the selected seats are already taken or reserved
      const takenSeats = seatAvailabilityBefore.filter(
        (seat) => !seat.availability || seat.reserved
      );

      if (takenSeats.length > 0) {
        alert(
          "Sorry, some of the selected seats are already taken or reserved."
        );
        // Refresh the page to update seat availability
        window.location.reload(); // Refresh the page
        return;
      }

      // Proceed with buying the seats
      const { updateError } = await supabase
        .from("seats")
        .update({ selected: false, availability: false, bought_at: new Date() })
        .in("seat_id", selectedSeats);

      if (updateError) {
        throw updateError;
      }

      // Fetch the updated seat data after the purchase
      const { data: seatAvailabilityAfter, error: fetchError } = await supabase
        .from("seats")
        .select("*")
        .in("seat_id", selectedSeats);

      if (fetchError) {
        throw fetchError;
      }

      console.log("Seat data after purchase:", seatAvailabilityAfter);

      // Immediately update the local state to reflect the purchase
      const updatedSeats = seats.map((seat) =>
        selectedSeats.includes(seat.seat_id)
          ? { ...seat, selected: false, availability: false }
          : seat
      );
      setSeats(updatedSeats);
      setSelectedSeats([]); // Clear selected seats

      // Re-enable the periodic fetching of seats
    } catch (error) {
      console.error("Error processing buy operation:", error.message);
      // Refresh the page if an error occurs
      window.location.reload(); // Refresh the page
    }
  };

  const handleReserveButtonClick = async () => {
    try {
      // Fetch the availability status of selected seats from the server
      const { data: seatAvailabilityBefore, error } = await supabase
        .from("seats")
        .select("*")
        .in("seat_id", selectedSeats);

      if (error) {
        throw error;
      }

      const takenSeats = seatAvailabilityBefore.filter(
        (seat) => !seat.availability || seat.reserved
      );

      if (takenSeats.length > 0) {
        alert(
          "Sorry, some of the selected seats are already taken or reserved."
        );
        // Refresh the page to update seat availability
        window.location.reload(); // Refresh the page
        return;
      }

      const now = new Date();
      const expirationTime = new Date(now.getTime() + 60000); // Expiration time is 1 minute from now

      // Store reservation details in localStorage
      const reservationDetails = {
        seats: selectedSeats,
        expirationTime: expirationTime.getTime(), // Store expiration time as milliseconds
      };
      localStorage.setItem("reservation", JSON.stringify(reservationDetails));

      // Update reserved_at for newly reserved seats
      const reservePromises = selectedSeats.map(async (seatId) => {
        return supabase
          .from("seats")
          .update({
            reserved: true,
            reserved_at: now,
            bought_by_user: token.user.user_metadata.full_name,
          })
          .eq("seat_id", seatId);
      });

      // Wait for all updates to complete
      await Promise.all(reservePromises);

      // Fetch the updated seats after the reserve operation
      fetchSeats();

      // Set up timer to check for reservation expiration
      const intervalId = setInterval(() => {
        const reservationDetails = JSON.parse(
          localStorage.getItem("reservation")
        );
        if (reservationDetails) {
          const { expirationTime } = reservationDetails;
          if (new Date().getTime() >= expirationTime) {
            // Reservation has expired, clear reservation details and update seat status
            localStorage.removeItem("reservation");
            // Update reserved_at and bought_by_user to null for expired reservations
            const expirePromises = selectedSeats.map(async (seatId) => {
              return supabase
                .from("seats")
                .update({
                  reserved: false,
                  reserved_at: null,
                  bought_by_user: null,
                })
                .eq("seat_id", seatId);
            });
            // Wait for all updates to complete
            Promise.all(expirePromises).then(() => {
              // Refresh seats after expiration
              fetchSeats();
            });
            clearInterval(intervalId); // Stop checking for expiration once expired
          }
        }
      }, 1000); // Check every second for expiration
    } catch (error) {
      console.error("Error processing reserve operation:", error.message);
    }
    setShowComponent(true);
    const intervalId = setInterval(() => {
      setRemainingTime((prevTime) => prevTime - 1);
    }, 1000); // Update the remaining time every second

    // Set a timeout to close the window after 60 seconds
    setTimeout(() => {
      clearInterval(intervalId); // Stop the countdown timer
      setShowComponent(false); // Close the window
    }, 60000); // Close the window after 60 seconds
  };

  const handleConfirmOrderButtonClick = async () => {
    try {
      // Proceed with confirming the order
      const { updateError } = await supabase
        .from("seats")
        .update({
          availability: false,
          bought_at: new Date(),
          reserved: false,
          reserved_at: null,
        })
        .in("seat_id", selectedSeats);

      if (updateError) {
        throw updateError;
      }

      // Fetch the updated seat data after the order confirmation
      const { data: updatedSeatsData, error: fetchError } = await supabase
        .from("seats")
        .select("*")
        .in("seat_id", selectedSeats);

      if (fetchError) {
        throw fetchError;
      }

      console.log("Seat data after confirming order:", updatedSeatsData);

      // Clear selected seats
      setSelectedSeats([]);

      // Refresh seats
      fetchSeats();
     
    } catch (error) {
      console.error("Error processing order confirmation:", error.message);
    }
    
  };

  return (
    <div className="page-container">
      <SeatsLayout seats={seats} toggleSeatSelection={toggleSeatSelection} />
      {/* Render buttons if seats are selected */}
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
                CONFIRM ORDER {/* Display total price on the button */}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReserveSeatsPage;
