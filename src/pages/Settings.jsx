import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import useChessStore from "../store";
import { API_BASE_URL } from "../config";
import {
  Container,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
} from "@mui/material";

const Settings = () => {
  const { token, chesscomUsername, setUserChesscomUsername } = useChessStore();
  const [newPassword, setNewPassword] = useState("");
  const [newChesscomUsername, setNewChesscomUsername] = useState(chesscomUsername || "");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  // Handle password update
  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`${API_BASE_URL}/auth/update-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token,
        },
        body: JSON.stringify({ newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to update password");
      setSuccess("Password updated successfully!");
      setNewPassword("");
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle Chess.com username update
  const handleChesscomUpdate = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`${API_BASE_URL}/auth/update-chesscom`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token,
        },
        body: JSON.stringify({ chesscomUsername: newChesscomUsername }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to update Chess.com username");
      setUserChesscomUsername(newChesscomUsername);
      setSuccess("Chess.com username updated successfully!");
    } catch (err) {
      setError(err.message);
    }
  };

  if (!token) {
    navigate("/login");
    return null;
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {/* Update Password Form */}
      <Box component="form" onSubmit={handlePasswordUpdate} sx={{ mb: 4 }}>
        <Typography variant="h6">Change Password</Typography>
        <TextField
          label="New Password"
          type="password"
          fullWidth
          margin="normal"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <Button type="submit" variant="contained" sx={{ mt: 2 }}>
          Update Password
        </Button>
      </Box>

      {/* Update Chess.com Username Form */}
      <Box component="form" onSubmit={handleChesscomUpdate}>
        <Typography variant="h6">Change Chess.com Username</Typography>
        <TextField
          label="Chess.com Username"
          fullWidth
          margin="normal"
          value={newChesscomUsername}
          onChange={(e) => setNewChesscomUsername(e.target.value)}
        />
        <Button type="submit" variant="contained" sx={{ mt: 2 }}>
          Update Chess.com Username
        </Button>
      </Box>
    </Container>
  );
};

export default Settings;