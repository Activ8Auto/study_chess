import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import GameReview from "./pages/GameReview";
import { CssBaseline, Container } from "@mui/material";
import TopBar from "./global/TopBar";

export default function App() {
  return (
    <Router>
      <CssBaseline />
      <TopBar />
      <Container maxWidth="lg">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/game/:gameId" element={<GameReview />} />
        </Routes>
      </Container>
    </Router>
  );
}
