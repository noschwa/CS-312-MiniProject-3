const express = require("express");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware to parse JSON
app.use(express.json());

// Serve static files from the React app's build directory
app.use(express.static(path.join(__dirname, "client/build")));

// Routes for signup and signin
app.post("/signup", (req, res) => {
  // Your signup logic here
});

app.post("/signin", (req, res) => {
  // Your signin logic here
});

// Fallback to serve React's index.html for all other requests
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "client/build", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
