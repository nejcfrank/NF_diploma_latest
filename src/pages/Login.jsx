/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
/* eslint-disable react/no-unescaped-entities */
import React, { useState } from "react";
import { supabase } from "../client";
import { Link, useNavigate } from "react-router-dom";
import "../styling/Login.css"; // Import CSS file

const Login = ({ setToken }) => {
  let navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  function handleChange(event) {
    setFormData((prevFormData) => ({
      ...prevFormData,
      [event.target.name]: event.target.value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });
  
      if (error) {
        if (error.message === "Invalid login credentials") {
          throw new Error("Invalid email or password. Please try again.");
        }
        throw error;
      }
  
      sessionStorage.setItem("token", JSON.stringify(data));
      setToken(data);
      navigate("/homepage");
    } catch (error) {
      alert(error.message);
    }
  }

  return (
    <div className="login-container">
      <h2 className="login-heading">LOGIN</h2>
      <form onSubmit={handleSubmit} className="login-form">
        <input
          className="login-input"
          placeholder="Email"
          name="email"
          value={formData.email}
          onChange={handleChange}
        />
        <input
          className="login-input"
          placeholder="Password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
        />
        <button className="login-button" type="submit">
          Submit
        </button>
      </form>
      <p className="login-link-text">
        Don't have an account?{" "}
        <Link to={"/signup"} className="login-link">
          Sign Up
        </Link>
      </p>
    </div>
  );
};

export default Login;
