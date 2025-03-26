// src/App.js
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import GameReview from "./pages/GameReview";
import Login from "./pages/Login";
import { CssBaseline, Container } from "@mui/material";
import TopBar from "./global/TopBar";
import useChessStore from "./store";

const ProtectedRoute = ({ children }) => {
  const token = useChessStore((state) => state.token);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

export default function App() {
  return (
    <Router>
      <CssBaseline />
      <TopBar />
      <Container maxWidth="lg">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/game/:gameId" element={<ProtectedRoute><GameReview /></ProtectedRoute>} />
        </Routes>
      </Container>
    </Router>
  );
}