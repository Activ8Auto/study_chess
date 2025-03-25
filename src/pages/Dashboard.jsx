import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useChessStore from "../store";
import {
  Card,
  CardContent,
  Typography,
  MenuItem,
  Select,
  CircularProgress,
  Button,
} from "@mui/material";

function Dashboard() {
  const { fetchNotes, notes, setSelectedPGN, deleteNote } = useChessStore(); // Added deleteNote
  const [games, setGames] = useState([]);
  const [view, setView] = useState("notes"); // Default to notes
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [month, setMonth] = useState(
    String(new Date().getMonth() + 1).padStart(2, "0")
  );
  const [timeControlFilter, setTimeControlFilter] = useState("all");
  const user = "taylorandrews";
  const navigate = useNavigate();

  // Fetch Chess.com games when view is "games"
  useEffect(() => {
    if (view !== "games") return;

    const fetchGames = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `http://localhost:5001/api/chess/games/${user}/${year}/${month}`
        );
        if (!response.ok) throw new Error("Failed to fetch Chess.com games");
        const data = await response.json();
        const sortedGames = (data.games || []).sort((a, b) => b.end_time - a.end_time);
        console.log("Fetched Chess.com games (sorted):", sortedGames);
        setGames(sortedGames);
      } catch (error) {
        console.error("Error fetching Chess.com games:", error);
        setGames([]);
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, [view, year, month, user]);

  // Fetch notes when view is "notes"
  useEffect(() => {
    if (view !== "notes") return;
    setLoading(true);
    fetchNotes().finally(() => setLoading(false)); // Assuming fetchNotes is async
  }, [view, fetchNotes]);

  // Filter games based on time control
  const filteredGames =
    timeControlFilter === "all"
      ? games
      : games.filter((game) => game.time_class === timeControlFilter);

  // Handle note deletion
  const handleDeleteNote = (noteId) => {
    deleteNote(noteId); // Call store's deleteNote function
  };

  return (
    <div>
      <Typography variant="h4" gutterBottom>
        📊 Chess Dashboard
      </Typography>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <Typography variant="h6">
          {view === "notes" ? "Your Notes" : "Chess.com Games"}
        </Typography>
        <div style={{ display: "flex", gap: "10px" }}>
          {/* View Selector */}
          <Select
            value={view}
            onChange={(e) => setView(e.target.value)}
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="notes">Notes</MenuItem>
            <MenuItem value="games">Games</MenuItem>
          </Select>

          {/* Time Control Selector (only for games) */}
          {view === "games" && (
            <>
              <Select
                value={timeControlFilter}
                onChange={(e) => setTimeControlFilter(e.target.value)}
                sx={{ minWidth: 120 }}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="bullet">Bullet</MenuItem>
                <MenuItem value="blitz">Blitz</MenuItem>
                <MenuItem value="rapid">Rapid</MenuItem>
                <MenuItem value="daily">Daily</MenuItem>
              </Select>

              <Select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                sx={{ minWidth: 100 }}
              >
                {Array.from({ length: 10 }, (_, i) => {
                  const y = new Date().getFullYear() - i;
                  return (
                    <MenuItem key={y} value={y.toString()}>
                      {y}
                    </MenuItem>
                  );
                })}
              </Select>
              <Select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                sx={{ minWidth: 80 }}
              >
                {Array.from({ length: 12 }, (_, i) => {
                  const m = (i + 1).toString().padStart(2, "0");
                  return (
                    <MenuItem key={m} value={m}>
                      {m}
                    </MenuItem>
                  );
                })}
              </Select>
            </>
          )}
        </div>
      </div>

      {/* Conditional Rendering based on View */}
      {view === "notes" ? (
        loading ? (
          <CircularProgress />
        ) : notes.length === 0 ? (
          <Typography>No notes found.</Typography>
        ) : (
          notes.map((note, index) => (
            <Card key={`note-${note.id || index}`} sx={{ marginBottom: 2 }}>
              <CardContent>
                <Typography variant="h6">
                  {note.title || "Untitled Note"}
                </Typography>
                <Typography color="textSecondary">
                  {note.content || "No content"}
                </Typography>
                <div style={{ marginTop: "10px", display: "flex", gap: "10px" }}>
                  <Button
                    variant="contained"
                    onClick={() => {
                      setSelectedPGN(note.pgn); // Assuming note has a pgn field
                      navigate(`/game/note-${note.id || index}`);
                    }}
                  >
                    Load Note
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => handleDeleteNote(note.id || index)}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )
      ) : (
        loading ? (
          <CircularProgress />
        ) : filteredGames.length === 0 ? (
          <Typography>No games found.</Typography>
        ) : (
          filteredGames.map((game, index) => (
            <Card key={`game-${index}`} sx={{ marginBottom: 2 }}>
              <CardContent>
                <Typography variant="h6">
                  {game.white.username} ({game.white.rating}) vs{" "}
                  {game.black.username} ({game.black.rating})
                </Typography>
                <Typography color="textSecondary">
                  Time Control: {game.time_class} |{" "}
                  {new Date(game.end_time * 1000).toLocaleString()}
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => {
                    setSelectedPGN(game.pgn);
                    navigate(`/game/${game.id || `chesscom-${index}`}`);
                  }}
                >
                  Load Game
                </Button>
              </CardContent>
            </Card>
          ))
        )
      )}
    </div>
  );
}

export default React.memo(Dashboard);