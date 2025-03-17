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
  const {
    setFen,
    setCount,
    saveMoveNotes,
    notes,
    fetchNotes,
    selectedPGN,
    deleteNote,
    setSelectedPGN,
    updateNotePGN
  } = useChessStore();
  const [chess, setChess] = useState(new Chess());
  const [moveTree, setMoveTree] = useState({ move: null, fen: new Chess().fen(), children: [] });
  const [currentPath, setCurrentPath] = useState([{ move: null, fen: new Chess().fen(), children: [] }]);
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
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success"
  });

  // Generate PGN from move tree
  const generatePGN = (node, moveNumber = 1, isWhiteTurn = true) => {
    let pgn = '';
    if (node.move) {
      if (isWhiteTurn) {
        pgn += `${moveNumber}. ${node.move} `;
      } else {
        pgn += `${node.move} `;
      }
    }
    if (node.children.length > 0) {
      const nextMoveNumber = isWhiteTurn ? moveNumber : moveNumber + 1;
      pgn += generatePGN(node.children[0], nextMoveNumber, !isWhiteTurn);
      for (let i = 1; i < node.children.length; i++) {
        const variationNode = node.children[i];
        const variationStart = isWhiteTurn ? `${moveNumber}. ${variationNode.move}` : `${moveNumber}... ${variationNode.move}`;
        const variationContinuation = generatePGN(variationNode, isWhiteTurn ? moveNumber : moveNumber + 1, !isWhiteTurn);
        pgn += ` (${variationStart} ${variationContinuation}) `;
      }
    }
    return pgn.trim();
  };

  // Save PGN with variations
  const savePGNWithVariations = () => {
    if (!moveTree) return;
    const pgnBody = generatePGN(moveTree);
    const headers = chess.header();
    let fullPGN = '';
    for (const [key, value] of Object.entries(headers)) {
      fullPGN += `[${key} "${value}"]\n`;
    }
    fullPGN += '\n' + pgnBody + ' ' + (chess.header().Result || "1-0");
    if (effectiveGameId) {
      updateNotePGN(effectiveGameId, fullPGN);
      setSnackbar({ open: true, message: "PGN with variations saved!", severity: "success" });
    } else {
      console.error("No note ID to save PGN.");
    }
  };

  // Handle note changes
  const handleNoteChange = (moveIndex, type, value) => {
    setMoveNotes((prev) => ({
      ...prev,
      [moveIndex]: {
        ...(prev[moveIndex] || { played: "", shouldHavePlayed: "" }),
        [type]: value
      }
    }));
  };

  const handleBack = () => navigate("/");

  const handleDeleteNote = async () => {
    if (effectiveGameId) {
      try {
        await deleteNote(effectiveGameId);
        navigate("/");
      } catch (error) {
        console.error("Failed to delete note:", error);
        setSnackbar({ open: true, message: "Failed to delete note.", severity: "error" });
      }
    }
  };

  const handleSaveNotes = async () => {
    let noteId = effectiveGameId;
    const fenToSave = chess.fen();
    try {
      if (!noteId) {
        noteId = await useChessStore.getState().addNote(fenToSave, selectedPGN);
        setEffectiveGameId(noteId);
      }
      await saveMoveNotes(noteId, moveNotes, fenToSave);
      setSnackbar({ open: true, message: "Notes saved successfully!", severity: "success" });
    } catch (error) {
      console.error("Error saving notes:", error);
      setSnackbar({ open: true, message: "Failed to save notes.", severity: "error" });
    }
  };

  const toggleBoardOrientation = () => setBoardOrientation(prev => prev === "white" ? "black" : "white");

  const analyzePositionSafely = () => {
    if (stockfish && !stockfish.isAnalyzing) {
      stockfish.isAnalyzing = true;
      stockfish.postMessage("stop");
      stockfish.postMessage(`position fen ${chess.fen()}`);
      stockfish.postMessage("go depth 20");
    }
  };

  const goToMove = (pathIndex) => {
    if (pathIndex < 0 || pathIndex >= currentPath.length) return;
    const newChess = new Chess();
    const newPath = currentPath.slice(0, pathIndex + 1);
    newPath.slice(1).forEach(node => newChess.move(node.move));
    setChess(newChess);
    setCurrentPath(newPath);
    setFen(newChess.fen());
    setEngineEval(null);
    setTopLine("");
  };

  const onPieceDrop = (sourceSquare, targetSquare) => {
    if (currentPath.length === 0) return false;
    const currentNode = currentPath[currentPath.length - 1];
    const newChess = new Chess(currentNode.fen);
    try {
      const move = newChess.move({ from: sourceSquare, to: targetSquare, promotion: "q" });
      if (move === null) return false;
      const existingChild = currentNode.children.find(child => child.move === move.san);
      if (existingChild) {
        setCurrentPath([...currentPath, existingChild]);
      } else {
        const newNode = { move: move.san, fen: newChess.fen(), children: [] };
        setMoveTree(prevTree => {
          const newTree = JSON.parse(JSON.stringify(prevTree)); // Deep clone
          const nodeToUpdate = currentPath.reduce((tree, _, idx) => {
            return idx === 0 ? tree : tree.children.find(child => child.move === currentPath[idx].move);
          }, newTree);
          nodeToUpdate.children.push(newNode);
          return newTree;
        });
        setCurrentPath([...currentPath, newNode]);
      }
      setChess(newChess);
      setFen(newChess.fen());
      return true;
    } catch (error) {
      console.error("Invalid move:", error);
      return false;
    }
  };

  const copyVariationToClipboard = async (branchIndex) => {
    const mainLinePath = [];
    let node = moveTree;
    while (node.children.length > 0) {
      mainLinePath.push(node);
      node = node.children[0];
    }
    mainLinePath.push(node);
    const branchPoint = mainLinePath[branchIndex];
    if (!branchPoint || branchPoint.children.length <= 1) {
      setSnackbar({ open: true, message: "No variation to copy!", severity: "warning" });
      return;
    }
    const variationNodes = branchPoint.children.slice(1)[0]; // First variation
    let variationText = "";
    let tempChess = new Chess(branchPoint.fen);
    const moves = [variationNodes];
    let currentNode = variationNodes;
    while (currentNode.children.length > 0) {
      currentNode = currentNode.children[0];
      moves.push(currentNode);
    }
    moves.forEach((node, idx) => {
      const halfMove = branchIndex + idx; // Total half-moves from start of game
      const isWhiteMove = halfMove % 2 === 0;
      const moveNumber = Math.floor(halfMove / 2) + 1;
      if (isWhiteMove) {
        variationText += `${moveNumber}. ${node.move} `;
      } else {
        variationText += `${node.move} `;
      }
      tempChess.move(node.move);
    });
    try {
      await navigator.clipboard.writeText(variationText.trim());
      setSnackbar({ open: true, message: "Variation copied to clipboard!", severity: "success" });
    } catch (error) {
      console.error("Failed to copy:", error);
      setSnackbar({ open: true, message: "Failed to copy variation.", severity: "error" });
    }
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (document.activeElement.tagName === "TEXTAREA") return;
      if (currentPath.length === 0) return; // Add this guard clause
      const currentNode = currentPath[currentPath.length - 1];
      
      switch (event.key) {
        case "ArrowRight":
          event.preventDefault();
          if (currentNode.children.length > 0) {
            setCurrentPath([...currentPath, currentNode.children[0]]);
            const newChess = new Chess(currentNode.children[0].fen);
            setChess(newChess);
            setFen(newChess.fen());
          }
          break;
        case "ArrowLeft":
          event.preventDefault();
          goToMove(currentPath.length - 2);
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
  }, [currentPath, setFen]);

  useEffect(() => {
    if (notes.length === 0) fetchNotes();
  }, [fetchNotes, notes.length]);

  // Load PGN and build move tree
  useEffect(() => {
    if (selectedPGN) {
      try {
        const newChess = new Chess();
        newChess.loadPgn(selectedPGN); // Load PGN and set to final position
        const moveHistory = newChess.history(); // Get the sequence of moves
        newChess.reset(); // Reset to the starting position
        let currentNode = { move: null, fen: newChess.fen(), children: [] };
        const root = currentNode;
        for (const move of moveHistory) {
          newChess.move(move); // Apply each move from the start
          const newNode = { move, fen: newChess.fen(), children: [] };
          currentNode.children.push(newNode);
          currentNode = newNode;
        }
        setMoveTree(root);
        setCurrentPath([root]);
        setChess(new Chess()); // Reset chess state to starting position
        setFen(newChess.fen());
        const headers = newChess.header();
        setWhitePlayer(headers.White || "White");
        setBlackPlayer(headers.Black || "Black");
        setWhiteElo(headers.WhiteElo || "");
        setBlackElo(headers.BlackElo || "");
      } catch (error) {
        console.error("Error loading PGN:", error);
      }
    }
  }, [selectedPGN, setFen]);

  // Load note
  useEffect(() => {
    if (!gameId || !notes.length || isNoteInitialized) return;
    const note = notes.find((n) => n.id === parseInt(gameId));
    if (note) {
      setEffectiveGameId(gameId);
      if (note.pgn) {
        setSelectedPGN(note.pgn);
      } else if (note.fen) {
        const newChess = new Chess();
        newChess.load(note.fen);
        setChess(newChess);
        setFen(newChess.fen());
        setMoveTree({ move: null, fen: newChess.fen(), children: [] });
        setCurrentPath([{ move: null, fen: newChess.fen(), children: [] }]);
      }
      if (note.move_notes) setMoveNotes(note.move_notes);
      setIsNoteInitialized(true);
    }
  }, [gameId, notes, isNoteInitialized, setFen, setSelectedPGN]);

  // Stockfish setup
  useEffect(() => {
    const stockfishWorker = new Worker("/stockfish-17-single.js");
    let isStockfishReady = false;

    stockfishWorker.onmessage = (event) => {
      const message = event.data;
      if (message === "uciok") {
        stockfishWorker.postMessage("isready");
      } else if (message === "readyok") {
        isStockfishReady = true;
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
            let moveNumber = Math.floor((currentPath.length - 1) / 2) + 1;
            moveArray.forEach((move, idx) => {
              try {
                const isWhiteMove = (currentPath.length - 1 + idx) % 2 === 0;
                const sanMove = tempChess.move({ from: move.slice(0, 2), to: move.slice(2, 4) }).san;
                if (isWhiteMove && idx === 0) {
                  formattedLine += `${moveNumber}. ${sanMove} `;
                } else if (isWhiteMove) {
                  formattedLine += `${moveNumber}. ${sanMove} `;
                  moveNumber++;
                } else {
                  formattedLine += `... ${sanMove} `;
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

    stockfishWorker.postMessage("uci");
    stockfishWorker.isAnalyzing = false;
    setStockfish(stockfishWorker);

    return () => {
      stockfishWorker.postMessage("quit");
      stockfishWorker.terminate();
    };
  }, [chess, currentPath]);

  useEffect(() => {
    analyzePositionSafely();
  }, [stockfish, chess]);

  // Render move list and variations
  const mainLine = [];
let node = moveTree;
if (node) {
  while (node.children.length > 0) {
    mainLine.push(node);
    node = node.children[0];
  }
  mainLine.push(node);
}
const pairedMoves = mainLine.slice(1).reduce((acc, moveNode, index) => {
  const moveNumber = Math.floor(index / 2) + 1;
  if (index % 2 === 0) {
    acc.push({ number: moveNumber, white: moveNode.move, black: "" });
  } else {
    acc[acc.length - 1].black = moveNode.move;
  }
  return acc;
}, []);

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
                  onClick={() => goToMove(currentPath.length - 2)}
                  disabled={currentPath.length <= 1}
                  startIcon={<ArrowBackIcon />}
                  size="small"
                >
                  Prev Move
                </Button>
                <Button
                  onClick={() => {
                    const currentNode = currentPath[currentPath.length - 1];
                    if (currentNode.children.length > 0) {
                      setCurrentPath([...currentPath, currentNode.children[0]]);
                      const newChess = new Chess(currentNode.children[0].fen);
                      setChess(newChess);
                      setFen(newChess.fen());
                    }
                  }}
                  disabled={currentPath[currentPath.length - 1].children.length === 0}
                  endIcon={<ArrowForwardIcon />}
                  size="small"
                >
                  Next Move
                </Button>
              </Box>
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2">{engineEval || "Eval: Loading..."}</Typography>
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
                Notes for Move {currentPath.length - 1 >= 0 ? currentPath.length : "Initial Position"}
              </Typography>
              <Typography variant="subtitle1" sx={{ mt: 2 }}>What I Played</Typography>
              <textarea
                value={moveNotes[currentPath.length - 1]?.played || ""}
                onChange={(e) => handleNoteChange(currentPath.length - 1, "played", e.target.value)}
                placeholder="e.g., In this position I played Nf5 because..."
                style={{ width: "100%", height: "120px", marginTop: "8px", padding: "8px", fontSize: "14px", borderRadius: "4px", border: "1px solid #e0e0e0", resize: "none" }}
              />
              <Typography variant="subtitle1" sx={{ mt: 2 }}>What I Should Have Played</Typography>
              <textarea
                value={moveNotes[currentPath.length - 1]?.shouldHavePlayed || ""}
                onChange={(e) => handleNoteChange(currentPath.length - 1, "shouldHavePlayed", e.target.value)}
                placeholder="e.g., I should have played e5 because..."
                style={{ width: "100%", height: "120px", marginTop: "8px", padding: "8px", fontSize: "14px", borderRadius: "4px", border: "1px solid #e0e0e0", resize: "none" }}
              />
              <Button variant="contained" onClick={handleSaveNotes} sx={{ mt: 2, mr: 1 }}>Save Notes</Button>
              <Button variant="contained" onClick={savePGNWithVariations} sx={{ mt: 2 }}>Save PGN with Variations</Button>

              {mainLine.some(node => node.children.length > 1) && (
                <Card sx={{ mt: 2 }}>
                  <CardContent>
                    <Typography variant="h6">Variations</Typography>
                    <Box sx={{ maxHeight: "100px", overflowY: "auto", p: 1 }}>
                      {mainLine.map((node, index) => {
                        if (node.children.length <= 1) return null;
                        const variationText = generatePGN(node.children[1], Math.floor(index / 2) + 1, index % 2 === 0).split(" ").slice(1).join(" ");
                        const isHighlighted = chess.fen() === node.children[1].fen;
                        return (
                          <Box
                            key={index}
                            sx={{
                              cursor: "pointer",
                              backgroundColor: isHighlighted ? "#e0e0e0" : "transparent",
                              borderRadius: "4px",
                              p: "2px 4px",
                              mb: 1
                            }}
                            onClick={() => {
                              const newPath = mainLine.slice(0, index + 1).concat(node.children[1]);
                              setCurrentPath(newPath);
                              const newChess = new Chess(node.children[1].fen);
                              setChess(newChess);
                              setFen(newChess.fen());
                            }}
                          >
                            <Typography variant="body2">
                              Variation: {variationText}
                              <Button
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyVariationToClipboard(index);
                                }}
                                sx={{ ml: 1 }}
                              >
                                Copy
                              </Button>
                            </Typography>
                          </Box>
                        );
                      })}
                    </Box>
                  </CardContent>
                </Card>
              )}

              <Card sx={{ mt: 2 }}>
                <CardContent>
                  <Typography variant="h6">Move List</Typography>
                  <Box sx={{ maxHeight: "100px", overflowY: "auto", border: "1px solid #e0e0e0", borderRadius: "4px", p: 1, whiteSpace: "normal", wordBreak: "break-word" }}>
                    {pairedMoves.length > 0 ? (
                      pairedMoves.map((pair, index) => (
                        <Box component="span" key={index} sx={{ mr: 1 }}>
                          <Typography variant="body2" component="span" sx={{ fontWeight: "bold" }}>{pair.number}.</Typography>{" "}
                          <Box
                            component="span"
                            sx={{
                              cursor: "pointer",
                              backgroundColor: currentPath.length - 1 === index * 2 + 1 ? "#e0e0e0" : "transparent",
                              borderRadius: "4px",
                              p: "2px 4px"
                            }}
                            onClick={() => goToMove(index * 2 + 1)}
                          >
                            <Typography variant="body2" component="span">{pair.white}</Typography>
                          </Box>{" "}
                          {pair.black && (
                            <Box
                              component="span"
                              sx={{
                                cursor: "pointer",
                                backgroundColor: currentPath.length - 1 === index * 2 + 2 ? "#e0e0e0" : "transparent",
                                borderRadius: "4px",
                                p: "2px 4px"
                              }}
                              onClick={() => goToMove(index * 2 + 2)}
                            >
                              <Typography variant="body2" component="span">{pair.black}</Typography>
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