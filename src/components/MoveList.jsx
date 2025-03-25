import React from "react";
import { Box, Typography } from "@mui/material";
import { Chess } from "chess.js";

const getMoveSequence = (path) =>
  path.slice(1).map((node) => node.move).join(" ");

export default function MoveList({
  moveList,
  currentPath,
  setCurrentPath,
  mistakeSequences,
}) {
  const currentNode = currentPath[currentPath.length - 1];

  const renderMoves = () => {
    const lines = [];
    let currentLine = [];
    let currentVariationDepth = 0;

    moveList.forEach((item, index) => {
      const isWhiteMove = /^\d+\.\s/.test(item.text);
      const isBlackVariationMove = /^\d+\.\.\.\s/.test(item.text);

      const pushMoveBox = () => {
        const isCurrentMove =
          item.path &&
          item.path.length > 0 &&
          currentNode &&
          item.path[item.path.length - 1] === currentNode;
        const isMistake =
          item.path &&
          mistakeSequences.includes(getMoveSequence(item.path));

        return (
          <Box
            key={`mv-${index}`}
            component="span"
            sx={{
              ml: `${currentVariationDepth * 20}px`,
              cursor: item.path ? "pointer" : "default",
              backgroundColor: isCurrentMove ? "#e0f7fa" : "transparent",
              p: "2px 4px",
              mr: 1,
              borderRadius: "4px",
              color: isMistake ? "red" : "inherit",
            }}
            onClick={() => {
              if (item.path) {
                setCurrentPath(item.path);
              }
            }}
          >
            {item.text}
            {item.annotation && (
              <Box
                component="span"
                sx={{
                  fontWeight: "bold",
                  fontStyle: "italic",
                  color: "#555",
                }}
              >
                {" "}
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
  };

  return (
    <Box>
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
          renderMoves()
        ) : (
          <Typography variant="body2">No moves yet</Typography>
        )}
      </Box>
    </Box>
  );
}
