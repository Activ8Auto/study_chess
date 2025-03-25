import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import useChessStore from "../store";
import IconButton from "@mui/material/IconButton";
import pgnParser from "pgn-parser";
import { useRef } from "react";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import SettingsIcon from "@mui/icons-material/Settings";
import Select from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import LinearProgress from "@mui/material/LinearProgress";
import InputLabel from "@mui/material/InputLabel";
import {
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Box,
  Snackbar,
  Alert,
  Popover,
  TextField,
  InputAdornment,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ShareIcon from "@mui/icons-material/Share";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

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

  const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0); // Progress from 0 to 100
  const [fen, setFen] = useState(STARTING_FEN);
  const [chess, setChess] = useState(new Chess(STARTING_FEN));
  const [mistakeNodes, setMistakeNodes] = useState([]);
  const [mistakeThreshold, setMistakeThreshold] = useState(0.3); // Default 0.5
const [analysisDepth, setAnalysisDepth] = useState(18); // Default 15
const [settingsAnchorEl, setSettingsAnchorEl] = useState(null); // For menu
  const [moveTree, setMoveTree] = useState({
    move: null,
    fen: STARTING_FEN,
    annotation: "",
    children: [],
  });
  const [currentPath, setCurrentPath] = useState([]);
  const [moveErrors, setMoveErrors] = useState([]);
  const [boardOrientation, setBoardOrientation] = useState("white");
  const [effectiveGameId, setEffectiveGameId] = useState(null);
  const [whitePlayer, setWhitePlayer] = useState("White");
  const [blackPlayer, setBlackPlayer] = useState("Black");
  const [whiteElo, setWhiteElo] = useState("");
  const [blackElo, setBlackElo] = useState("");
  const [engineEval, setEngineEval] = useState(null);
  const [topLine, setTopLine] = useState("");
  const [stockfish, setStockfish] = useState(null);
  const stockfishRef = useRef(null);
  const [isNoteInitialized, setIsNoteInitialized] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [finalResult, setFinalResult] = useState("*");
  const [anchorEl, setAnchorEl] = useState(null); // For Popover anchoring



  
  
  
  
  

  
  
  /**
   * Build a move list (with variations and annotations) for display.
   */
  function buildMoveList(
    node,
    moveNumber = 1,
    isWhiteTurn = true,
    moveList = [],
    currentPath = [],
    isVariation = false,
    variationDepth = 0,
    skipMoveAdd = false,
    afterVariation = false,
    isVariationStart = false
  ) {
    if (!skipMoveAdd && node.move) {
      let moveText;
      if (isVariation) {
        if (isVariationStart) {
          moveText = isWhiteTurn
            ? `${moveNumber}. ${node.move}`
            : `${moveNumber}... ${node.move}`;
        } else {
          moveText = ` ${node.move}`;
        }
      } else {
        moveText = isWhiteTurn
          ? `${moveNumber}. ${node.move}`
          : afterVariation
          ? `${moveNumber}... ${node.move}`
          : ` ${node.move}`;
      }
      moveList.push({
        text: moveText,
        annotation: node.annotation || "",
        path: [...currentPath],
        isVariation,
        variationDepth,
      });
      if (!isWhiteTurn) {
        moveNumber += 1;
      }
      isWhiteTurn = !isWhiteTurn;
    }

    if (node.children.length > 0) {
      const mainChild = node.children[0];
      const hasVariations = node.children.length > 1;

      if (mainChild.move) {
        const mainMoveText = isWhiteTurn
          ? `${moveNumber}. ${mainChild.move}`
          : afterVariation
          ? `${moveNumber}... ${mainChild.move}`
          : ` ${mainChild.move}`;

        moveList.push({
          text: mainMoveText,
          annotation: mainChild.annotation || "",
          path: [...currentPath, mainChild],
          isVariation,
          variationDepth,
        });

        const updatedIsWhiteTurn = !isWhiteTurn;
        const updatedMoveNumber = !isWhiteTurn ? moveNumber + 1 : moveNumber;

        if (hasVariations) {
          for (let i = 1; i < node.children.length; i++) {
            const variationNode = node.children[i];
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
              true,
              variationDepth + 1,
              false,
              false,
              true
            );
            moveList.push({
              text: ")",
              isVariationEnd: true,
              variationDepth,
            });
          }
        }

        buildMoveList(
          mainChild,
          updatedMoveNumber,
          updatedIsWhiteTurn,
          moveList,
          [...currentPath, mainChild],
          isVariation,
          variationDepth,
          true,
          hasVariations
        );
      } else {
        buildMoveList(
          mainChild,
          moveNumber,
          isWhiteTurn,
          moveList,
          [...currentPath, mainChild],
          isVariation,
          variationDepth,
          false,
          afterVariation
        );
      }
    }
    return moveList;
  }

  const analyzeFullGame = async () => {
    if (moveTree.children.length === 0) {
      setSnackbar({
        open: true,
        message: "No moves to analyze!",
        severity: "warning",
      });
      return;
    }
    setIsAnalyzing(true);
    setAnalysisProgress(0); // Reset progress
    console.log("Starting full game analysis...");
  
    const stockfishAnalyzer = new Worker("/stockfish-17-single.js");
    let isReady = false;
  
    stockfishAnalyzer.onmessage = (event) => {
      const message = event.data;
      if (message === "uciok") {
        stockfishAnalyzer.postMessage("isready");
      } else if (message === "readyok") {
        isReady = true;
      }
    };
    stockfishAnalyzer.postMessage("uci");
  
    while (!isReady) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  
    const getEvaluation = (fen) => {
      return new Promise((resolve) => {
        let evaluation = null;
        const onMessage = (event) => {
          const message = event.data;
          if (message.startsWith(`info depth ${analysisDepth}`)) {
            const parts = message.split(" ");
            const scoreIndex = parts.indexOf("score");
            if (scoreIndex !== -1) {
              const scoreType = parts[scoreIndex + 1];
              let scoreValue = parseInt(parts[scoreIndex + 2], 10);
              const turn = fen.split(" ")[1];
              if (scoreType === "cp") {
                evaluation = scoreValue / 100;
                if (turn === "b") evaluation = -evaluation;
              } else if (scoreType === "mate") {
                evaluation = scoreValue > 0 ? 100 : -100;
                if (turn === "b") evaluation = -evaluation;
              }
            }
          } else if (message.startsWith("bestmove")) {
            stockfishAnalyzer.removeEventListener("message", onMessage);
            resolve(evaluation);
          }
        };
        stockfishAnalyzer.addEventListener("message", onMessage);
        stockfishAnalyzer.postMessage(`position fen ${fen}`);
        stockfishAnalyzer.postMessage(`go depth ${analysisDepth}`);
        setTimeout(() => {
          if (evaluation === null) {
            stockfishAnalyzer.removeEventListener("message", onMessage);
            resolve(null);
          }
        }, 5000);
      });
    };
  
    // Count total "taylorandrews" moves
    const countTaylorMoves = (node, isWhiteTurn) => {
      let count = 0;
      let current = node;
      let whiteTurn = isWhiteTurn;
      const isWhitePlayer = whitePlayer === "taylorandrews";
      while (current.children.length > 0) {
        const nextNode = current.children[0];
        const playerMakingMove = whiteTurn ? whitePlayer : blackPlayer;
        if (playerMakingMove === "taylorandrews") {
          count += 1;
        }
        current = nextNode;
        whiteTurn = !whiteTurn;
      }
      return count;
    };
    const totalTaylorMoves = countTaylorMoves(
      moveTree,
      moveTree.fen.split(" ")[1] === "w"
    );
    console.log(`Total moves by taylorandrews: ${totalTaylorMoves}`);
  
    let currentNode = moveTree;
    let isWhiteTurn = currentNode.fen.split(" ")[1] === "w";
    let moveNumber = parseInt(currentNode.fen.split(" ")[5]) || 1;
    const mistakeNodesSet = new Set();
    const moveErrorsList = [];
    const isWhitePlayer = whitePlayer === "taylorandrews";
    let analyzedTaylorMoves = 0;
  
    while (currentNode.children.length > 0) {
      const nextNode = currentNode.children[0];
      const playerMakingMove = isWhiteTurn ? whitePlayer : blackPlayer;
  
      if (playerMakingMove === "taylorandrews") {
        const fenBefore = currentNode.fen;
        const fenAfterTaylorsMove = nextNode.fen;
  
        const evalBefore = await getEvaluation(fenBefore);
        console.log(`Before ${moveNumber}${isWhiteTurn ? "." : "..."} ${nextNode.move}: ${evalBefore}`);
  
        let evalAfter = null;
        if (nextNode.children.length > 0) {
          const opponentMoveNode = nextNode.children[0];
          const fenAfterOpponentMove = opponentMoveNode.fen;
          evalAfter = await getEvaluation(fenAfterOpponentMove);
          console.log(`After opponent response to ${moveNumber}${isWhiteTurn ? "." : "..."} ${nextNode.move}: ${evalAfter}`);
        } else {
          evalAfter = await getEvaluation(fenAfterTaylorsMove);
          console.log(`Endgame after ${moveNumber}${isWhiteTurn ? "." : "..."} ${nextNode.move}: ${evalAfter}`);
        }
  
        if (evalBefore !== null && evalAfter !== null) {
          const evalDrop = isWhitePlayer ? evalBefore - evalAfter : evalAfter - evalBefore;
          if (evalDrop > mistakeThreshold) {
            const moveText = isWhiteTurn
              ? `${moveNumber}. ${nextNode.move}`
              : `${moveNumber}... ${nextNode.move}`;
            moveErrorsList.push({
              moveText,
              evalBefore: evalBefore.toFixed(2),
              evalAfter: evalAfter.toFixed(2),
              drop: evalDrop.toFixed(2),
            });
            mistakeNodesSet.add(nextNode);
            console.log(`Mistake: ${moveText}, Before: ${evalBefore}, After: ${evalAfter}, Drop: ${evalDrop}`);
          }
        }
  
        analyzedTaylorMoves += 1;
        const progress = totalTaylorMoves > 0 ? (analyzedTaylorMoves / totalTaylorMoves) * 100 : 0;
        setAnalysisProgress(Math.min(progress, 100)); // Cap at 100%
      }
  
      currentNode = nextNode;
      isWhiteTurn = !isWhiteTurn;
      if (!isWhiteTurn) moveNumber += 1;
    }
  
    setMoveErrors(moveErrorsList);
    setMistakeNodes(Array.from(mistakeNodesSet));
    setAnalysisProgress(100); // Ensure it hits 100% on completion
    setIsAnalyzing(false);
    stockfishAnalyzer.postMessage("quit");
    stockfishAnalyzer.terminate();
  };

  const parsePGN = (pgn) => {
    // console.log("Raw PGN input:", pgn);
    const normalizedPgn = pgn.includes("\n\n") ? pgn : pgn.replace(/^\[.*?\]\s*(?=\d)/, "$&\n\n");
    const [parsedPgn] = pgnParser.parse(normalizedPgn);
    // console.log("Parsed PGN:", parsedPgn);

    const headers = Array.isArray(parsedPgn.headers)
      ? parsedPgn.headers.reduce((acc, h) => {
          acc[h.name] = h.value; // Corrected from h.tag to h.name
          return acc;
        }, {})
      : parsedPgn.headers || {};

    // console.log("Headers:", headers);

    const possibleResult = (pgn.trim().split(/\s+/).pop() || "").trim();
    let recognizedResult = "*";
    if (["1-0", "0-1", "1/2-1/2", "½-½"].includes(possibleResult)) {
      recognizedResult = possibleResult === "1/2-1/2" ? "½-½" : possibleResult;
    }

    const startingFen =
      headers.SetUp === "1" && headers.FEN ? headers.FEN : STARTING_FEN;
    const chessInstance = new Chess(startingFen);

    const root = {
      move: null,
      fen: startingFen,
      annotation: "",
      children: [],
    };

    const buildTree = (pgnMoves, currentNode) => {
      let current = currentNode;
      const chess = new Chess(current.fen);

      pgnMoves.forEach((pgnMove) => {
        const move = chess.move(pgnMove.move);
        
        if (!move) return;

        let mainAnnotationText = "";
        if (pgnMove.comments) {
          if (Array.isArray(pgnMove.comments)) {
            mainAnnotationText = pgnMove.comments
              .map((comment) =>
                typeof comment === "string"
                  ? comment
                  : comment.text
                  ? comment.text
                  : ""
              )
              .join(" ");
          } else {
            mainAnnotationText =
              typeof pgnMove.comments === "string"
                ? pgnMove.comments
                : pgnMove.comments?.text || "";
          }
        }

        const newNode = {
          move: move.san,
          fen: chess.fen(),
          annotation: mainAnnotationText,
          children: [],
        };
        current.children.push(newNode);

        if (pgnMove.ravs && pgnMove.ravs.length > 0) {
          pgnMove.ravs.forEach((variation) => {
            if (variation.moves && variation.moves.length > 0) {
              const variationChess = new Chess(current.fen);
              const variationMove = variationChess.move(variation.moves[0].move);
              if (variationMove) {
                let annotationText = "";
                if (variation.moves[0].comments) {
                  if (Array.isArray(variation.moves[0].comments)) {
                    annotationText = variation.moves[0].comments
                      .map((comment) =>
                        typeof comment === "string"
                          ? comment
                          : comment.text
                          ? comment.text
                          : String(comment)
                      )
                      .join(" ");
                  } else {
                    annotationText = String(variation.moves[0].comments);
                  }
                }
                const variationNode = {
                  move: variationMove.san,
                  fen: variationChess.fen(),
                  annotation: annotationText,
                  children: [],
                };
                current.children.push(variationNode);
                if (variation.moves.length > 1) {
                  buildTree(variation.moves.slice(1), variationNode);
                }
              }
            }
          });
        }

        current = newNode;
      });
    };

    buildTree(parsedPgn.moves, root);
    // console.log("🟢 Initial move tree after parsing:", JSON.stringify(root, null, 2));

    return {
      moveTree: root,
      whitePlayer: headers.White || "White",
      blackPlayer: headers.Black || "Black",
      whiteElo: headers.WhiteElo || "",
      blackElo: headers.BlackElo || "",
      finalResult: recognizedResult,
    };
  };

  const moveList = useMemo(() => {
    if (!moveTree) return [];

    const fenParts = moveTree.fen.split(" ");
    const isWhiteTurn = fenParts[1] === "w";
    const startNum = parseInt(fenParts[5], 10) || 1;

    const list = buildMoveList(moveTree, startNum, isWhiteTurn, [], [moveTree], false, 0);

    if (finalResult && finalResult !== "*") {
      list.push({ text: finalResult, isResult: true });
    }

    return list;
  }, [moveTree, finalResult]);

  const generatePGN = (node, moveNumber = 1, isWhiteTurn = true, forceMoveNumber = false) => {
    if (node.children.length === 0) {
      return "";
    }

    const mainChild = node.children[0];
    let pgn = "";

    if (isWhiteTurn) {
      pgn += `${moveNumber}. ${mainChild.move} `;
    } else {
      if (forceMoveNumber) {
        pgn += `${moveNumber}... ${mainChild.move} `;
      } else {
        pgn += `${mainChild.move} `;
      }
    }

    if (mainChild.annotation) {
      pgn += `{${mainChild.annotation}} `;
    }

    let hasVariations = node.children.length > 1;
    if (hasVariations) {
      for (let i = 1; i < node.children.length; i++) {
        const variationNode = node.children[i];
        pgn += " (";

        if (isWhiteTurn) {
          pgn += `${moveNumber}. ${variationNode.move} `;
        } else {
          pgn += `${moveNumber}... ${variationNode.move} `;
        }

        if (variationNode.annotation) {
          pgn += `{${variationNode.annotation}} `;
        }

        if (variationNode.children.length > 0) {
          const varNextIsWhiteTurn = !isWhiteTurn;
          const varNextMoveNumber = isWhiteTurn ? moveNumber : moveNumber + 1;
          pgn += generatePGN(variationNode, varNextMoveNumber, varNextIsWhiteTurn, false);
        }

        pgn += ") ";
      }
    }

    if (mainChild.children.length > 0) {
      const nextIsWhiteTurn = !isWhiteTurn;
      const nextMoveNumber = isWhiteTurn ? moveNumber : moveNumber + 1;
      const nextForceMoveNumber = hasVariations;
      pgn += generatePGN(mainChild, nextMoveNumber, nextIsWhiteTurn, nextForceMoveNumber);
    }

    return pgn.trim();
  };

  const generateFullPGN = () => {
    let pgnBody = "";
    let result = finalResult && finalResult !== "*" ? finalResult : "*";

    if (moveTree.children.length > 0) {
      const startingFen = moveTree.fen;
      const fenParts = startingFen.split(" ");
      const isWhiteTurn = fenParts[1] === "w";
      const startingMoveNumber = parseInt(fenParts[5], 10) || 1;
      pgnBody = generatePGN(moveTree, startingMoveNumber, isWhiteTurn, true);
    }

    let headers = {
      Event: "Chess Game",
      White: whitePlayer,
      Black: blackPlayer,
      WhiteElo: whiteElo || "",
      BlackElo: blackElo || "",
      Date: new Date().toISOString().split("T")[0],
    };

    if (moveTree.fen !== STARTING_FEN) {
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
      if (result && result !== "*") {
        fullPGN += " " + (result === "½-½" ? "1/2-1/2" : result);
      }
    }

    return fullPGN;
  };

  const savePGNWithAnnotations = async () => {
    if (!moveTree) return;

    let pgnBody = "";
    let result = finalResult && finalResult !== "*" ? finalResult : "*";

    if (moveTree.children.length > 0) {
      const startingFen = moveTree.fen;
      const fenParts = startingFen.split(" ");
      const isWhiteTurn = fenParts[1] === "w";
      const startingMoveNumber = parseInt(fenParts[5], 10) || 1;
      pgnBody = generatePGN(moveTree, startingMoveNumber, isWhiteTurn, true);
    }

    const finalChess = new Chess(moveTree.fen);
    const buildFenRecursively = (node) => {
      if (node.children.length > 0) {
        const mainChild = node.children[0];
        finalChess.move(mainChild.move);
        buildFenRecursively(mainChild);
      }
    };
    buildFenRecursively(moveTree);

    if (finalChess.isGameOver() && (result === "*" || !result)) {
      if (finalChess.isCheckmate()) {
        result = finalChess.turn() === "b" ? "1-0" : "0-1";
      } else if (finalChess.isDraw() || finalChess.isStalemate()) {
        result = "½-½";
      }
    }

    let headers = {
      Event: "Chess Game",
      White: whitePlayer,
      Black: blackPlayer,
      WhiteElo: whiteElo || "",
      BlackElo: blackElo || "",
      Date: new Date().toISOString().split("T")[0],
    };

    if (moveTree.fen !== STARTING_FEN) {
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
      if (result && result !== "*") {
        fullPGN += " " + (result === "½-½" ? "1/2-1/2" : result);
      }
    }

    console.log("Saving full PGN:", fullPGN);

    try {
      if (effectiveGameId) {
        await updateNotePGN(effectiveGameId, fullPGN);
        setSnackbar({
          open: true,
          message: "Game updated with new annotations and moves!",
          severity: "success",
        });
      } else {
        const noteId = await addNote(fullPGN);
        if (!noteId) throw new Error("Failed to create new note");
        setEffectiveGameId(noteId);
        setSnackbar({
          open: true,
          message: "New game saved!",
          severity: "success",
        });
      }
      setSelectedPGN(fullPGN);
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

  const handleAnnotationChange = (value) => {
    if (currentPath.length === 0) return;
    const updatedPath = [...currentPath];
    updatedPath[updatedPath.length - 1].annotation = value;
    setCurrentPath(updatedPath);

    setMoveTree((prev) => {
      const newTree = JSON.parse(JSON.stringify(prev));
      const walkNodePath = (rootNode, pathIndex) => {
        if (pathIndex >= updatedPath.length) return rootNode;
        const targetMove = updatedPath[pathIndex].move;
        if (!targetMove) {
          return walkNodePath(rootNode, pathIndex + 1);
        }
        const childNode = rootNode.children.find((c) => c.move === targetMove);
        if (!childNode) return rootNode;
        if (pathIndex === updatedPath.length - 1) {
          childNode.annotation = value;
          return rootNode;
        }
        return walkNodePath(childNode, pathIndex + 1);
      };
      walkNodePath(newTree, 0);
      return newTree;
    });
  };

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
    const targetNode = currentPath[pathIndex];
    const newChess = new Chess(targetNode.fen);
    setChess(newChess);
    setCurrentPath(currentPath.slice(0, pathIndex + 1));
    setFen(newChess.fen());
    setEngineEval(null);
    setTopLine("");
  };

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

      const existingChild = currentNode.children.find(
        (child) => child.move === move.san
      );
      if (existingChild) {
        setCurrentPath([...currentPath, existingChild]);
      } else {
        const newNode = {
          move: move.san,
          fen: newChess.fen(),
          annotation: "",
          children: [],
        };
        setMoveTree((prevTree) => {
          const newTree = JSON.parse(JSON.stringify(prevTree));
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

  const handleShareClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleShareClose = () => {
    setAnchorEl(null);
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setSnackbar({
          open: true,
          message: `${type} copied to clipboard!`,
          severity: "success",
        });
      },
      (err) => {
        console.error("Failed to copy:", err);
        setSnackbar({
          open: true,
          message: `Failed to copy ${type}.`,
          severity: "error",
        });
      }
    );
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (document.activeElement.tagName === "TEXTAREA") return;
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

  useEffect(() => {
    // console.log("selectedPGN changed:", selectedPGN);
    if (selectedPGN) {
      try {
        const parsedData = parsePGN(selectedPGN);
        // console.log("Parsed Data:", parsedData);
        // console.log("🟢 Parsed move tree:", parsedData.moveTree);
        setMoveTree(parsedData.moveTree);
        setCurrentPath([parsedData.moveTree]);
        // console.log("🟢 Initial currentPath set:", JSON.stringify([parsedData.moveTree], null, 2));
        const newChess = new Chess(parsedData.moveTree.fen);
        setChess(newChess);
        setFen(parsedData.moveTree.fen);
        setWhitePlayer(parsedData.whitePlayer);
        setBlackPlayer(parsedData.blackPlayer);
        setWhiteElo(parsedData.whiteElo);
        setBlackElo(parsedData.blackElo);
        setFinalResult(parsedData.finalResult);
      } catch (error) {
        console.error("Error loading PGN:", error);
        const newChess = new Chess(STARTING_FEN);
        setChess(newChess);
        setFen(STARTING_FEN);
        setMoveTree({
          move: null,
          fen: STARTING_FEN,
          annotation: "",
          children: [],
        });
        setCurrentPath([
          {
            move: null,
            fen: STARTING_FEN,
            annotation: "",
            children: [],
          },
        ]);
        setWhitePlayer("White");
        setBlackPlayer("Black");
        setWhiteElo("");
        setBlackElo("");
        setFinalResult("*");
      }
    }
  }, [selectedPGN]);

  useEffect(() => {
    if (!gameId || !notes.length || isNoteInitialized) return;
    const note = notes.find((n) => n.id === parseInt(gameId));
    if (note) {
      setEffectiveGameId(gameId);
      if (note.pgn) {
        console.log("PGN Loaded from Saved Note:", note.pgn);
        setSelectedPGN(note.pgn);
        const parsedData = parsePGN(note.pgn);
        setMoveTree(parsedData.moveTree);
        setCurrentPath([parsedData.moveTree]);
        const newChess = new Chess(parsedData.moveTree.fen);
        setChess(newChess);
        setFen(parsedData.moveTree.fen);
        setWhitePlayer(parsedData.whitePlayer);
        setBlackPlayer(parsedData.blackPlayer);
        setWhiteElo(parsedData.whiteElo);
        setBlackElo(parsedData.blackElo);
        setFinalResult(parsedData.finalResult);
      } else {
        console.log("No PGN found in note, initializing new game.");
        const newChess = new Chess(STARTING_FEN);
        const initialNode = {
          move: null,
          fen: STARTING_FEN,
          annotation: "",
          children: [],
        };
        setChess(newChess);
        setFen(STARTING_FEN);
        setMoveTree(initialNode);
        setCurrentPath([initialNode]);
        setWhitePlayer("White");
        setBlackPlayer("Black");
        setWhiteElo("");
        setBlackElo("");
        setFinalResult("*");
      }
      setIsNoteInitialized(true);
    }
  }, [gameId, notes, isNoteInitialized, setSelectedPGN]);

  useEffect(() => {
    // console.log("Player state updated:", { whitePlayer, blackPlayer, whiteElo, blackElo });
  }, [whitePlayer, blackPlayer, whiteElo, blackElo]);

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

  const open = Boolean(anchorEl);
  const id = open ? "share-popover" : undefined;
  const flattenMoveTree = (node) => {
    let moves = [];
    if (node.move) {
      moves.push(node);
    }
    if (node.children && node.children.length > 0) {
      node.children.forEach((child) => {
        moves = moves.concat(flattenMoveTree(child));
      });
    }
    return moves;
  };
  
  return (
    <>
      <Grid container spacing={3}>
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
  <Box>
    <IconButton onClick={toggleBoardOrientation}>🔃</IconButton>
    <IconButton onClick={handleShareClick} aria-describedby={id}>
      <ShareIcon />
    </IconButton>
    <IconButton
      onClick={(event) => setSettingsAnchorEl(event.currentTarget)}
      aria-controls={settingsAnchorEl ? "settings-menu" : undefined}
      aria-haspopup="true"
    >
      <SettingsIcon />
    </IconButton>
    <Menu
      id="settings-menu"
      anchorEl={settingsAnchorEl}
      open={Boolean(settingsAnchorEl)}
      onClose={() => setSettingsAnchorEl(null)}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      transformOrigin={{ vertical: "top", horizontal: "right" }}
    >
      <MenuItem sx={{ flexDirection: "column", gap: 2, p: 2 }}>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="mistake-threshold-label">Mistake Threshold</InputLabel>
          <Select
            labelId="mistake-threshold-label"
            value={mistakeThreshold}
            label="Mistake Threshold"
            onChange={(e) => setMistakeThreshold(e.target.value)}
          >
            {[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8].map((value) => (
              <MenuItem key={value} value={value}>
                {value}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth>
          <InputLabel id="analysis-depth-label">Analysis Depth</InputLabel>
          <Select
            labelId="analysis-depth-label"
            value={analysisDepth}
            label="Analysis Depth"
            onChange={(e) => setAnalysisDepth(e.target.value)}
          >
            {[14, 15, 16, 17, 18, 19, 20, 21, 22].map((value) => (
              <MenuItem key={value} value={value}>
                {value}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </MenuItem>
    </Menu>
  </Box>
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
                  disabled={
                    moveTree.children.length === 0 && currentPath.length === 0
                  }
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
              <Button variant="contained" onClick={analyzeFullGame} sx={{ mt: 2, mr: 1 }}>
  Analyze Full Game
</Button>



              <Card sx={{ mt: 2, height: "100%" }}>
                <CardContent sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                  <Typography variant="h6">Move List</Typography>
                  <Box sx={{ flexGrow: 1, overflowY: "auto", border: "1px solid #e0e0e0", p: 2 }}>
                    {moveList.length > 0 ? (
                      (() => {
                        const lines = [];
                        let currentLine = [];
                        let currentVariationDepth = 0;

                        const currentNode = currentPath[currentPath.length - 1];

                        moveList.forEach((item, index) => {
                          const isWhiteMove = /^\d+\.\s/.test(item.text);
                          const isBlackVariationMove = /^\d+\.\.\.\s/.test(item.text);

                          const pushMoveBox = (extraStyles = {}) => {
                            const isCurrentMove =
                              item.path &&
                              item.path.length > 0 &&
                              currentNode &&
                              item.path[item.path.length - 1] === currentNode;
                            const isMistake = mistakeNodes.includes(item.path[item.path.length - 1]);
                          
                            return (
                              <Box
                                key={`mv-${index}`}
                                component="span"
                                sx={{
                                  ...extraStyles,
                                  ml: `${currentVariationDepth * 20}px`,
                                  cursor: item.path ? "pointer" : "default",
                                  backgroundColor: isCurrentMove ? "#e0f7fa" : "transparent",
                                  p: "2px 4px",
                                  mr: 1,
                                  borderRadius: "4px",
                                  color: isMistake ? "red" : "inherit", // Highlight mistakes in red
                                }}
                                onClick={() => {
                                  if (item.path) {
                                    setCurrentPath(item.path);
                                    const newChess = new Chess(item.path[item.path.length - 1].fen);
                                    setChess(newChess);
                                    setFen(newChess.fen());
                                  }
                                }}
                              >
                                {item.text}{" "}
                                {item.annotation && (
                                  <Box
                                    component="span"
                                    sx={{
                                      fontWeight: "bold",
                                      fontStyle: "italic",
                                      color: "#555",
                                    }}
                                  >
                                    {item.annotation}
                                  </Box>
                                )}
                              </Box>
                            );
                          };

                          if (item.isVariationStart) {
                            if (currentLine.length > 0) {
                              lines.push(
                                <Box key={`line-${lines.length}`} sx={{ mb: 0.5 }}>
                                  {currentLine}
                                </Box>
                              );
                              currentLine = [];
                            }
                            currentVariationDepth = item.variationDepth + 1;
                            currentLine.push(
                              <Box key={`var-start-${index}`} component="span">
                                (
                              </Box>
                            );
                          } else if (item.isVariationEnd) {
                            currentLine.push(
                              <Box key={`var-end-${index}`} component="span">
                                )
                              </Box>
                            );
                            lines.push(
                              <Box
                                key={`line-${lines.length}`}
                                sx={{ mb: 0.5, ml: `${currentVariationDepth * 20}px` }}
                              >
                                {currentLine}
                              </Box>
                            );
                            currentLine = [];
                            currentVariationDepth = item.variationDepth;
                          } else if (item.isResult) {
                            if (currentLine.length > 0) {
                              lines.push(
                                <Box key={`line-${lines.length}`} sx={{ mb: 0.5 }}>
                                  {currentLine}
                                </Box>
                              );
                            }
                            lines.push(
                              <Box key={`result-${index}`} sx={{ mt: 2, fontWeight: "bold" }}>
                                {item.text}
                              </Box>
                            );
                            currentLine = [];
                          } else {
                            currentLine.push(pushMoveBox());
                            if ((!isWhiteMove && !item.isVariation) || isBlackVariationMove) {
                              lines.push(
                                <Box key={`line-${lines.length}`} sx={{ mb: 0.5 }}>
                                  {currentLine}
                                </Box>
                              );
                              currentLine = [];
                            }
                          }
                        });

                        if (currentLine.length > 0) {
                          lines.push(
                            <Box key={`line-${lines.length}`} sx={{ mb: 0.5 }}>
                              {currentLine}
                            </Box>
                          );
                        }

                        return lines;
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

      {/* Share Popover */}
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleShareClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        <Box sx={{ p: 2, width: 300 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Share Game
          </Typography>
          <TextField
            label="PGN"
            value={generateFullPGN()}
            multiline
            rows={4}
            InputProps={{
              readOnly: true,
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => copyToClipboard(generateFullPGN(), "PGN")}
                    edge="end"
                  >
                    <ContentCopyIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ width: "100%", mb: 2 }}
          />
          <TextField
            label="FEN"
            value={fen}
            InputProps={{
              readOnly: true,
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => copyToClipboard(fen, "FEN")}
                    edge="end"
                  >
                    <ContentCopyIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ width: "100%", mb: 2 }}
          />
          <Button variant="outlined" onClick={handleShareClose} fullWidth>
            Close
          </Button>
        </Box>
      </Popover>

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
      <Dialog
  open={isAnalyzing}
  aria-labelledby="analyzing-dialog-title"
  disableEscapeKeyDown
  disableAutoFocus // Prevent dialog from grabbing focus
  disableRestoreFocus // Prevent restoring focus to the button after close
  sx={{ "& .MuiDialog-paper": { width: "300px" } }}
>
  <DialogTitle id="analyzing-dialog-title">Analyzing Game</DialogTitle>
  <DialogContent>
    <LinearProgress
      variant="determinate"
      value={analysisProgress}
      sx={{ mt: 2, mb: 2 }}
    />
    <Typography variant="body2" color="textSecondary">
      Progress: {Math.round(analysisProgress)}% - Analyzing moves...
    </Typography>
  </DialogContent>
</Dialog>
    </>
  );
}