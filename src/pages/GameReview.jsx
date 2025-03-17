import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import useChessStore from "../store";
import IconButton from "@mui/material/IconButton";
import {
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Box,
  Snackbar,
  Alert
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

export default function GameReview() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { setFen, setCount, saveMoveNotes, notes, fetchNotes, selectedPGN, deleteNote, setSelectedPGN } = useChessStore();
  const [chess, setChess] = useState(new Chess());
  const [moveIndex, setMoveIndex] = useState(-1);
  const [moves, setMoves] = useState([]);
  const [variations, setVariations] = useState({});
  const [moveNotes, setMoveNotes] = useState({});
  const [boardOrientation, setBoardOrientation] = useState("white");
  const [effectiveGameId, setEffectiveGameId] = useState(null);
  const [whitePlayer, setWhitePlayer] = useState("White");
  const [blackPlayer, setBlackPlayer] = useState("Black");
  const [whiteElo, setWhiteElo] = useState("");
  const [blackElo, setBlackElo] = useState("");
  const [engineEval, setEngineEval] = useState(null);
  const [topLine, setTopLine] = useState("");
  const [stockfish, setStockfish] = useState(null);
  const [isNoteInitialized, setIsNoteInitialized] = useState(false);

  // Snackbar state for notifications
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const handleNoteChange = (moveIndex, type, value) => {
    setMoveNotes((prev) => ({
      ...prev,
      [moveIndex]: {
        ...prev[moveIndex] || { played: "", shouldHavePlayed: "" },
        [type]: value,
      },
    }));
  };

  const handleBack = () => {
    navigate("/");
  };

  const handleDeleteNote = async () => {
    if (effectiveGameId) {
      try {
        await deleteNote(effectiveGameId);
        navigate("/");
      } catch (error) {
        console.error("Failed to delete note:", error);
        setSnackbar({ open: true, message: "Failed to delete note. Please try again.", severity: "error" });
      }
    } else {
      console.error("No note ID to delete.");
    }
  };

  const handleSaveNotes = async () => {
    let noteId = effectiveGameId;
    const fenToSave = chess.fen();

    console.log("Saving FEN:", fenToSave);
    console.log("Saving moveNotes:", moveNotes);

    try {
      if (!noteId) {
        noteId = await useChessStore.getState().addNote(fenToSave, selectedPGN);
        if (!noteId) throw new Error("Failed to create new note.");
        setEffectiveGameId(noteId);
      }
      await saveMoveNotes(noteId, moveNotes, fenToSave);
      const updatedNote = notes.find((n) => n.id === noteId);
      if (updatedNote && updatedNote.moveNotes) {
        setMoveNotes(updatedNote.moveNotes);
        console.log("Updated moveNotes from server:", updatedNote.moveNotes);
      }
      setSnackbar({ open: true, message: "Notes saved successfully!", severity: "success" });
    } catch (error) {
      console.error("Error saving notes:", error);
      setSnackbar({ open: true, message: "Failed to save notes. Try again.", severity: "error" });
    }
  };

  const toggleBoardOrientation = () => {
    setBoardOrientation((prev) => (prev === "white" ? "black" : "white"));
  };

  const analyzePositionSafely = () => {
    if (stockfish && !stockfish.isAnalyzing) {
      stockfish.isAnalyzing = true;
      stockfish.postMessage("stop");
      // Fixed syntax: using backticks to create template literal.
      stockfish.postMessage(`position fen ${chess.fen()}`);
      stockfish.postMessage("go depth 20");
    }
  };

  const goToMove = (index, variationPath = []) => {
    if (index < -1 || (!variationPath.length && index >= moves.length)) {
      console.warn("Move index out of range:", index);
      return;
    }
    const newChess = new Chess();
    let currentIndex = -1;

    if (index >= 0) {
      for (let i = 0; i <= Math.min(index, moves.length - 1); i++) {
        newChess.move(moves[i]);
        currentIndex = i;
      }
    }

    variationPath.forEach(({ branchIndex, moveIndex: varMoveIndex }) => {
      const branch = variations[branchIndex] || [];
      const move = branch[varMoveIndex];
      if (move) {
        newChess.move(move.san);
        currentIndex = branchIndex;
      }
    });

    setChess(newChess);
    setMoveIndex(currentIndex);
    setFen(newChess.fen());
    setCount(currentIndex);
    setEngineEval(null);
    setTopLine("");
  };

  const onPieceDrop = (sourceSquare, targetSquare) => {
    const newChess = new Chess(chess.fen());
    const move = newChess.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: "q",
    });

    if (move === null) return false;

    const nextMainMove = moves[moveIndex + 1];
    if (nextMainMove && move.san === nextMainMove) {
      goToMove(moveIndex + 1);
    } else {
      const branchIndex = moveIndex;
      const newVariation = { san: move.san, fen: newChess.fen(), children: [] };
      setVariations((prev) => ({
        ...prev,
        [branchIndex]: [...(prev[branchIndex] || []), newVariation],
      }));
      setChess(newChess);
      setMoves((prev) => [...prev, move.san]);
      setFen(newChess.fen());
      setMoveIndex(moveIndex + 1);
      setEngineEval(null);
      setTopLine("");
    }
    return true;
  };

  const copyVariationToNotes = (branchIndex) => {
    const branch = variations[branchIndex] || [];
    const variationText = branch.map((move) => move.san).join(" ");
    setMoveNotes((prev) => ({
      ...prev,
      [branchIndex]: {
        ...prev[branchIndex] || { played: "", shouldHavePlayed: "" },
        shouldHavePlayed: variationText,
      },
    }));
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (document.activeElement.tagName === "TEXTAREA") return;
      switch (event.key) {
        case "ArrowRight":
          event.preventDefault();
          goToMove(moveIndex + 1);
          break;
        case "ArrowLeft":
          event.preventDefault();
          goToMove(moveIndex - 1);
          break;
        case "f":
        case "F":
          event.preventDefault();
          toggleBoardOrientation();
          break;
        default:
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [moveIndex, moves]);

  useEffect(() => {
    if (notes.length === 0) {
      fetchNotes();
    }
  }, [fetchNotes, notes.length]);

  // Load full PGN when selected from game list
  useEffect(() => {
    if (!selectedPGN) return;
    try {
      const newChess = new Chess();
      newChess.loadPgn(selectedPGN);
      const moveHistory = newChess.history();
      setMoves(moveHistory);
      const headers = newChess.header();
      setWhitePlayer(headers.White || "White");
      setBlackPlayer(headers.Black || "Black");
      setWhiteElo(headers.WhiteElo || "");
      setBlackElo(headers.BlackElo || "");
      console.log("PGN loaded. Moves:", moveHistory);
      if (moveHistory.length > 0) {
        goToMove(moveHistory.length - 1);
      }
    } catch (error) {
      console.error("Error loading PGN into Chess.js:", error);
    }
  }, [selectedPGN]);

  // Load saved note with FEN and notes
  useEffect(() => {
    if (!gameId || !notes.length || isNoteInitialized) return;
    const note = notes.find((n) => n.id === parseInt(gameId));
    if (note) {
      console.log("Found existing note:", note);
      setEffectiveGameId(gameId);
      if (note.move_notes) { // Use the key from your database
        setMoveNotes(note.move_notes);
        console.log("Loaded move_notes:", note.move_notes);
      } else {
        console.warn("No move_notes found in note:", note);
      }
      if (note.fen) {
        try {
          const newChess = new Chess();
          newChess.load(note.fen);
          setChess(newChess);
          setFen(newChess.fen());
          console.log("Loaded FEN from note:", note.fen);
          if (note.move_notes && Object.keys(note.move_notes).length > 0) {
            setMoveIndex(parseInt(Object.keys(note.move_notes)[0]));
          }
        } catch (error) {
          console.error("Error loading FEN into Chess.js:", error);
        }
      } else {
        console.warn("No FEN found in note:", note);
      }
      setIsNoteInitialized(true);
    } else {
      console.log("No note found for gameId:", gameId);
    }
  }, [gameId, notes, isNoteInitialized, setFen]);

  useEffect(() => {
    const stockfishWorker = new Worker("/stockfish-17-single.js");
    let isStockfishReady = false;

    stockfishWorker.onmessage = (event) => {
      const message = event.data;
      console.log("Stockfish message:", message);
      if (message === "uciok") {
        stockfishWorker.postMessage("isready");
      } else if (message === "readyok") {
        isStockfishReady = true;
        console.log("Stockfish is ready");
      } else if (message.startsWith("info depth")) {
        const parts = message.split(" ");
        const scoreIndex = parts.indexOf("score");
        if (scoreIndex !== -1) {
          const scoreType = parts[scoreIndex + 1];
          let scoreValue = parseInt(parts[scoreIndex + 2], 10);
          const pvIndex = parts.indexOf("pv");
          let pvMoves = "";
          if (pvIndex !== -1) {
            pvMoves = parts.slice(pvIndex + 1).join(" ");
            const tempChess = new Chess(chess.fen());
            const moveArray = pvMoves.split(" ").filter((move) => move.length >= 4);
            let formattedLine = "";
            let moveNumber = Math.floor((moveIndex + 1) / 2) + 1;
            moveArray.forEach((move, idx) => {
              try {
                const isWhiteMove = (moveIndex + idx) % 2 === 0;
                const sanMove = tempChess.move({ from: move.slice(0, 2), to: move.slice(2, 4) }).san;
                if (isWhiteMove && idx === 0) {
                  formattedLine += `${moveNumber}. ${sanMove} `;
                } else if (isWhiteMove) {
                  formattedLine += `${moveNumber}. ${sanMove} `;
                  moveNumber++;
                } else {
                  formattedLine += `${sanMove} `;
                }
              } catch (e) {
                console.warn("Invalid move in PV:", move);
              }
            });
            setTopLine(formattedLine.trim());
          }

          let evalText = "";
          if (scoreType === "cp") {
            const adjustedScore = chess.turn() === "b" ? -scoreValue : scoreValue;
            const score = adjustedScore / 100;
            evalText = `Eval: ${score > 0 ? "+" : ""}${score}`;
          } else if (scoreType === "mate") {
            const adjustedMate = chess.turn() === "b" ? -scoreValue : scoreValue;
            evalText = `Mate in ${adjustedMate}`;
          }
          setEngineEval(evalText);
        }
      } else if (message.startsWith("bestmove")) {
        stockfishWorker.isAnalyzing = false;
      }
    };

    stockfishWorker.onerror = (error) => {
      console.error("Stockfish worker error:", error);
      stockfishWorker.isAnalyzing = false;
    };

    stockfishWorker.postMessage("uci");
    stockfishWorker.isAnalyzing = false;
    setStockfish(stockfishWorker);

    return () => {
      stockfishWorker.postMessage("quit");
      stockfishWorker.terminate();
    };
  }, [chess, moveIndex]);

  useEffect(() => {
    analyzePositionSafely();
  }, [moveIndex, stockfish, chess]);

  const pairedMoves = moves.reduce((acc, move, index) => {
    const moveNumber = Math.floor(index / 2) + 1;
    if (index % 2 === 0) {
      acc.push({ number: moveNumber, white: move, black: "" });
    } else {
      acc[acc.length - 1].black = move;
    }
    return acc;
  }, []);

  console.log("Rendering with moveIndex:", moveIndex, "moveNotes:", moveNotes);

  return (
    <>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="h5">♟️ Game Review</Typography>
                <IconButton onClick={toggleBoardOrientation}>🔃</IconButton>
              </Box>

              <Typography variant="body2" sx={{ textAlign: "center", mb: 1 }}>
                {boardOrientation === "white" ? blackPlayer : whitePlayer}
                {boardOrientation === "white" && blackElo ? ` (${blackElo})` : whiteElo ? ` (${whiteElo})` : ""}
              </Typography>

              <Chessboard
                position={chess.fen()}
                boardOrientation={boardOrientation}
                onPieceDrop={onPieceDrop}
              />

              <Typography variant="body2" sx={{ textAlign: "center", mt: 1 }}>
                {boardOrientation === "white" ? whitePlayer : blackPlayer}
                {boardOrientation === "white" && whiteElo ? ` (${whiteElo})` : blackElo ? ` (${blackElo})` : ""}
              </Typography>

              <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
                <Button
                  onClick={() => goToMove(moveIndex - 1)}
                  disabled={moveIndex <= -1}
                  startIcon={<ArrowBackIcon />}
                  size="small"
                >
                  Prev Move
                </Button>
                <Button
                  onClick={() => goToMove(moveIndex + 1)}
                  disabled={moveIndex >= moves.length - 1 && !variations[moveIndex]}
                  endIcon={<ArrowForwardIcon />}
                  size="small"
                >
                  Next Move
                </Button>
              </Box>

              <Box sx={{ mt: 1 }}>
                <Typography variant="body2">
                  {engineEval || "Eval: Loading..."}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  <b>Top Line</b>: {topLine || "Loading..."}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <CardContent sx={{ flexGrow: 1 }}>
              <Typography variant="h6">
                Notes for Move {moveIndex >= 0 ? moveIndex + 1 : "Initial Position"}
              </Typography>

              <Typography variant="subtitle1" sx={{ mt: 2 }}>
                What I Played
              </Typography>
              <textarea
                value={moveNotes[moveIndex]?.played || ""}
                onChange={(e) => handleNoteChange(moveIndex, "played", e.target.value)}
                placeholder="e.g., In this position I played Nf5 because..."
                style={{
                  width: "100%",
                  height: "120px",
                  marginTop: "8px",
                  padding: "8px",
                  fontSize: "14px",
                  borderRadius: "4px",
                  border: "1px solid #e0e0e0",
                  resize: "none",
                }}
              />

              <Typography variant="subtitle1" sx={{ mt: 2 }}>
                What I Should Have Played
              </Typography>
              <textarea
                value={moveNotes[moveIndex]?.shouldHavePlayed || ""}
                onChange={(e) =>
                  handleNoteChange(moveIndex, "shouldHavePlayed", e.target.value)
                }
                placeholder="e.g., I should have played e5 because..."
                style={{
                  width: "100%",
                  height: "120px",
                  marginTop: "8px",
                  padding: "8px",
                  fontSize: "14px",
                  borderRadius: "4px",
                  border: "1px solid #e0e0e0",
                  resize: "none",
                }}
              />

              <Button
                variant="contained"
                color="primary"
                onClick={handleSaveNotes}
                sx={{ mt: 2, alignSelf: "flex-start" }}
              >
                Save Notes
              </Button>

              <Button
                variant="outlined"
                color="error"
                onClick={handleDeleteNote}
                sx={{ mt: 2, alignSelf: "flex-start" }}
              >
                Delete Note
              </Button>

              {Object.keys(variations).length > 0 && (
                <Card sx={{ mt: 2 }}>
                  <CardContent>
                    <Typography variant="h6">Variations</Typography>
                    <Box sx={{ maxHeight: "100px", overflowY: "auto", p: 1 }}>
                      {Object.entries(variations).map(([branchIndex, branch]) =>
                        branch.map((move, varIndex) => (
                          <Box
                            key={`${branchIndex}-${varIndex}`}
                            sx={{
                              cursor: "pointer",
                              backgroundColor: chess.fen() === move.fen ? "#e0e0e0" : "transparent",
                              borderRadius: "4px",
                              p: "2px 4px",
                              mb: 1,
                            }}
                            onClick={() =>
                              goToMove(parseInt(branchIndex), [
                                { branchIndex: parseInt(branchIndex), moveIndex: varIndex },
                              ])
                            }
                          >
                            <Typography variant="body2">
                              {`After move ${parseInt(branchIndex) + 1}: ${move.san}`}
                              <Button
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyVariationToNotes(branchIndex);
                                }}
                                sx={{ ml: 1 }}
                              >
                                Copy
                              </Button>
                            </Typography>
                          </Box>
                        ))
                      )}
                    </Box>
                  </CardContent>
                </Card>
              )}

              <Card sx={{ mt: 2 }}>
                <CardContent>
                  <Typography variant="h6">Move List</Typography>
                  <Box
                    sx={{
                      maxHeight: "100px",
                      overflowY: "auto",
                      border: "1px solid #e0e0e0",
                      borderRadius: "4px",
                      p: 1,
                      whiteSpace: "normal",
                      wordBreak: "break-word",
                    }}
                  >
                    {pairedMoves.length > 0 ? (
                      pairedMoves.map((pair, index) => (
                        <Box component="span" key={index} sx={{ mr: 1 }}>
                          <Typography variant="body2" component="span" sx={{ fontWeight: "bold" }}>
                            {pair.number}.
                          </Typography>
                          <Box
                            component="span"
                            sx={{
                              cursor: "pointer",
                              backgroundColor: moveIndex === index * 2 ? "#e0e0e0" : "transparent",
                              borderRadius: "4px",
                              p: "2px 4px",
                            }}
                            onClick={() => goToMove(index * 2)}
                          >
                            <Typography variant="body2" component="span">
                              {pair.white}
                            </Typography>
                          </Box>
                          {pair.black && (
                            <Box
                              component="span"
                              sx={{
                                cursor: "pointer",
                                backgroundColor: moveIndex === index * 2 + 1 ? "#e0e0e0" : "transparent",
                                borderRadius: "4px",
                                p: "2px 4px",
                              }}
                              onClick={() => goToMove(index * 2 + 1)}
                            >
                              <Typography variant="body2" component="span">
                                {pair.black}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      ))
                    ) : (
                      <Typography variant="body2">No moves yet</Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Snackbar for success/failure messages */}
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
    </>
  );
}
