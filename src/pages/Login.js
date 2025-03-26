// src/pages/Login.js
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useChessStore from "../store";
import { API_BASE_URL } from "../store"; // Ensure this is correctly defined
import { TextField, Button, Container, Typography, Tabs, Tab, Box } from "@mui/material";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [tabValue, setTabValue] = useState(0); // 0 for Login, 1 for Register
  const setToken = useChessStore((state) => state.setToken);
  const navigate = useNavigate();

  // Handle tab change between Login and Register
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setUsername(""); // Clear fields when switching tabs
    setPassword("");
  };

  // Login submission
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (response.ok) {
        setToken(data.token);
        navigate("/");
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error("Error logging in:", error);
      alert("An error occurred during login");
    }
  };

  // Registration submission
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (response.ok) {
        alert("Registration successful! Please log in.");
        setTabValue(0); // Switch back to login tab
        setUsername("");
        setPassword("");
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error("Error registering:", error);
      alert("An error occurred during registration");
    }
  };

  return (
    <Container maxWidth="xs" sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Chess Notes
      </Typography>
      <Tabs value={tabValue} onChange={handleTabChange} centered>
        <Tab label="Login" />
        <Tab label="Register" />
      </Tabs>

      {/* Login Form */}
      {tabValue === 0 && (
        <Box component="form" onSubmit={handleLoginSubmit} sx={{ mt: 2 }}>
          <TextField
            label="Username"
            fullWidth
            margin="normal"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <TextField
            label="Password"
            type="password"
            fullWidth
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }}>
            Login
          </Button>
        </Box>
      )}

      {/* Registration Form */}
      {tabValue === 1 && (
        <Box component="form" onSubmit={handleRegisterSubmit} sx={{ mt: 2 }}>
          <TextField
            label="Username"
            fullWidth
            margin="normal"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <TextField
            label="Password"
            type="password"
            fullWidth
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }}>
            Register
          </Button>
        </Box>
      )}
    </Container>
  );
};

export default Login;