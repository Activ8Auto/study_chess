import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useStockfish } from "../hooks/useStockfish";
import { loadPGNData } from "../utils/loadPGNData";
import { Chess } from "chess.js";
import {useChessGame, STARTING_FEN} from "../hooks/useChessGame"
import { analyzeGame } from "../utils/analyzeGame";
import { getChatGPTAnalysis } from "../utils/chatGPTAnalysis";
import SnackbarAlert from "../components/SnackbarAlert";
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
import ReactMarkdown from 'react-markdown';

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
    saveMoveAnalysis,
    getMoveAnalysis,
    moveAnalyses,
    getAllMoveAnalyses,
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
  const { stockfish, engineEval,depth, setEngineEval, topLine, setTopLine } = useStockfish(chess, currentPath);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [anchorEl, setAnchorEl] = useState(null);
  const [chatGPTAnalysis, setChatGPTAnalysis] = useState(null);
  const [isAnalyzingWithChatGPT, setIsAnalyzingWithChatGPT] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

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
// eslint-disable-next-line react-hooks/exhaustive-deps
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
  
// eslint-disable-next-line react-hooks/exhaustive-deps
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
// eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!gameId || !notes.length) {
      console.log("Cannot load note - missing data:", { gameId, notesLength: notes.length });
      return;
    }
  
    // Extract the numeric ID from the gameId (handles both 'note-15' and '15' formats)
    const noteId = gameId.startsWith('note-') 
      ? parseInt(gameId.replace('note-', ''), 10)
      : parseInt(gameId, 10);
    
    console.log("Looking for note with ID:", noteId);
    
    const note = notes.find((n) => n.id === noteId);
    if (!note) {
      console.log("Note not found:", { 
        gameId, 
        parsedNoteId: noteId,
        noteIds: notes.map(n => n.id) 
      });
      return;
    }
  
    console.log("Loading note:", {
      noteId: note.id,
      hasPGN: !!note.pgn,
      hasChatGPTAnalysis: !!note.chatgpt_analysis
    });

    // Set the effectiveGameId first
    setEffectiveGameId(note.id);

    // Then load the PGN data
    setSelectedPGN(note.pgn);

    const existingAnalysis = analysisResults[note.id];
    if (existingAnalysis) {
      console.log("Restoring existing analysis from store:", existingAnalysis);
      setMoveErrors(existingAnalysis.moveErrors);
      setMistakeSequences(existingAnalysis.mistakeSequences || existingAnalysis.mistakeNodes);
    } else {
      setMoveErrors([]);
      setMistakeSequences([]);
    }

    // Finally fetch all move analyses
    console.log("Fetching move analyses for note:", note.id);
    getAllMoveAnalyses(note.id)
      .then(analyses => {
        console.log("Fetched move analyses:", analyses);
      })
      .catch(error => {
        console.error("Error fetching move analyses:", error);
      });
  }, [gameId, notes, analysisResults, getAllMoveAnalyses, setSelectedPGN]);
  
// eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    // console.log("Player state updated:", { whitePlayer, blackPlayer, whiteElo, blackElo });
  }, [whitePlayer, blackPlayer, whiteElo, blackElo]);


// eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleChatGPTAnalysis = async () => {
    if (!stockfish || !chess) return;
    
    const token = useChessStore.getState().token;
    if (!token) {
      setSnackbar({
        open: true,
        message: "Please log in to use ChatGPT analysis",
        severity: "error",
      });
      return;
    }
    
    setIsAnalyzingWithChatGPT(true);
    try {
      const analysis = await getChatGPTAnalysis({
        fen: chess.fen(),
        bestMove: topLine.split(' ')[0],
        pv: topLine,
        evaluation: engineEval,
        sideToMove: chess.turn() === 'w' ? 'white' : 'black',
        whiteElo,
        blackElo,
        analyzingPlayer: "taylorandrews"
      });
      
      setChatGPTAnalysis(analysis);
      
      // Save the analysis if we have a note ID
      if (effectiveGameId) {
        const movePath = currentPath.map(node => node.move).filter(Boolean);
        const movePathStr = movePath.join(',');
        
        // Save to moveAnalyses
        await saveMoveAnalysis(
          effectiveGameId,
          movePath,
          chess.fen(),
          { moveErrors, mistakeSequences },
          analysis
        );
        
        // Also save to the note's chatgpt_analysis field
        const note = notes.find(n => n.id === effectiveGameId);
        if (note) {
          const updatedChatGPTAnalysis = {
            ...(note.chatgpt_analysis || {}),
            [movePathStr]: analysis
          };
          
          // Update the note with the new analysis
          await updateNotePGN(effectiveGameId, note.pgn, updatedChatGPTAnalysis);
          
          // Update the local notes state
          const updatedNotes = notes.map(n => 
            n.id === effectiveGameId 
              ? { ...n, chatgpt_analysis: updatedChatGPTAnalysis }
              : n
          );
          useChessStore.setState({ notes: updatedNotes });
        }
      }
    } catch (error) {
      console.error("Error getting ChatGPT analysis:", error);
      setSnackbar({
        open: true,
        message: "Error getting ChatGPT analysis",
        severity: "error",
      });
    } finally {
      setIsAnalyzingWithChatGPT(false);
    }
  };

  // Add a new effect to load saved analysis when the current path changes
  useEffect(() => {
    // Wait for both currentPath and effectiveGameId to be set
    if (!currentPath.length) {
      console.log("Waiting for currentPath to be set");
      return;
    }

    if (!effectiveGameId) {
      console.log("Waiting for effectiveGameId to be set");
      return;
    }
    
    const movePath = currentPath.map(node => node.move).filter(Boolean);
    const movePathStr = movePath.join(',');
    console.log("Attempting to load analysis for:", {
      movePathStr,
      effectiveGameId,
      moveAnalysesKeys: Object.keys(moveAnalyses),
      noteIds: notes.map(n => n.id)
    });

    let savedAnalysis = null;

    // First check moveAnalyses
    savedAnalysis = moveAnalyses[effectiveGameId]?.[movePathStr];
    console.log("MoveAnalyses check:", {
      found: !!savedAnalysis,
      analysis: savedAnalysis
    });
    
    // If not found in moveAnalyses, check the note's chatgpt_analysis
    if (!savedAnalysis) {
      const note = notes.find(n => n.id === effectiveGameId);
      console.log("Note check:", {
        found: !!note,
        noteId: note?.id,
        chatgptAnalysis: note?.chatgpt_analysis
      });
      
      if (note?.chatgpt_analysis?.[movePathStr]) {
        savedAnalysis = { chatgpt_analysis: note.chatgpt_analysis[movePathStr] };
        console.log("Found analysis in note:", savedAnalysis);
      }
    }

    if (savedAnalysis?.chatgpt_analysis) {
      console.log("Setting ChatGPT analysis:", savedAnalysis.chatgpt_analysis);
      setChatGPTAnalysis(savedAnalysis.chatgpt_analysis);
    } else {
      console.log("No analysis found for move:", movePathStr);
      setChatGPTAnalysis(null);
    }
  }, [currentPath, effectiveGameId, moveAnalyses, notes]);

  // Add click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isExpanded) {
        const analysisBox = document.getElementById('chatgpt-analysis-box');
        if (analysisBox && !analysisBox.contains(event.target)) {
          setIsExpanded(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded]);

  return (
    <>
    
    <Grid container spacing={4} sx={{ 
   height: '100vh',  // Full viewport height
   width: '100%',    // Ensure full width
   margin: 0,        // Remove default margins
   padding: 0,       // Remove default padding
   overflow: 'hidden' // Prevent overall page scrolling
}}>
  <Grid
    item
    xs={12}
    md={6}
    sx={{
      height: '100%',
      width: '47%',
      maxHeight: '100%',
      padding: '0 !important', // Override default padding
      overflow: 'hidden'
    }}
  >
    <Card sx={{ 
      height: '100%', 
      width: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden' 
    }}>
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

  <Grid
    item
    xs={12}
    md={6}
    sx={{
      height: '100%', 
      maxHeight: '100%',
      width: '50%', 
      maxWidth: '50%',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}
  >
    <Card sx={{ 
      height: '100%', 
      width: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden' 
    }}>
      <CardContent sx={{ 
        flexGrow: 1, 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden' 
      }}>
        {/* ... Annotation and MoveList ... */}
        <Typography variant="h6">Annotation</Typography>
        <Paper
          elevation={0}
          sx={{
            backgroundColor: "#f5f5f5",
            borderRadius: "8px",
            boxShadow: "inset 0px 2px 4px rgba(0, 0, 0, 0.1)",
            mt: 1,
            p: 1,
            maxWidth: "100%", // Prevent Paper from growing beyond its container
    overflow: "hidden", // Clip any overflow
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
              whiteSpace: "pre-wrap",       // So text can wrap to next line
              wordBreak: "break-word",
              overflowWrap: "anywhere"
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
              chatGPTAnalysis: chatGPTAnalysis,
              currentPath,
            });
          }}
          sx={{ mt: 2, mr: 1 }}
        >
          Save PGN
        </Button>

        <Button variant="contained" onClick={analyzeFullGame} sx={{ mt: 2, mr: 1 }}>
          Analyze Full Game
        </Button>

        <Button 
          variant="contained" 
          onClick={handleChatGPTAnalysis}
          disabled={isAnalyzingWithChatGPT}
          sx={{ mt: 2, mr: 1 }}
        >
          {isAnalyzingWithChatGPT ? 'Analyzing...' : 'Get ChatGPT Analysis'}
        </Button>

        {chatGPTAnalysis && (
          <>
            <Paper
              id="chatgpt-analysis-box"
              elevation={0}
              sx={{
                backgroundColor: "#f5f5f5",
                borderRadius: "8px",
                boxShadow: "inset 0px 2px 4px rgba(0, 0, 0, 0.1)",
                mt: 2,
                p: 2,
                maxWidth: "100%",
                maxHeight: isExpanded ? "100vh" : "300px",
                overflow: "auto",
                transition: "all 0.3s ease-in-out",
                position: isExpanded ? "fixed" : "relative",
                top: isExpanded ? 0 : "auto",
                right: isExpanded ? 0 : "auto",
                width: isExpanded ? "50%" : "100%",
                height: isExpanded ? "100vh" : "auto",
                zIndex: isExpanded ? 1000 : 1,
                transform: isExpanded ? "translateX(0)" : "none",
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6">ChatGPT Analysis</Typography>
                <Button
                  size="small"
                  onClick={() => setIsExpanded(!isExpanded)}
                  sx={{ minWidth: 'auto' }}
                >
                  {isExpanded ? 'Collapse' : 'Expand'}
                </Button>
              </Box>
              <Box 
                sx={{ 
                  overflow: 'auto',
                  maxHeight: isExpanded ? 'calc(100vh - 100px)' : '250px',
                  pr: 2,
                  '& h1, & h2, & h3, & h4, & h5, & h6': {
                    mt: 2,
                    mb: 1,
                  },
                  '& p': {
                    mb: 1,
                  },
                  '& ul, & ol': {
                    pl: 3,
                    mb: 1,
                  },
                  '& li': {
                    mb: 0.5,
                  },
                  '& strong': {
                    fontWeight: 600,
                  },
                  '& em': {
                    fontStyle: 'italic',
                  }
                }}
              >
                <ReactMarkdown>{chatGPTAnalysis}</ReactMarkdown>
              </Box>
            </Paper>
            {isExpanded && (
              <Box
                sx={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: '50%',
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.1)',
                  zIndex: 999,
                }}
              />
            )}
          </>
        )}

        <Card
  sx={{
    mt: 2,
    height: "100%",
    maxWidth: "100%", // Prevent it from exceeding the Grid's width
    overflow: "hidden", // Clip any overflow
  }}
>
<CardContent
    sx={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      maxWidth: "100%", // Ensure content stays within bounds
      overflowX: "auto", // Scroll horizontally if needed
      overflowY: "auto", // Scroll vertically if needed
      boxSizing: "border-box", // Include padding in width/height
    }}
  >
    <Box sx={{ 
          flexGrow: 1, 
          display: 'flex', 
          flexDirection: 'column',
          overflow: 'hidden' 
        }}>
            <MoveList
              moveList={moveList}
              currentPath={currentPath}
              setCurrentPath={setCurrentPath}
              mistakeSequences={mistakeSequences}
              moveErrors={moveErrors}
              goToMove={handleGoToMove}
              setPath={handleSetPath}
            />
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