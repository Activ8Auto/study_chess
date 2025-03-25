// utils/keyboardNavigation.js

export function setupKeyboardNavigation({
    currentPath,
    setCurrentPath,
    setFen,
    setChess,
    setEngineEval,
    setTopLine,
    toggleBoardOrientation,
    Chess,
  }) {
    const handleKeyDown = (event) => {
      if (document.activeElement.tagName === "TEXTAREA") return;
      if (currentPath.length === 0) return;
  
      const currentNode = currentPath[currentPath.length - 1];
  
      switch (event.key) {
        case "ArrowRight":
          event.preventDefault();
          if (currentNode.children.length > 0) {
            const nextNode = currentNode.children[0];
            setCurrentPath([...currentPath, nextNode]);
            const newChess = new Chess(nextNode.fen);
            setChess(newChess);
            setFen(newChess.fen());
            setEngineEval(null);
            setTopLine("");
          }
          break;
  
        case "ArrowLeft":
          event.preventDefault();
          if (currentPath.length > 1) {
            const newPath = currentPath.slice(0, currentPath.length - 1);
            const newFen = newPath[newPath.length - 1].fen;
            setCurrentPath(newPath);
            const newChess = new Chess(newFen);
            setChess(newChess);
            setFen(newFen);
            setEngineEval(null);
            setTopLine("");
          }
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
  }
  