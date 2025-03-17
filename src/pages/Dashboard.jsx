import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useChessStore from "../store";
import {
  Card,
  CardContent,
  Typography,
  MenuItem,
  Select,
  Snackbar,
  Alert,
  CircularProgress,
  Button,
} from "@mui/material";

function Dashboard() {
  const { fetchNotes, notes, deleteNote, setSelectedPGN } = useChessStore();
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [games, setGames] = useState([]);
  const [filter, setFilter] = useState("date");
  const [view, setView] = useState("games");
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [month, setMonth] = useState(
    (new Date().getMonth() + 1).toString().padStart(2, "0"),
  );
  const user = "taylorandrews";
  const navigate = useNavigate();

  useEffect(() => {
    console.log("Rendering Dashboard with notes:", notes);
    if (notes.length === 0) {
      fetchNotes();
    }
  }, [fetchNotes, notes.length]);

  useEffect(() => {
    async function fetchChessGames() {
      setLoading(true);
      try {
        const response = await fetch(
          `https://api.chess.com/pub/player/${user}/games/${year}/${month}`,
        );
        const data = await response.json();
        setGames(data.games);
      } catch (error) {
        console.error("Error fetching Chess.com games:", error);
        setGames([]);
      } finally {
        setLoading(false);
      }
    }
    if (view === "games") {
      fetchChessGames();
    }
  }, [user, year, month, view]);

  const handleGameSelect = (game) => {
    setSelectedPGN(game.pgn); // Set PGN for Chess.com games
    const gameId = `chesscom-${game.id || Date.now()}`;
    navigate(`/game/${gameId}`);
  };

  const handleNoteSelect = (note) => {
    if (note.pgn) {
      setSelectedPGN(note.pgn);
    } else {
      setSelectedPGN(null);
    }
    navigate(`/game/${note.id}`);
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await deleteNote(noteId);
      setSnackbar({ open: true, message: "Notes deleted successfully!", severity: "success" });
    } catch (error) {
      console.error("Failed to delete note:", error);
      alert("Failed to delete note. Please try again.");
    }
  };

  const sortedNotes = [...notes].sort((a, b) => {
    if (filter === "date") {
      const dateA = a.last_modified || a.created_at || 0; // Match server field name
      const dateB = b.last_modified || b.created_at || 0;
      return new Date(dateB) - new Date(dateA);
    } else if (filter === "timeControl") {
      return (a.timeControl || "").localeCompare(b.timeControl || "");
    }
    return 0;
  });

  const yearOptions = Array.from({ length: 10 }, (_, i) => {
    const y = new Date().getFullYear() - i;
    return (
      <MenuItem key={y} value={y.toString()}>
        {y}
      </MenuItem>
    );
  });

  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const m = (i + 1).toString().padStart(2, "0");
    return (
      <MenuItem key={m} value={m}>
        {m}
      </MenuItem>
    );
  });

  console.log("Rendering Dashboard with notes:", notes);
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
          <Select
            value={view}
            onChange={(e) => setView(e.target.value)}
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="notes">Notes</MenuItem>
            <MenuItem value="games">Games</MenuItem>
          </Select>

          {view === "notes" && (
            <Select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              sx={{ minWidth: 120 }}
            >
              <MenuItem value="date">Sort by Date</MenuItem>
              <MenuItem value="timeControl">Sort by Time Control</MenuItem>
            </Select>
          )}

          {view === "games" && (
            <>
              <Select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                sx={{ minWidth: 100 }}
                displayEmpty
              >
                {yearOptions}
              </Select>
              <Select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                sx={{ minWidth: 80 }}
                displayEmpty
              >
                {monthOptions}
              </Select>
            </>
          )}
        </div>
      </div>

      {view === "notes" ? (
        sortedNotes.length === 0 ? (
          <Typography>No notes found.</Typography>
        ) : (
          sortedNotes.map((note, index) => (
            <Card key={note.id || `note-${index}`} sx={{ marginBottom: 2 }}>
              <CardContent>
                <Typography variant="h6">{note.title}</Typography>
                <Typography color="textSecondary">
                  {note.last_modified
                    ? new Date(note.last_modified).toLocaleDateString()
                    : note.created_at
                      ? new Date(note.created_at).toLocaleDateString()
                      : "No Date"}
                </Typography>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => handleDeleteNote(note.id)}
                  sx={{ mt: 1, mr: 1 }}
                >
                  Delete Note
                </Button>
                <Button
                  onClick={() => handleNoteSelect(note)}
                  variant="contained"
                  color="primary"
                >
                  Review Note
                </Button>
              </CardContent>
            </Card>
          ))
        )
      ) : loading ? (
        <CircularProgress />
      ) : games.length === 0 ? (
        <Typography>No games found.</Typography>
      ) : (
        games.map((game, index) => (
          <Card key={game.id || `game-${index}`} sx={{ marginBottom: 2 }}>
            <CardContent>
              <Typography>
                {game.white.username} vs {game.black.username} (
                {game.time_class})
              </Typography>
              <Button
                variant="contained"
                onClick={() => handleGameSelect(game)}
              >
                Load Game
              </Button>
            </CardContent>
          </Card>
        ))
      )}
      <Snackbar
    open={snackbar.open}
    autoHideDuration={3000}
    onClose={() => setSnackbar({ ...snackbar, open: false })}
    anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
  >
    <Alert
      onClose={() => setSnackbar({ ...snackbar, open: false })}
      severity={snackbar.severity}
      variant="filled"
    >
      {snackbar.message}
    </Alert>
  </Snackbar>
    </div>
    
  );
}

export default React.memo(Dashboard);
