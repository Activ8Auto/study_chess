import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useStockfish } from "../hooks/useStockfish";
import { loadPGNData } from "../utils/loadPGNData";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import {useChessGame, STARTING_FEN} from "../hooks/useChessGame"
import { analyzeGame } from "../utils/analyzeGame";
import SnackbarAlert from "../components/SnackbarAlert";
import { buildMoveList, generatePGN, getMoveSequence } from "../utils/moveUtils";
import { setupKeyboardNavigation } from "../utils/keyboardNavigation";
import {
  analyzePositionSafely,
  goToMove,
  onPieceDrop
} from "../utils/boardUtils";
import MoveList from "../components/MoveList";
import ChessBoardArea from "../components/ChessBoardArea";
import useChessStore from "../store";
import IconButton from "@mui/material/IconButton";
import {savePGNWithAnnotations, generateFullPGN} from "../utils/savePGN"

import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import LinearProgress from "@mui/material/LinearProgress";
import {
  Card,
  CardContent,
  Paper,
  Typography,
  FormControlLabel,
  Checkbox,
  Button,
  Grid,
  Box,
  Popover,
  TextField,
  InputAdornment,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

export default function GameReview() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const {
    notes,
    selectedPGN,
    deleteNote,
    analysisResults,
    setAnalysisResults,
    setSelectedPGN,
    updateNotePGN,
    addNote,
  } = useChessStore();

  const {
    fen,
    setFen,
    chess,
    setChess,
    moveTree,
    setMoveTree,
    currentPath,
    setCurrentPath,
    boardOrientation,
    toggleBoardOrientation,
    whitePlayer,
    setWhitePlayer,
    blackPlayer,
    setBlackPlayer,
    whiteElo,
    setWhiteElo,
    blackElo,
    setBlackElo,
    finalResult,
    setFinalResult,
    moveList,
  } = useChessGame();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [mistakeSequences, setMistakeSequences] = useState([]);
  const [pinnedMove, setPinnedMove] = useState(null);
  const [mistakeThreshold, setMistakeThreshold] = useState(0.3);
  const [analysisDepth, setAnalysisDepth] = useState(18);
  const [settingsAnchorEl, setSettingsAnchorEl] = useState(null);
  const [moveErrors, setMoveErrors] = useState([]);
  const [effectiveGameId, setEffectiveGameId] = useState(null);
  // const [engineEval, setEngineEval] = useState(null);
  // const [topLine, setTopLine] = useState("");
  // const [stockfish, setStockfish] = useState(null);
  const { stockfish, engineEval,depth, setEngineEval, topLine, setTopLine } = useStockfish(chess, currentPath);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [anchorEl, setAnchorEl] = useState(null);
  const getNodeByMovePath = (node, movePath) => {
    let current = node;
    for (const move of movePath) {
      const child = current.children.find((c) => c.move === move);
      if (!child) return null;
      current = child;
    }
    return current;
  };

  const handleSetPath = (newPath) => {
    if (newPath.length === 0) return;
    const lastNode = newPath[newPath.length - 1];
    const newChess = new Chess(lastNode.fen);
    setChess(newChess);
    setCurrentPath(newPath);
    setFen(lastNode.fen);
    setEngineEval(null);
    setTopLine("");
  };

  const handleGoToMove = (index) => {
    console.log("handleGoToMove called with index:", index, "currentPath:", currentPath);
    goToMove(
      index,
      currentPath,
      setCurrentPath,
      setFen,
      setChess,
      setEngineEval,
      setTopLine
    );
  };
  

  const annotationValue = pinnedMove
  ? getNodeByMovePath(moveTree, pinnedMove.path)?.annotation || ""
  : currentPath[currentPath.length - 1]?.annotation || "";

const handleAnnotationChange = (value) => {
  if (pinnedMove) {
    setMoveTree((prev) => {
      const newTree = JSON.parse(JSON.stringify(prev));
      const node = getNodeByMovePath(newTree, pinnedMove.path);
      if (node) {
        node.annotation = value;
      }
      return newTree;
    });
  } else {
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
  }
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
 

  
    



    const handlePieceDrop = (sourceSquare, targetSquare) => {
      return onPieceDrop(
        sourceSquare,
        targetSquare,
        currentPath,
        setCurrentPath,
        setMoveTree,
        setChess,
        setFen
      );
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
    const cleanup = setupKeyboardNavigation({
      currentPath,
      setCurrentPath,
      setFen,
      setChess,
      setEngineEval,
      setTopLine,
      toggleBoardOrientation,
      Chess,
    });
    return cleanup;
  }, [currentPath]);
  

  useEffect(() => {
    loadPGNData({
      selectedPGN,
      STARTING_FEN,
      setMoveTree,
      setCurrentPath,
      setChess,
      setFen,
      setWhitePlayer,
      setBlackPlayer,
      setWhiteElo,
      setBlackElo,
      setFinalResult,
    });
  }, [selectedPGN]);

  useEffect(() => {
    if (!gameId || !notes.length) return;
  
    const note = notes.find((n) => n.id === parseInt(gameId, 10));
    if (!note) return;
  
    const existingAnalysis = analysisResults[note.id];
    if (existingAnalysis) {
      console.log("Restoring existing analysis from store:", existingAnalysis);
      setMoveErrors(existingAnalysis.moveErrors);
      setMistakeSequences(existingAnalysis.mistakeSequences || existingAnalysis.mistakeNodes); // Handle legacy data if any
    } else {
      setMoveErrors([]);
      setMistakeSequences([]);
    }
  }, [gameId, notes, analysisResults]);
  

  useEffect(() => {
    // console.log("Player state updated:", { whitePlayer, blackPlayer, whiteElo, blackElo });
  }, [whitePlayer, blackPlayer, whiteElo, blackElo]);



  useEffect(() => {
    // console.log("GameReview topLine:", topLine); // Log here
    if (stockfish) {
      analyzePositionSafely(stockfish, chess, setEngineEval, setTopLine);
    }
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

  const analyzeFullGame = async () => {
    await analyzeGame({
      moveTree,
      whitePlayer,
      blackPlayer,
      mistakeThreshold,
      analysisDepth,
      setIsAnalyzing,
      setAnalysisProgress,
      setMoveErrors,
      setMistakeSequences,
      setAnalysisResults,
      gameId: effectiveGameId || parseInt(gameId, 10),
      setSnackbar,
    });
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
        <ChessBoardArea
  fen={fen}
  boardOrientation={boardOrientation}
  toggleBoardOrientation={toggleBoardOrientation}
  handleShareClick={handleShareClick}
  settingsAnchorEl={settingsAnchorEl}
  setSettingsAnchorEl={setSettingsAnchorEl}
  mistakeThreshold={mistakeThreshold}
  setMistakeThreshold={setMistakeThreshold}
  analysisDepth={analysisDepth}
  setAnalysisDepth={setAnalysisDepth}
  whitePlayer={whitePlayer}
  blackPlayer={blackPlayer}
  whiteElo={whiteElo}
  blackElo={blackElo}
  onPieceDrop={handlePieceDrop}
  currentPath={currentPath}
  goToMove={handleGoToMove}
  moveTree={moveTree}
  setCurrentPath={setCurrentPath}
  setChess={setChess}
  setFen={setFen}
  topLine={topLine}
  depth={depth}
  engineEval={engineEval}
/>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
          <CardContent sx={{ flexGrow: 1 }}>
          <Typography variant="h6">Annotation</Typography>
<Paper
  elevation={0}
  sx={{
    backgroundColor: "#f5f5f5",
    borderRadius: "8px",
    boxShadow: "inset 0px 2px 4px rgba(0, 0, 0, 0.1)",
    mt: 1,
    p: 1,
  }}
>
<textarea
  value={annotationValue}
  onChange={(e) => handleAnnotationChange(e.target.value)}
  placeholder="Annotation here..."
  style={{
    width: "100%",
    height: "120px",
    padding: "8px",
    fontSize: "14px",
    borderRadius: "4px",
    border: "1px solid #e0e0e0",
    resize: "none",
    backgroundColor: "transparent",
  }}
/>
{pinnedMove && (
  <Typography variant="body2" sx={{ mt: 1 }}>
    Annotating: {pinnedMove.san}
  </Typography>
)}
</Paper>
<FormControlLabel
    control={
      <Checkbox
        checked={!!pinnedMove}
        onChange={() => {
          if (pinnedMove) {
            setPinnedMove(null);
          } else {
            const currentNode = currentPath[currentPath.length - 1];
            setPinnedMove({
              path: currentPath.map((node) => node.move).filter(Boolean),
              san: currentNode.san,
            });
          }
        }}
      />
    }
    label="Pin Annotation"
    sx={{ mt: 1 }}
  />


            <Button
  variant="contained"
  onClick={async () => {
    await savePGNWithAnnotations({
      moveTree,
      finalResult,
      whitePlayer,
      blackPlayer,
      whiteElo,
      blackElo,
      updateNotePGN,
      addNote,
      effectiveGameId,
      setSelectedPGN,
      setFinalResult,
      setSnackbar,
      moveErrors,
      mistakeSequences,
      setAnalysisResults,
    });
  }}
  sx={{ mt: 2, mr: 1 }}
>
  Save PGN
</Button>

            <Button variant="contained" onClick={analyzeFullGame} sx={{ mt: 2, mr: 1 }}>
              Analyze Full Game
            </Button>

            <Card sx={{ mt: 2, height: "100%" }}>
              <CardContent sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
               
              <MoveList
  moveList={moveList}
  currentPath={currentPath}
  setCurrentPath={setCurrentPath}
  mistakeSequences={mistakeSequences}
  goToMove={handleGoToMove} // Keep this for other uses
  setPath={handleSetPath}  // Add this
/>
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
          value={generateFullPGN(moveTree, finalResult, whitePlayer, blackPlayer, whiteElo, blackElo)}

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

    <SnackbarAlert snackbar={snackbar} setSnackbar={setSnackbar} />

    <Dialog
      open={isAnalyzing}
      aria-labelledby="analyzing-dialog-title"
      disableEscapeKeyDown
      disableAutoFocus
      disableRestoreFocus
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