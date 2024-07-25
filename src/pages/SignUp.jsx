/* eslint-disable no-unused-vars */
import React, { useState } from "react";
import { supabase } from "../client";
import { Link, useNavigate } from "react-router-dom";
import "../styling/SignUp.css"; // Import CSS file

const SignUp = () => {
  let navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function handleChange(event) {
    setFormData((prevFormData) => ({
      ...prevFormData,
      [event.target.name]: event.target.value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
  
    // Validation
    if (!formData.fullName || !formData.email || !formData.password) {
      setError("All fields are required.");
      return;
    }
  
    if (!isValidEmail(formData.email)) {
      setError("Please enter a valid email address.");
      return;
    }
  
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
  
    if (!isStrongPassword(formData.password)) {
      setError("Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.");
      return;
    }
  
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            age: 27, // Example; adjust as needed
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes("already")) {
          setError("This email is already taken.");
        } else {
          setError(signUpError.message);
        }
        return;
      }

      setSuccess("Your account has been successfully registered. Please log in to access the page.");
      navigate('/');
    } catch (error) {
      setError("An unexpected error occurred. Please try again.");
    }
  }
  
  // Function to validate password complexity
  function isStrongPassword(password) {
    const uppercaseRegex = /[A-Z]/;
    const lowercaseRegex = /[a-z]/;
    const numberRegex = /[0-9]/;
    const specialCharRegex = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;
  
    return (
      uppercaseRegex.test(password) &&
      lowercaseRegex.test(password) &&
      numberRegex.test(password) &&
      specialCharRegex.test(password)
    );
  }
  
  // Function to validate email format
  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  return (
    <div className="signup-container">
      <h2 className="signup-heading">Sign Up</h2>
      <form onSubmit={handleSubmit} className="signup-form">
        <input
          className="signup-input"
          placeholder="Full Name"
          name="fullName"
          value={formData.fullName}
          onChange={handleChange}
        />
        <input
          className="signup-input"
          placeholder="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
        />
        <input
          className="signup-input"
          placeholder="Password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
        />
        <button className="signup-button" type="submit">Submit</button>
      </form>
      {error && <p className="error-message">{error}</p>}
      {success && <p className="success-message">{success}</p>}
      <p className="signup-link-text">
        Already have an account? <Link to={"/"} className="signup-link">Login</Link>
      </p>
    </div>
  );
};

export default SignUp;
