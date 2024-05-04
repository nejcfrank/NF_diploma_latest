// eslint-disable-next-line no-unused-vars
import React, { useState, useEffect } from "react";
import { SignUp, Login, Homepage } from "./pages";
import { Routes, Route } from "react-router-dom";
import ReserveSeatsPage from "./pages/ReserveSeatsPage";

const App = () => {
  const [token, setToken] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("token")) {
      let data = JSON.parse(sessionStorage.getItem("token"));
      setToken(data);
    }
  }, []);

  return (
    <div>
      <Routes>
        <Route path={"/signup"} element={<SignUp />} />
        <Route path={"/"} element={<Login setToken={setToken} />} />
        {token && <Route path={"/homepage"} element={<Homepage token={token} />} />}
        {token && <Route path={"/:eventLocation/:eventId"} element={<ReserveSeatsPage />} />}
      </Routes>
    </div>
  );
};

export default App;
