import { useParams, useNavigate } from "react-router-dom";
import { useEffect,useMemo, useState } from "react";
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
  Alert,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

export default function GameReview() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const {
    notes,
    fetchNotes,
    selectedPGN,
    deleteNote,
    setSelectedPGN,
    updateNotePGN,
    addNote,
  } = useChessStore();
  const [fen, setFen] = useState(new Chess().fen());
  const [chess, setChess] = useState(new Chess());
  const [moveTree, setMoveTree] = useState({
    move: null,
    fen: new Chess().fen(), // Standard starting position by default
    annotation: "",
    children: [],
  });
  const [currentPath, setCurrentPath] = useState([]);
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
    severity: "success",
  });
  
  const [finalResult, setFinalResult] = useState("*"); // Track final result

  /**
   * Build a move list (with variations and annotations) for display.
   * Now includes a variationDepth to manage indentation levels.
   */
   function buildMoveList(
    node,
    moveNumber = 1,
    isWhiteTurn = true,
    moveList = [],
    currentPath = [],
    isVariation = false,
    variationDepth = 0
  ) {
    // If the node has an actual move (i.e., not the root),
    // then print the move number and SAN.
    if (node.move) {
      const moveText = isWhiteTurn
        ? `${moveNumber}. ${node.move}`
        : ` ${node.move}`;
  
      moveList.push({
        text: moveText,
        path: [...currentPath, node],
        isVariation,
        variationDepth,
      });
  
      // If there's an annotation, push it too
      if (node.annotation) {
        moveList.push({
          text: `{${node.annotation}}`,
          isAnnotation: true,
          isVariation,
          variationDepth,
        });
      }
  
      // 🔴 Here is where we flip color & increment moveNumber
      //    (only after we handle a real move).
      moveNumber = isWhiteTurn ? moveNumber : moveNumber + 1;
      isWhiteTurn = !isWhiteTurn;
    }
  
    // Now recurse on children
    if (node.children.length > 0) {
      // The "main line" is the first child
      buildMoveList(
        node.children[0],
        moveNumber,
        isWhiteTurn,
        moveList,
        [...currentPath, node.children[0]],
        false,            // isVariation
        variationDepth
      );
  
      // If there are extra children, those are variations
      for (let i = 1; i < node.children.length; i++) {
        const variationNode = node.children[i];
  
        // Indicate start of variation
        moveList.push({
          text: "(",
          isVariationStart: true,
          variationDepth,
        });
  
        buildMoveList(
          variationNode,
          moveNumber,
          isWhiteTurn,
          moveList,
          [...currentPath, variationNode],
          true,             // isVariation
          variationDepth + 1
        );
  
        // Indicate end of variation
        moveList.push({
          text: ")",
          isVariationEnd: true,
          variationDepth,
        });
      }
    }
  
    return moveList;
  }


  /**
   * Whenever moveTree changes, rebuild the moveList for display.
   * Also include the final result if known.
   */
  
  /**
   * Determine if text indicates a White move (like "1. e4") using a regex.
   */
  const isWhiteTurnFromText = (text) => /^\d+\.\s/.test(text);

  /**
   * Parse a PGN string into a moveTree with annotation fields.
   * Also populate players/ELO from PGN headers.
   */
  const parsePGN = (pgn) => {
    const tempChess = new Chess();
    tempChess.loadPgn(pgn);

    const headers = tempChess.header();
    // Attempt to see if the last token is a known result
    const possibleResult = (pgn.trim().split(/\s+/).pop() || "").trim();
    let recognizedResult = "*";
    if (["1-0", "0-1", "1/2-1/2", "½-½"].includes(possibleResult)) {
      recognizedResult = possibleResult === "1/2-1/2" ? "½-½" : possibleResult;
    }
    setFinalResult(recognizedResult);

    const startingFen =
      headers.SetUp === "1" && headers.FEN ? headers.FEN : new Chess().fen();
    const chessInstance = new Chess(startingFen);

    const root = {
      move: null,
      fen: startingFen,
      annotation: "",
      children: [],
    };
    let currentNode = root;

    const moves = tempChess.history();
    moves.forEach((sanMove) => {
      const moveResult = chessInstance.move(sanMove);
      if (moveResult) {
        const newNode = {
          move: moveResult.san,
          fen: chessInstance.fen(),
          annotation: "",
          children: [],
        };
        currentNode.children.push(newNode);
        currentNode = newNode;
      }
    });



    setWhitePlayer(headers.White || "White");
    setBlackPlayer(headers.Black || "Black");
    setWhiteElo(headers.WhiteElo || "");
    setBlackElo(headers.BlackElo || "");

    return root;
  };
  const moveList = useMemo(() => {
    if (!moveTree) return [];
    
    const fenParts = moveTree.fen.split(" ");
    const isWhiteTurn = fenParts[1] === "w";  // Check if White is to move
    const startNum = parseInt(fenParts[5], 10) || 1; // Get starting move number
  
    const list = buildMoveList(moveTree, startNum, isWhiteTurn, [], [moveTree], false, 0);
  
    // Append the final result if known
    if (finalResult && finalResult !== "*") {
      list.push({ text: finalResult, isResult: true });
    }
  
    return list;
  }, [moveTree, finalResult]);
  

  /**
   * Generate a PGN with ChessBase-style format from our moveTree.
   */
  const generatePGN = (node, moveNumber = 1, isWhiteTurn = true, isRoot = true) => {
    let pgn = "";

    // Skip printing move number and SAN on the root node
    if (!isRoot && node.move) {
        console.log(isWhiteTurn)
      if (!isWhiteTurn) {
        pgn += `${moveNumber}.${node.move} `;
      } else {
        pgn += ` ${node.move} `;
      }
      if (node.annotation) {
        pgn += `{${node.annotation}} `;
      }
    }

    if (node.children.length > 0) {
      const nextMoveNumber = isWhiteTurn ? moveNumber : moveNumber + 1;

      // Main line (first child)
      pgn += generatePGN(node.children[0], nextMoveNumber, !isWhiteTurn, false);

      // Variations: additional children
      for (let i = 1; i < node.children.length; i++) {
        const variationNode = node.children[i];
        let variationStart;
        if (isWhiteTurn) {
          variationStart = `${moveNumber}. ${variationNode.move}`;
        } else {
          variationStart = `${moveNumber}... ${variationNode.move}`;
        }
        const variationContinuation = generatePGN(
          variationNode,
          isWhiteTurn ? moveNumber : moveNumber + 1,
          !isWhiteTurn,
          false
        );
        // Wrap variation in parentheses
        pgn += ` (${variationStart}${
          variationContinuation ? " " + variationContinuation : ""
        }) `;
      }
    }

    return pgn.trim();
  };

  /**
   * Save PGN (with annotations and new moves) to the backend database.
   */
  const savePGNWithAnnotations = async () => {
    if (!moveTree) return;

    let pgnBody = "";
    let result = finalResult && finalResult !== "*" ? finalResult : "*";

    // If there's any move in the tree, convert the tree to PGN
    if (moveTree.children.length > 0) {
      const startingFen = moveTree.fen;
      const fenParts = startingFen.split(" ");
      const isWhiteTurn = fenParts[1] === "w";
      const startingMoveNumber = parseInt(fenParts[5], 10) || 1;
      pgnBody = generatePGN(moveTree, startingMoveNumber, isWhiteTurn, true);
    }

    // If the final position is obviously game-over, adjust result if needed
    const finalChess = new Chess(moveTree.fen);
    // Rebuild finalChess from the entire line of the first child
    const buildFenRecursively = (node) => {
      node.children.forEach((child) => {
        finalChess.move(child.move);
        buildFenRecursively(child);
      });
    };
    buildFenRecursively(moveTree);

    if (finalChess.isGameOver() && (result === "*" || !result)) {
      if (finalChess.isCheckmate()) {
        // If checkmate, the side that just moved won
        // Because Chess.js 'turn()' is the side to move, the side that delivered mate is opposite
        result = finalChess.turn() === "b" ? "1-0" : "0-1";
      } else if (finalChess.isDraw() || finalChess.isStalemate()) {
        result = "½-½";
      }
    }

    // Build standard PGN headers
    let headers = {
      Event: "Chess Game",
      White: whitePlayer,
      Black: blackPlayer,
      WhiteElo: whiteElo || "",
      BlackElo: blackElo || "",
      Date: new Date().toISOString().split("T")[0],
    };

    // If the game didn't start from the normal starting position, store the FEN.
    if (moveTree.fen !== new Chess().fen()) {
      headers.SetUp = "1";
      headers.FEN = moveTree.fen;
    }

    let fullPGN = "";
    for (const [key, value] of Object.entries(headers)) {
      if (value !== undefined && value !== null) {
        fullPGN += `[${key} "${value}"]\n`;
      }
    }
    if (pgnBody || result !== "*") {
      fullPGN += "\n" + (pgnBody || "");
      // Add result at the end
      if (result && result !== "*") {
        if (result === "½-½") {
            result = "1/2-1/2";
          }
          fullPGN += " " + result;
          
      }
    }

    console.log("Saving full PGN:", fullPGN);

    try {
      if (effectiveGameId) {
        await updateNotePGN(effectiveGameId, fullPGN);
        setSnackbar({
          open: true,
          message: "PGN with annotations saved!",
          severity: "success",
        });
      } else {
        const noteId = await addNote(fullPGN);
        if (!noteId) throw new Error("Failed to create new note");
        setEffectiveGameId(noteId);
        setSnackbar({
          open: true,
          message: "New annotated PGN saved!",
          severity: "success",
        });
      }
      setSelectedPGN(fullPGN); // Ensure we store the updated PGN in global state
      setFinalResult(result);
    } catch (error) {
      console.error("Error saving PGN:", error);
      setSnackbar({
        open: true,
        message: `Failed to save PGN: ${error.message}`,
        severity: "error",
      });
    }
  };

  /**
   * Handle annotation changes for the current move node.
   */
  const handleAnnotationChange = (value) => {
    if (currentPath.length === 0) return;
    // The current node is last item in currentPath
    const updatedPath = [...currentPath];
    updatedPath[updatedPath.length - 1].annotation = value;
    setCurrentPath(updatedPath);

    // Also update the global moveTree
    setMoveTree((prev) => {
      const newTree = JSON.parse(JSON.stringify(prev));

      // Walk through newTree using the path's moves
      const walkNodePath = (rootNode, pathIndex) => {
        if (pathIndex >= updatedPath.length) return rootNode;
        const targetMove = updatedPath[pathIndex].move;
        if (!targetMove) {
          // Root node
          return walkNodePath(rootNode, pathIndex + 1);
        }
        // Among rootNode.children, find the one with the same move
        const childNode = rootNode.children.find((c) => c.move === targetMove);
        if (!childNode) return rootNode;
        if (pathIndex === updatedPath.length - 1) {
          // We are at the final node
          childNode.annotation = value;
          return rootNode;
        }
        return walkNodePath(childNode, pathIndex + 1);
      };

      walkNodePath(newTree, 0);
      return newTree;
    });
  };

  /**
   * Navigation handlers
   */
  const handleBack = () => navigate("/");

  const handleDeleteNote = async () => {
    if (effectiveGameId) {
      try {
        await deleteNote(effectiveGameId);
        navigate("/");
      } catch (error) {
        console.error("Failed to delete note:", error);
        setSnackbar({
          open: true,
          message: "Failed to delete note.",
          severity: "error",
        });
      }
    }
  };

  const toggleBoardOrientation = () =>
    setBoardOrientation((prev) => (prev === "white" ? "black" : "white"));

  /**
   * Stockfish integration to get engine evaluations
   */
  const analyzePositionSafely = () => {
    if (stockfish && !stockfish.isAnalyzing) {
      stockfish.isAnalyzing = true;
      stockfish.postMessage("stop");
      stockfish.postMessage(`position fen ${chess.fen()}`);
      stockfish.postMessage("go depth 20");
    }
  };

  /**
   * Jump to a move by index in currentPath.
   */
  const goToMove = (pathIndex) => {
    if (pathIndex < 0 || pathIndex >= currentPath.length) return;
    const targetNode = currentPath[pathIndex];
    const newChess = new Chess(targetNode.fen);
    setChess(newChess);
    setCurrentPath(currentPath.slice(0, pathIndex + 1));
    setFen(newChess.fen());
    setEngineEval(null);
    setTopLine("");
  };

  /**
   * Handle a piece drop. If it's valid, either follow an existing branch
   * or create a new variation node.
   */
  const onPieceDrop = (sourceSquare, targetSquare) => {
    if (currentPath.length === 0) return false;
    const currentNode = currentPath[currentPath.length - 1];
    const newChess = new Chess(currentNode.fen);
    try {
      const move = newChess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q",
      });
      if (move === null) return false;

      // If there's already a child with this move, we go down that line
      const existingChild = currentNode.children.find(
        (child) => child.move === move.san
      );
      if (existingChild) {
        setCurrentPath([...currentPath, existingChild]);
      } else {
        // Otherwise, create a new node in the moveTree
        const newNode = {
          move: move.san,
          fen: newChess.fen(),
          annotation: "",
          children: [],
        };
        setMoveTree((prevTree) => {
          const newTree = JSON.parse(JSON.stringify(prevTree));

          // Follow the path in newTree
          const walkNodePath = (rootNode, pathIndex) => {
            if (pathIndex >= currentPath.length) return rootNode;
            const targetMove = currentPath[pathIndex].move;
            if (!targetMove) {
              return walkNodePath(rootNode, pathIndex + 1);
            }
            const childNode = rootNode.children.find(
              (c) => c.move === targetMove
            );
            if (!childNode) return rootNode;
            if (pathIndex === currentPath.length - 1) {
              // Insert the new child here
              childNode.children.push(newNode);
              return rootNode;
            }
            return walkNodePath(childNode, pathIndex + 1);
          };

          walkNodePath(newTree, 0);
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

  /**
   * Add keyboard shortcuts for prev/next move (arrow keys) and flipping board (f).
   */
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (document.activeElement.tagName === "TEXTAREA") return; // avoid conflicts in text fields
      if (currentPath.length === 0) return;

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
  }, [currentPath]);

  /**
   * Whenever selectedPGN changes, parse it into a move tree.
   */
  useEffect(() => {
    if (selectedPGN) {
      try {
        const newChess = new Chess();
        newChess.loadPgn(selectedPGN);
        const parsedTree = parsePGN(selectedPGN);
        setMoveTree(parsedTree);
        setCurrentPath([parsedTree]);
        setChess(newChess);
        setFen(newChess.fen());
      } catch (error) {
        console.error("Error loading PGN:", error);
      }
    }
  }, [selectedPGN]);

  /**
   * If we have a gameId from the URL, load that note from the store (if not loaded already).
   */
  useEffect(() => {
    if (!gameId || !notes.length || isNoteInitialized) return;
    const note = notes.find((n) => n.id === parseInt(gameId));
    if (note) {
      setEffectiveGameId(gameId);
      if (note.pgn) {
        setSelectedPGN(note.pgn);
      } else {
        const newChess = new Chess();
        const initialNode = {
          move: null,
          fen: newChess.fen(),
          annotation: "",
          children: [],
        };
        setChess(newChess);
        setFen(newChess.fen());
        setMoveTree(initialNode);
        setCurrentPath([initialNode]);
      }
      setIsNoteInitialized(true);
    }
  }, [gameId, notes, isNoteInitialized, setSelectedPGN]);

  /**
   * Stockfish setup
   */
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
          if (pvIndex !== -1) {
            // Attempt to parse the PV
            const pvMoves = parts.slice(pvIndex + 1).join(" ");
            const tempChess = new Chess(chess.fen());
            const moveArray = pvMoves.split(" ").filter((move) => move.length >= 4);
            let formattedLine = "";
            let moveNumber = Math.floor((currentPath.length - 1) / 2) + 1;
            moveArray.forEach((move, idx) => {
              try {
                const isWhiteMove = (currentPath.length - 1 + idx) % 2 === 0;
                const m = tempChess.move({
                  from: move.slice(0, 2),
                  to: move.slice(2, 4),
                });
                if (!m) throw new Error("Invalid move in PV");
                const sanMove = m.san;
                if (isWhiteMove && idx === 0) {
                  formattedLine += `${moveNumber}. ${sanMove} `;
                } else if (isWhiteMove) {
                  formattedLine += `${moveNumber}. ${sanMove} `;
                  moveNumber++;
                } else {
                  formattedLine += `${moveNumber}... ${sanMove} `;
                }
              } catch (e) {
                console.warn("Invalid move in PV:", move);
              }
            });
            setTopLine(formattedLine.trim());
          }
          let evalText = "";
          if (scoreType === "cp") {
            // If black to move, invert the score
            const adjustedScore = chess.turn() === "b" ? -scoreValue : scoreValue;
            const score = adjustedScore / 100;
            evalText = `Eval: ${score > 0 ? "+" : ""}${score}`;
          } else if (scoreType === "mate") {
            const adjustedMate = chess.turn() === "b" ? -scoreValue : scoreValue;
            evalText = `Mate in ${Math.abs(adjustedMate)}`;
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

  /**
   * Render
   */
  return (
    <>
      <Grid container spacing={3}>
        {/* Left / Board */}
        <Grid
          item
          xs={12}
          md={6}
          sx={{
            position: { md: "sticky" },
            top: "16px",
            height: { md: "calc(100vh - 32px)" },
            zIndex: 1,
            overflowY: "auto",
          }}
        >
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography variant="h5">♟️ Game Review</Typography>
                <IconButton onClick={toggleBoardOrientation}>🔃</IconButton>
              </Box>
              <Typography variant="body2" sx={{ textAlign: "center", mb: 1 }}>
                {boardOrientation === "white" ? blackPlayer : whitePlayer}
                {boardOrientation === "white" && blackElo
                  ? ` (${blackElo})`
                  : whiteElo
                  ? ` (${whiteElo})`
                  : ""}
              </Typography>
              <Chessboard
                position={fen}
                boardOrientation={boardOrientation}
                onPieceDrop={onPieceDrop}
              />
              <Typography variant="body2" sx={{ textAlign: "center", mt: 1 }}>
                {boardOrientation === "white" ? whitePlayer : blackPlayer}
                {boardOrientation === "white" && whiteElo
                  ? ` (${whiteElo})`
                  : blackElo
                  ? ` (${blackElo})`
                  : ""}
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
                    if (currentPath.length === 0) return;
                    const currentNode = currentPath[currentPath.length - 1];
                    if (currentNode.children.length > 0) {
                      const nextNode = currentNode.children[0];
                      setCurrentPath([...currentPath, nextNode]);
                      const newChess = new Chess(nextNode.fen);
                      setChess(newChess);
                      setFen(newChess.fen());
                    }
                  }}
                  disabled={moveTree.children.length === 0 && currentPath.length === 0}
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

        {/* Right / Move List + Annotation */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <CardContent sx={{ flexGrow: 1 }}>
              <Typography variant="h6">
                Annotation for Move{" "}
                {currentPath.length - 1 >= 0
                  ? currentPath.length - 1
                  : "Initial Position"}
              </Typography>
              <textarea
                value={currentPath[currentPath.length - 1]?.annotation || ""}
                onChange={(e) => handleAnnotationChange(e.target.value)}
                placeholder="e.g., The Berlin Defense."
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
                onClick={savePGNWithAnnotations}
                sx={{ mt: 2, mr: 1 }}
              >
                Save PGN
              </Button>
              <Button
                variant="contained"
                color="error"
                onClick={handleDeleteNote}
                sx={{ mt: 2 }}
              >
                Delete Note
              </Button>

              <Card sx={{ mt: 2, height: "100%" }}>
                <CardContent
                  sx={{ height: "100%", display: "flex", flexDirection: "column" }}
                >
                  <Typography variant="h6">Move List</Typography>
                  <Box
                    sx={{
                      flexGrow: 1,
                      overflowY: "auto",
                      border: "1px solid #e0e0e0",
                      p: 2,
                    }}
                  >
                    {moveList.length > 0 ? (
                      (() => {
                        const lines = [];
                        let currentLine = [];

                        // Helper to push a box with optional indentation
                        const pushBox = (item, keyIdx, extraStyles = {}) => {
                          // Indent annotations and variations
                          // Use item.variationDepth to create multiple indentation levels if needed
                          const baseIndent = item.variationDepth || 0;
                          const marginLeft = 10 + 20 * baseIndent;
                          // Variation text in parentheses or annotation can have a bit more margin
                          return (
                            <Box
                              key={keyIdx}
                              component="span"
                              sx={{
                                ...extraStyles,
                                ml: `${marginLeft}px`,
                                cursor: item.path ? "pointer" : "default",
                                backgroundColor:
                                  item.path &&
                                  currentPath[currentPath.length - 1] ===
                                    item.path[item.path.length - 1]
                                    ? "#e0e0e0"
                                    : "transparent",
                                p: item.isVariationStart || item.isVariationEnd
                                  ? 0
                                  : "2px 4px",
                                mr: 1,
                                fontWeight: item.isAnnotation ? "bold" : "normal",
                                color: item.isAnnotation ? "purple" : "inherit",
                              }}
                              onClick={() => {
                                if (item.path) {
                                  setCurrentPath(item.path);
                                  const newChess = new Chess(
                                    item.path[item.path.length - 1].fen
                                  );
                                  setChess(newChess);
                                  setFen(newChess.fen());
                                }
                              }}
                            >
                              {item.text}
                            </Box>
                          );
                        };

                        moveList.forEach((item, index) => {
                          if (item.isVariationStart) {
                            // '(' to denote variation start
                            lines.push(currentLine);
                            currentLine = [pushBox(item, `vs-${index}`)];
                          } else if (item.isVariationEnd) {
                            // ')' to denote variation end
                            currentLine.push(pushBox(item, `ve-${index}`));
                            lines.push(currentLine);
                            currentLine = [];
                          } else if (item.isAnnotation) {
                            // Put annotation as a separate line
                            lines.push(currentLine);
                            currentLine = [
                              pushBox(item, `ann-${index}`, {
                                display: "block",
                                mt: 0.5,
                                mb: 0.5,
                              }),
                            ];
                          } else if (item.isResult) {
                            // Final result
                            lines.push(currentLine);
                            currentLine = [
                              <Box key={index} sx={{ mt: 2, fontWeight: "bold" }}>
                                {item.text}
                              </Box>,
                            ];
                            lines.push(currentLine);
                            currentLine = [];
                          } else {
                            // Normal move
                            currentLine.push(pushBox(item, `mv-${index}`));

                            // If we just processed a black move, break the line
                            if (!isWhiteTurnFromText(item.text)) {
                              lines.push(currentLine);
                              currentLine = [];
                            }
                          }
                        });

                        // If anything is left in currentLine, push it
                        if (currentLine.length) {
                          lines.push(currentLine);
                        }

                        // Render lines
                        return lines.map((line, idx) => (
                          <Box key={`line-${idx}`} sx={{ mb: 0.5 }}>
                            {line}
                          </Box>
                        ));
                      })()
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

/*
----------------------------------------------------------------------------------
Instructions (Saved for Future Reference):

I want you to look through the Chess.js library to understand how it works. Then 
examine my code. I want the program to be able to load a PGN from chess.com 
and load it onto a chessboard (it already does). I want a "Move List" box 
to be able to play through the moves (as it currently does). I then want 
the ability to play a variation (with the purpose of studying the correct line) 
and be able to write annotations for each move in an input box.

I want to be able to have it both save the annotation and the new move.

1. Once I click "Save" it should update the Moves List with the new annotation 
   and move in the ChessBase type of format. This format includes:
     - Main moves in a list
     - Variations appear inside parentheses () and are indented
     - Annotations are indented and bold
     - Variations interrupt the main line but then it resumes cleanly
     - If the white move is annotated before the black move, the next black move
       should resume with the same move number but have "..." before it.

   Example:
   1. e4
     the most popular opening
   1... e5

   If there is an annotation in a variation, it should be indented further in 
   the variation.
   The game conclusion (1-0, 0-1, or ½-½) appears at the bottom.

----------------------------------------------------------------------------------
*/
