import React, { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { SignUp, Login, Homepage } from "./pages";
import ReserveSeatsPage from "./pages/ReserveSeatsPage";

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

  return (
    <div>
      <Routes>
        <Route path="/signup" element={<SignUp />} />
        <Route path="/" element={<Login setToken={setToken} />} />
        {token && <Route path="/homepage" element={<Homepage token={token} />} />}
        {token && <Route path="/homepage/:eventLocation/:eventId" element={<ReserveSeatsPage />} />}
      </Routes>
    </div>
  );
};

export default App;
