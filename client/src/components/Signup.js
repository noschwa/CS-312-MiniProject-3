import React, { useState } from "react";
import axios from "axios";

const Signup = () => {
  const [userId, setUserId] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post("http://localhost:3000/signup", {
        user_id: userId,
        name: name,
        password: password,
      });
      alert(response.data.message);
    } catch (error) {
      console.error(error);
      alert(error.response?.data.message || "Signup failed");
    }
  };

  return (
    <form onSubmit={handleSignup}>
      <input
        type="text"
        placeholder="User ID"
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
        required
      />
      <input
        type="text"
        placeholder="Full Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <button type="submit">Signup</button>
    </form>
  );
};

export default Signup;
