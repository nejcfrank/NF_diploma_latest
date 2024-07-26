import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../client'; // Ensure you have configured supabase client
import Navbar from './Navbar'; // Adjust the path as needed
import '../styling/orderdetails.css'; // Ensure you have this CSS file for styling

const OrderDetails = ({ token }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const [tickets, setTickets] = useState([]);
  const [event, setEvent] = useState(null);
  const [hall, setHall] = useState(null);
  const [totalPayment, setTotalPayment] = useState(0);

  // Retrieve state from the previous page
  const { tickets: ticketsFromLocation } = location.state || {};

  useEffect(() => {
    const fetchData = async () => {
      if (!ticketsFromLocation || ticketsFromLocation.length === 0) {
        return;
      }

      // Fetch event and hall details
      const eventId = ticketsFromLocation[0].event_id;

      // Fetch event details
      const { data: eventData, error: eventError } = await supabase
        .from('event')
        .select('title, date, hall_id')
        .eq('event_id', eventId)
        .single();

      if (eventError) {
        console.error('Error fetching event data:', eventError.message);
        return;
      }

      setEvent(eventData);

      // Fetch hall details
      const hallId = eventData.hall_id;
      const { data: hallData, error: hallError } = await supabase
        .from('halls')
        .select('name')
        .eq('hall_id', hallId)
        .single();

      if (hallError) {
        console.error('Error fetching hall data:', hallError.message);
        return;
      }

      setHall(hallData);

      // Fetch tickets and join with seats table to get seat_position
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('tickets')
        .select('tickets_id, price, seats(seat_position)')
        .eq('event_id', eventId)
        .in('tickets_id', ticketsFromLocation.map(ticket => ticket.tickets_id)); // Assuming ticketsFromLocation has ids

      if (ticketsError) {
        console.error('Error fetching tickets data:', ticketsError.message);
        return;
      }

      setTickets(ticketsData);

      // Calculate total payment
      const total = ticketsData.reduce((acc, ticket) => acc + ticket.price, 0);
      setTotalPayment(total);
    };

    fetchData();
  }, [ticketsFromLocation, token]);

  if (!tickets.length) {
    return <div>No tickets to display.</div>;
  }

  return (
    <div className="order-details-wrapper">
      <Navbar token={token} navigateToHome={() => navigate('/homepage')} />
      <div className="order-details-content">
        <h1>Order Summary</h1>
        <div className="buyer-info">
          <h2>Buyer Information</h2>
          <p>Username: {token.user.user_metadata.full_name}</p>
          <p>Email: {token.user.user_metadata.email}</p>
        </div>
        {event && hall && (
          <>
            <div className="event-info">
              <h2>Event Details</h2>
              <p>Event: {event.title}</p>
              <p>Hall: {hall.name}</p>
            </div>
            <div className="ticket-info">
              <h2>Tickets</h2>
              <ul className="order-details-list">
                {tickets.map((ticket) => (
                  <li key={ticket.tickets_id} className="order-details-item">
                    <span>Seat: {ticket.seats?.seat_position || 'N/A'}</span>
                    <span>Price: {ticket.price} €</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="total-payment">
              <h2>Total: {totalPayment} €</h2>
              
            </div>
          </>
        )}
        <button className="back-button" onClick={() => navigate('/homepage')}>Back to Home</button>
      </div>
    </div>
  );
};

export default OrderDetails;
