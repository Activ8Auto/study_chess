import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useChessStore from "../store";
import { API_BASE_URL } from "../store";
import {
  TextField,
  Button,
  Container,
  Typography,
  Tabs,
  Tab,
  Box,
  Alert,
} from "@mui/material";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [verifyPassword, setVerifyPassword] = useState(""); // New state for verification
  const [tabValue, setTabValue] = useState(0); // 0 for Login, 1 for Register
  const [chesscomUsername, setChesscomUsername] = useState("");
  const [error, setError] = useState(""); // State for error message

  const setToken = useChessStore((state) => state.setToken);
  const navigate = useNavigate();



  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (verifyPassword && e.target.value !== verifyPassword) {
      setError("Passwords do not match");
    } else {
      setError("");
    }
  };
  
  const handleVerifyPasswordChange = (e) => {
    setVerifyPassword(e.target.value);
    if (password && e.target.value !== password) {
      setError("Passwords do not match");
    } else {
      setError("");
    }
  };
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setUsername("");
    setPassword("");
    setVerifyPassword(""); // Clear verifyPassword too
    setChesscomUsername("");
    setError(""); // Clear error on tab switch
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
        useChessStore.getState().setUserChesscomUsername(data.chesscomUsername);
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
    setError(""); // Clear previous error

    // Check if passwords match
    if (password !== verifyPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, chesscomUsername }),
      });
      const data = await response.json();
      if (response.ok) {
        alert("Registration successful! Please log in.");
        setTabValue(0); // Switch back to login tab
        setUsername("");
        setPassword("");
        setVerifyPassword(""); // Clear verifyPassword
        setChesscomUsername("");
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
            required
          />
          <TextField
            label="Password"
            type="password"
            fullWidth
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }}>
            Login
          </Button>
        </Box>
      )}

      {/* Registration Form */}
      {tabValue === 1 && (
        <Box component="form" onSubmit={handleRegisterSubmit} sx={{ mt: 2 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField
            label="Username"
            fullWidth
            margin="normal"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <TextField
  label="Password"
  type="password"
  fullWidth
  margin="normal"
  value={password}
  onChange={handlePasswordChange}
  required
/>
<TextField
  label="Verify Password"
  type="password"
  fullWidth
  margin="normal"
  value={verifyPassword}
  onChange={handleVerifyPasswordChange}
  required
/>
          <TextField
            label="Chess.com Username"
            fullWidth
            margin="normal"
            value={chesscomUsername}
            onChange={(e) => setChesscomUsername(e.target.value)}
            required
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