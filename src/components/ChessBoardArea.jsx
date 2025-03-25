import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import {
  CardContent,
  Typography,
  IconButton,
  Box,
  Button,
  Paper,
} from "@mui/material";
import ShareIcon from "@mui/icons-material/Share";
import SettingsIcon from "@mui/icons-material/Settings";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import SettingsMenu from "./SettingsMenu"; // Import the new component

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
          backgroundColor: "#f5f5f5", // Light gray background for contrast
          borderRadius: "8px",        // Rounded corners
          padding: "12px",            // Inner padding for inset feel
          boxShadow: "inset 0px 2px 4px rgba(0, 0, 0, 0.1)", // Inset shadow
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography
            variant="body1"
            sx={{
              color: "#333", // Darker text for readability
              fontWeight: 500, // Slightly bolder for emphasis
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
        <Typography
  variant="body1"
  align="center"
  sx={{
    mt: 1,
  color: "#333",
  fontWeight: 500,
  whiteSpace: "nowrap",      // Keep on one line
  overflow: "auto",        // Hide excess text
  textOverflow: "ellipsis",  // Add ellipsis
  maxWidth: "100%",
  }}
>
  {topLine
    ? topLine.split(" ").map((token, idx) => {
        if (/^\d+\.$/.test(token)) {
          // It's a move number like "17."
          return (
            <span
              key={idx}
              style={{
                marginRight: "4px",
                color: "#222",
                fontWeight: 600 ,       // Scroll horizontally if still too long
             
              }}
            >
              {token}
            </span>
          );
        }
        return (
          <span key={idx} style={{ marginRight: "4px" }}>
            {token}
          </span>
        );
      })
    : "N/A"}
</Typography>


      </Paper>
      <br></br>

      <Typography variant="body2" align="center" sx={{ mb: 1 }}>
        {boardOrientation === "white" ? blackPlayer : whitePlayer}
        {boardOrientation === "white" && blackElo ? ` (${blackElo})` : whiteElo ? ` (${whiteElo})` : ""}
      </Typography>

      <Chessboard position={fen} boardOrientation={boardOrientation} onPieceDrop={onPieceDrop} />

      <Typography variant="body2" align="center" sx={{ mt: 1 }}>
        {boardOrientation === "white" ? whitePlayer : blackPlayer}
        {boardOrientation === "white" && whiteElo ? ` (${whiteElo})` : blackElo ? ` (${blackElo})` : ""}
      </Typography>

      {/* Replace the Box with Paper for the evaluation section */}
      {/* <Paper
        sx={{
          mt: 2,
          backgroundColor: "#f5f5f5", // Light gray background for contrast
          borderRadius: "8px",        // Rounded corners
          padding: "12px",            // Inner padding for inset feel
          boxShadow: "inset 0px 2px 4px rgba(0, 0, 0, 0.1)", // Inset shadow
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography
            variant="body1"
            sx={{
              color: "#333", // Darker text for readability
              fontWeight: 500, // Slightly bolder for emphasis
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
        <Typography
  variant="body1"
  align="center"
  sx={{
    mt: 1,
  color: "#333",
  fontWeight: 500,
  whiteSpace: "nowrap",      // Keep on one line
  overflow: "auto",        // Hide excess text
  textOverflow: "ellipsis",  // Add ellipsis
  maxWidth: "100%",
  }}
>
  {topLine
    ? topLine.split(" ").map((token, idx) => {
        if (/^\d+\.$/.test(token)) {
          // It's a move number like "17."
          return (
            <span
              key={idx}
              style={{
                marginRight: "4px",
                color: "#222",
                fontWeight: 600 ,       // Scroll horizontally if still too long
             
              }}
            >
              {token}
            </span>
          );
        }
        return (
          <span key={idx} style={{ marginRight: "4px" }}>
            {token}
          </span>
        );
      })
    : "N/A"}
</Typography>


      </Paper> */}

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
