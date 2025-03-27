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
              display: "inline-block",
              verticalAlign: "middle",
              ml: `${currentVariationDepth * 5}px`,
              cursor: item.path ? "pointer" : "default",
              bgcolor: isCurrentMove ? "#b2ebf2" : "transparent",
              px: 0.25,
              borderRadius: 1,
              color: isMistake ? "error.main" : "inherit",
              "&:hover": item.path ? { bgcolor: "grey.200" } : {},
              maxWidth: "100%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            onClick={() => item.path && setPath(item.path)}
            role={item.path ? "button" : undefined}
            aria-label={item.path ? `Go to move ${item.text}` : undefined}
          >
            <Typography 
              component="span" 
              sx={{ 
                fontSize: "0.75rem",
                lineHeight: 1.2,
                display: "inline-block",
                maxWidth: "100%",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {item.text}
            </Typography>
            {item.annotation && (
              <Box
                component="span"
                sx={{
                  fontStyle: "italic",
                  color: "text.secondary",
                  ml: 0.25,
                  fontSize: "0.625rem",
                  maxWidth: "30px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  display: "inline-block",
                  verticalAlign: "middle",
                }}
              >
                {item.annotation}
              </Box>
            )}
          </Box>
        );
      };

      if (item.isVariationStart) {
        if (currentLine.length) {
          lines.push(
            <Box
              key={`line-${lines.length}`}
              sx={{
                display: "flex",
                flexWrap: "nowrap",
                overflowX: "hidden",
                mb: 0.5,
                width: "100%",
              }}
            >
              {currentLine}
            </Box>
          );
          currentLine = [];
        }
        currentVariationDepth = item.variationDepth + 1;
        currentLine.push(<Box key={`var-start-${index}`} component="span" sx={{ mr: 0.5 }}>(</Box>);
      } else if (item.isVariationEnd) {
        currentLine.push(<Box key={`var-end-${index}`} component="span" sx={{ ml: 0.5 }}>)</Box>);
        lines.push(
          <Box
            key={`line-${lines.length}`}
            sx={{
              display: "flex",
              flexWrap: "nowrap",
              overflowX: "hidden",
              mb: 0.5,
              ml: `${currentVariationDepth * 10}px`,
            }}
          >
            {currentLine}
          </Box>
        );
        currentLine = [];
        currentVariationDepth = item.variationDepth;
      } else if (item.isResult) {
        if (currentLine.length) {
          lines.push(
            <Box
              key={`line-${lines.length}`}
              sx={{
                display: "flex",
                flexWrap: "nowrap",
                overflowX: "hidden",
                mb: 0.5,
              }}
            >
              {currentLine}
            </Box>
          );
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
          lines.push(
            <Box
              key={`line-${lines.length}`}
              sx={{
                display: "flex",
                flexWrap: "nowrap",
                overflowX: "hidden",
                mb: 0.5,
              }}
            >
              {currentLine}
            </Box>
          );
          currentLine = [];
        }
      }
    });

    if (currentLine.length) {
      lines.push(
        <Box
          key={`line-${lines.length}`}
          sx={{
            display: "flex",
            flexWrap: "nowrap",
            overflowX: "hidden",
            mb: 0.5,
          }}
        >
          {currentLine}
        </Box>
      );
    }

    return lines;
  };

  return (
    <Box sx={{ 
      display: "flex", 
      flexDirection: "column", 
      height: "100%", 
      width: "100%",
      overflow: "hidden"
    }}>
      <Typography variant="h6" gutterBottom sx={{ fontSize: "1rem" }}>
        Move List
      </Typography>
      <Paper
        sx={{
          flexGrow: 1,
          maxHeight: "400px", 
          overflowY: "auto",  
          overflowX: "hidden",  
          p: 1, // Reduced padding
          mt: 0.5, // Reduced margin
          borderRadius: "8px",
          backgroundColor: "#f5f5f5",
          boxShadow: "inset 0px 2px 4px rgba(0, 0, 0, 0.1)",
          width: "100%",     
          maxWidth: "100%",  
          boxSizing: "border-box", 
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