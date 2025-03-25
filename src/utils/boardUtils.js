// utils/boardUtils.js
import { Chess } from "chess.js";

// Analyze a position using Stockfish safely
export const analyzePositionSafely = (stockfish, chess, setEngineEval, setTopLine) => {
  if (stockfish && !stockfish.isAnalyzing) {
    stockfish.isAnalyzing = true;
    stockfish.postMessage("stop");
    stockfish.postMessage(`position fen ${chess.fen()}`);
    stockfish.postMessage("go depth 20");

    // Optional: handle responses in parent (GameReview)
  }
};

// Go to a specific move in the move path
export const goToMove = (pathIndex, currentPath, setCurrentPath, setFen, setChess, setEngineEval, setTopLine) => {
  if (pathIndex < 0 || pathIndex >= currentPath.length) return;
  const targetNode = currentPath[pathIndex];
  const newChess = new Chess(targetNode.fen);
  setChess(newChess);
  setCurrentPath(currentPath.slice(0, pathIndex + 1));
  setFen(newChess.fen());
  setEngineEval(null);
  setTopLine("");
};

// Handle user dropping a piece on the board
export const onPieceDrop = (
  sourceSquare,
  targetSquare,
  currentPath,
  setCurrentPath,
  setMoveTree,
  setChess,
  setFen
) => {
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
          if (!targetMove) return walkNodePath(rootNode, pathIndex + 1);
          const childNode = rootNode.children.find((c) => c.move === targetMove);
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
