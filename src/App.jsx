import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { SignUp, Login, Homepage, OrderDetails } from "./pages"; // Add OrderDetails to imports
import ReserveSeatsPage from "./pages/ReserveSeatsPage";
import CreateEvent from "./pages/CreateEvent";

const App = () => {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = sessionStorage.getItem("token");
    if (storedToken) {
      setToken(JSON.parse(storedToken));
    }
    setLoading(false);
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  // Check if the user is an admin
  const isAdmin = token?.user?.user_metadata?.role === 'admin';

  return (
    <div>
      <Routes>
        <Route path="/signup" element={<SignUp />} />
        <Route path="/" element={<Login setToken={setToken} />} />
        {token && <Route path="/homepage" element={<Homepage token={token} />} />}
        {token && <Route path="/homepage/:eventLocation/:eventId" element={<ReserveSeatsPage token={token} />} />}
        {/* Pass token to OrderDetails route */}
        <Route path="/order-details" element={<OrderDetails token={token} />} />
        {/* Conditionally render CreateEvent route based on admin role */}
        <Route
          path="/create-event"
          element={isAdmin ? <CreateEvent token={token} /> : <Navigate to="/homepage" />}
        />
      </Routes>
    </div>
  );
};

export default App;
