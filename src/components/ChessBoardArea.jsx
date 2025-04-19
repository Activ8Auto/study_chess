import React from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import {
  CardContent,
  Typography,
  IconButton,
  Box,
  Paper,
} from "@mui/material";
import ShareIcon from "@mui/icons-material/Share";
import SettingsIcon from "@mui/icons-material/Settings";
import SettingsMenu from "./SettingsMenu";

export default function ChessBoardArea({
  fen,
  boardOrientation,
  toggleBoardOrientation,
  handleShareClick,
  settingsAnchorEl,
  setSettingsAnchorEl,
  mistakeThreshold,
  setMistakeThreshold,
  analysisDepth,
  setAnalysisDepth,
  whitePlayer,
  blackPlayer,
  whiteElo,
  blackElo,
  onPieceDrop,
  currentPath,
  goToMove,
  moveTree,
  setCurrentPath,
  setChess,
  setFen,
  topLine,
  topLines,
  depth,
  engineEval,
}) {
  return (
    <CardContent>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h5">♟️ Game Review</Typography>
        <Box>
          <IconButton onClick={toggleBoardOrientation}>🔃</IconButton>
          <IconButton onClick={handleShareClick}>
            <ShareIcon />
          </IconButton>
          <IconButton
            onClick={(e) => setSettingsAnchorEl(e.currentTarget)}
            aria-controls={settingsAnchorEl ? "settings-menu" : undefined}
          >
            <SettingsIcon />
          </IconButton>
          <SettingsMenu
            settingsAnchorEl={settingsAnchorEl}
            setSettingsAnchorEl={setSettingsAnchorEl}
            mistakeThreshold={mistakeThreshold}
            setMistakeThreshold={setMistakeThreshold}
            analysisDepth={analysisDepth}
            setAnalysisDepth={setAnalysisDepth}
          />
        </Box>
      </Box>
      <Paper
        sx={{
          mt: 2,
          backgroundColor: "#f5f5f5",
          borderRadius: "8px",
          padding: "12px",
          boxShadow: "inset 0px 2px 4px rgba(0, 0, 0, 0.1)",
          height: "120px", // Fixed height for the box
          minHeight: "120px", // Ensure it doesn't shrink
          width: "100%", // Match parent width
          overflow: "auto", // Scroll if content overflows
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography
            variant="body1"
            sx={{
              color: "#333",
              fontWeight: 500,
            }}
          >
            <strong>Evaluation:</strong> {engineEval || "N/A"}
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: "#333",
              fontWeight: 500,
            }}
          >
            <strong>Depth:</strong> {depth || "N/A"}
          </Typography>
        </Box>
        <Box sx={{ mt: 2 }}>
          <Typography
            variant="body1"
            sx={{
              color: "#333",
              fontWeight: 600,
              fontFamily: "monospace",
              whiteSpace: "pre-wrap",
              overflowWrap: "break-word",
              maxHeight: "60px", // Limit height to fit within Paper
              overflow: "auto", // Scroll if topLine is too long
            }}
          >
            {topLine}
          </Typography>
        </Box>
      </Paper>
      <Chessboard
        position={fen}
        boardOrientation={boardOrientation}
        onPieceDrop={onPieceDrop}
      />
    </CardContent>
  );
}