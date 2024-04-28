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
      alert("All fields are required.");
      return;
    }
  
    if (!isValidEmail(formData.email)) {
      alert("Please enter a valid email address.");
      return;
    }
  
    if (formData.password.length < 6) {
      alert("Password must be at least 6 characters long.");
      return;
    }
  
    if (!isStrongPassword(formData.password)) {
      alert("Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.");
      return;
    }
  
    try {
      // eslint-disable-next-line no-unused-vars
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            age: 27, // just for example, you can remove this line if not needed
          },
        },
      });
      alert("Your account has been successfully registered. Please log in to access the page.");
      navigate('/');
    } catch (error) {
      alert(error.message);
    }
  }
  
  // Function to validate password complexity
  function isStrongPassword(password) {
    // Regular expressions for password validation
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
    // Regular expression for email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  return (
    <div className="signup-container">
      <h2 className="login-heading">SIGN UP</h2>
      <form onSubmit={handleSubmit} className="signup-form">
        <input
          className="signup-input"
          placeholder="Username"
          name="fullName"
          onChange={handleChange}
        />
        <input
          className="signup-input"
          placeholder="Email"
          name="email"
          onChange={handleChange}
        />
        <input
          className="signup-input"
          placeholder="Password"
          name="password"
          type="password"
          onChange={handleChange}
        />
        <button className="signup-button" type="submit">Submit</button>
      </form>
      <p className="signup-link-text">Already have an account? <Link to={"/"} className="signup-link">Login</Link></p>
    </div>
  );
};

export default SignUp;
