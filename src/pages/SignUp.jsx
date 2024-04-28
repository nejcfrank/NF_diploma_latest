/* eslint-disable no-unused-vars */
import React, { useState } from "react";
import { supabase } from "../client";
import { Link, useNavigate } from "react-router-dom";
import "./SignUp.css"; // Import CSS file

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
