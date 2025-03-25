import { useState } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import {
  Card,
  CardContent,
  Typography,
  IconButton,
  Menu,
  Grid,
  MenuItem,
  FormControl,
  Select,
  InputLabel,
  Box,
  Button,
} from "@mui/material";
import ShareIcon from "@mui/icons-material/Share";
import SettingsIcon from "@mui/icons-material/Settings";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

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
  engineEval,
  topLine,
  depth,
}) {
  const openSettings = Boolean(settingsAnchorEl);

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
            aria-controls={openSettings ? "settings-menu" : undefined}
          >
            <SettingsIcon />
          </IconButton>
          <Menu
            id="settings-menu"
            anchorEl={settingsAnchorEl}
            open={openSettings}
            onClose={() => setSettingsAnchorEl(null)}
          >
            <MenuItem sx={{ flexDirection: "column", gap: 2, p: 2 }}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Mistake Threshold</InputLabel>
                <Select value={mistakeThreshold} onChange={(e) => setMistakeThreshold(e.target.value)}>
                  {[0.1, 0.2, 0.3, 0.4, 0.5, 0.6].map((value) => (
                    <MenuItem key={value} value={value}>{value}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Analysis Depth</InputLabel>
                <Select value={analysisDepth} onChange={(e) => setAnalysisDepth(e.target.value)}>
                  {[14, 15, 16, 17, 18, 19, 20].map((value) => (
                    <MenuItem key={value} value={value}>{value}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      <Typography variant="body2" align="center" sx={{ mb: 1 }}>
        {boardOrientation === "white" ? blackPlayer : whitePlayer}
        {boardOrientation === "white" && blackElo ? ` (${blackElo})` : whiteElo ? ` (${whiteElo})` : ""}
      </Typography>

      <Chessboard position={fen} boardOrientation={boardOrientation} onPieceDrop={onPieceDrop} />

      <Typography variant="body2" align="center" sx={{ mt: 1 }}>
        {boardOrientation === "white" ? whitePlayer : blackPlayer}
        {boardOrientation === "white" && whiteElo ? ` (${whiteElo})` : blackElo ? ` (${blackElo})` : ""}
      </Typography>

      <Box sx={{ mt: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="body1">
          <strong>Evaluation:</strong> {engineEval || "N/A"}
          </Typography>
          <Typography variant="body1">
          <strong>Depth:</strong> {depth || "N/A"}
          </Typography>
        </Box>
        <Typography variant="body1" align="center" sx={{ mt: 1 }}>
          {topLine || "N/A"}
        </Typography>
      </Box>

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
    </CardContent>
  );
}