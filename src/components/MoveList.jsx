import React from "react";
import { Box, Typography, Paper } from "@mui/material";

const getMoveSequence = (path) => path.slice(1).map((node) => node.move).join(" ");

export default function MoveList({ moveList, currentPath, setCurrentPath, mistakeSequences, goToMove, setPath }) {
  const currentNode = currentPath[currentPath.length - 1];

  const renderMoves = () => {
    const lines = [];
    let currentLine = [];
    let currentVariationDepth = 0;

    moveList.forEach((item, index) => {
      const isWhiteMove = /^\d+\.\s/.test(item.text);
      const isBlackVariationMove = /^\d+\.\.\.\s/.test(item.text);

      const pushMoveBox = () => {
        const isCurrentMove = item.path && item.path[item.path.length - 1] === currentNode;
        const isMistake = item.path && mistakeSequences.includes(getMoveSequence(item.path));

        return (
          <Box
            key={`move-${index}`}
            component="span"
            sx={{
              ml: `${currentVariationDepth * 20}px`,
              cursor: item.path ? "pointer" : "default",
              bgcolor: isCurrentMove ? "#b2ebf2" : "transparent",
              p: "2px 6px",
              borderRadius: 1,
              color: isMistake ? "error.main" : "inherit",
              "&:hover": item.path ? { bgcolor: "grey.200" } : {},
            }}
            onClick={() => item.path && setPath(item.path)}
            role={item.path ? "button" : undefined}
            aria-label={item.path ? `Go to move ${item.text}` : undefined}
          >
            {item.text}
            {item.annotation && (
              <Box component="span" sx={{ fontStyle: "italic", color: "text.secondary", ml: 1 }}>
                {item.annotation}
              </Box>
            )}
          </Box>
        );
      };

      if (item.isVariationStart) {
        if (currentLine.length) {
          lines.push(<Box key={`line-${lines.length}`} sx={{ mb: 0.5 }}>{currentLine}</Box>);
          currentLine = [];
        }
        currentVariationDepth = item.variationDepth + 1;
        currentLine.push(<Box key={`var-start-${index}`} component="span">(</Box>);
      } else if (item.isVariationEnd) {
        currentLine.push(<Box key={`var-end-${index}`} component="span">)</Box>);
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
        if (currentLine.length) {
          lines.push(<Box key={`line-${lines.length}`} sx={{ mb: 0.5 }}>{currentLine}</Box>);
        }
        lines.push(
          <Box key={`result-${index}`} sx={{ mt: 1, fontWeight: "bold" }}>
            {item.text}
          </Box>
        );
        currentLine = [];
      } else {
        currentLine.push(pushMoveBox());
        if ((!isWhiteMove && !item.isVariation) || isBlackVariationMove) {
          lines.push(<Box key={`line-${lines.length}`} sx={{ mb: 0.5 }}>{currentLine}</Box>);
          currentLine = [];
        }
      }
    });

    if (currentLine.length) {
      lines.push(<Box key={`line-${lines.length}`} sx={{ mb: 0.5 }}>{currentLine}</Box>);
    }

    return lines;
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Typography variant="h6" gutterBottom>
        Move List
      </Typography>
      <Paper
        sx={{
          flexGrow: 1,
          maxHeight: "400px", // Set a reasonable max height, adjustable
          overflowY: "auto",
          p: 2,
          mt: 1,
          borderRadius: "8px",
          backgroundColor: "#f5f5f5",
          boxShadow: "inset 0px 2px 4px rgba(0, 0, 0, 0.1)",
        }}
      >
        {moveList.length ? (
          renderMoves()
        ) : (
          <Typography variant="body2" color="text.secondary">
            No moves yet
          </Typography>
        )}
      </Paper>
    </Box>
  );
}