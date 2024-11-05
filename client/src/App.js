// src/App.js
import React, { useState } from "react";
import Signin from "./components/Signin";
import Signup from "./components/Signup";
import "./App.css";

const App = () => {
  const [isSignin, setIsSignin] = useState(true);

  const toggleForm = () => {
    setIsSignin(!isSignin);
  };

  return (
    <div>
      <button onClick={toggleForm}>
        {isSignin ? "Switch to Signup" : "Switch to Signin"}
      </button>
      {isSignin ? <Signin /> : <Signup />}
    </div>
  );
};

export default App;
