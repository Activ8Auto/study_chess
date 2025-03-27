

export async function analyzeGame({
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
  gameId,
  setSnackbar,
}) {
  if (!moveTree || moveTree.children.length === 0) {
    setSnackbar?.({
      open: true,
      message: "No moves to analyze!",
      severity: "warning",
    });
    return;
  }

  setIsAnalyzing(true);
  setAnalysisProgress(0);

  const stockfish = new Worker("/stockfish-17-single.js");

  await new Promise((resolve) => {
    stockfish.onmessage = (event) => {
      const msg = event.data;
      if (msg === "uciok") {
        stockfish.postMessage("isready");
      } else if (msg === "readyok") {
        resolve();
      }
    };
    stockfish.postMessage("uci");
  });

  const getEvaluation = (fen) => {
    return new Promise((resolve) => {
      let evaluation = null;

      const onMessage = (event) => {
        const message = event.data;
        if (message.startsWith(`info depth ${analysisDepth}`)) {
          const parts = message.split(" ");
          const scoreIndex = parts.indexOf("score");
          if (scoreIndex !== -1) {
            const scoreType = parts[scoreIndex + 1];
            let scoreValue = parseInt(parts[scoreIndex + 2], 10);
            const turn = fen.split(" ")[1];
            if (scoreType === "cp") {
              evaluation = scoreValue / 100;
              if (turn === "b") evaluation = -evaluation;
            } else if (scoreType === "mate") {
              evaluation = scoreValue > 0 ? 100 : -100;
              if (turn === "b") evaluation = -evaluation;
            }
          }
        } else if (message.startsWith("bestmove")) {
          stockfish.removeEventListener("message", onMessage);
          resolve(evaluation);
        }
      };

      stockfish.addEventListener("message", onMessage);
      stockfish.postMessage(`position fen ${fen}`);
      stockfish.postMessage(`go depth ${analysisDepth}`);

      setTimeout(() => {
        stockfish.removeEventListener("message", onMessage);
        resolve(evaluation);
      }, 5000);
    });
  };

  const getMoveSequence = (path) => path.slice(1).map((n) => n.move).join(" ");

  const totalMovesByUser = (() => {
    let count = 0;
    let current = moveTree;
    let whiteTurn = moveTree.fen.split(" ")[1] === "w";
    while (current.children.length > 0) {
      const next = current.children[0];
      const player = whiteTurn ? whitePlayer : blackPlayer;
      if (player === "taylorandrews") count++;
      current = next;
      whiteTurn = !whiteTurn;
    }
    return count;
  })();

  let currentNode = moveTree;
  let isWhiteTurn = moveTree.fen.split(" ")[1] === "w";
  let moveNumber = parseInt(moveTree.fen.split(" ")[5]) || 1;
  let analyzedMoves = 0;
  let currentPath = [moveTree];
  const moveErrors = [];
  const mistakes = new Set();
  const isWhiteUser = whitePlayer === "taylorandrews";

  while (currentNode.children.length > 0) {
    const nextNode = currentNode.children[0];
    currentPath.push(nextNode);
    const player = isWhiteTurn ? whitePlayer : blackPlayer;

    if (player === "taylorandrews") {
      const evalBefore = await getEvaluation(currentNode.fen);
      const evalAfter = nextNode.children.length
        ? await getEvaluation(nextNode.children[0].fen)
        : await getEvaluation(nextNode.fen);

      if (evalBefore !== null && evalAfter !== null) {
        const drop = isWhiteUser ? evalBefore - evalAfter : evalAfter - evalBefore;
        if (drop > mistakeThreshold) {
          mistakes.add(getMoveSequence(currentPath));
          moveErrors.push({
            moveText: isWhiteTurn ? `${moveNumber}. ${nextNode.move}` : `${moveNumber}... ${nextNode.move}`,
            evalBefore: evalBefore.toFixed(2),
            evalAfter: evalAfter.toFixed(2),
            drop: drop.toFixed(2),
          });
        }
      }

      analyzedMoves++;
      setAnalysisProgress(Math.min((analyzedMoves / totalMovesByUser) * 100, 100));
    }

    currentNode = nextNode;
    isWhiteTurn = !isWhiteTurn;
    if (!isWhiteTurn) moveNumber++;
  }

  const mistakeList = Array.from(mistakes);
  setMoveErrors(moveErrors);
  setMistakeSequences(mistakeList);

  if (gameId) {
    setAnalysisResults(gameId, moveErrors, mistakeList);
  }

  stockfish.postMessage("quit");
  stockfish.terminate();
  setIsAnalyzing(false);
}
