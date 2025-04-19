import { useState, useEffect, useRef } from "react";
import { Chess } from "chess.js";

export function useStockfish(chess, currentPath) {
  const [stockfish, setStockfish] = useState(null);
  const [engineEval, setEngineEval] = useState(null);
  const [topLine, setTopLine] = useState("");
  const [depth, setDepth] = useState(null);
  const isStockfishReady = useRef(false);

  useEffect(() => {
    const stockfishWorker = new Worker("/stockfish-17-single.js");

    stockfishWorker.onmessage = (event) => {
      const message = event.data;
      if (message === "uciok") {
        stockfishWorker.postMessage("isready");
      } else if (message === "readyok") {
        isStockfishReady.current = true;
      } else if (message.startsWith("info depth")) {
        const parts = message.split(" ");
        const depthIndex = parts.indexOf("depth");
        if (depthIndex !== -1) {
          const depthValue = parseInt(parts[depthIndex + 1], 10);
          setDepth(depthValue);
        }

        const scoreIndex = parts.indexOf("score");
        if (scoreIndex !== -1) {
          const scoreType = parts[scoreIndex + 1];
          let scoreValue = parseInt(parts[scoreIndex + 2], 10);
          const pvIndex = parts.indexOf("pv");
          if (pvIndex !== -1) {
            const pvMoves = parts.slice(pvIndex + 1).join(" ");
            const tempChess = new Chess(chess.fen());
            const moveArray = pvMoves.split(" ").filter((move) => move.length >= 4);
            let formattedLine = "";
            const fenParts = chess.fen().split(" ");
            let currentMoveNumber = parseInt(fenParts[fenParts.length - 1], 10);
            const turn = chess.turn();

            // Initialize the line based on whose turn it is
            if (turn === "w") {
              formattedLine += `${currentMoveNumber}. `;
            } else {
              formattedLine += `${currentMoveNumber}... `;
            }

            moveArray.forEach((move) => {
              try {
                const m = tempChess.move({
                  from: move.slice(0, 2),
                  to: move.slice(2, 4),
                });
                if (!m) throw new Error("Invalid move in PV");
                const sanMove = m.san;
                formattedLine += `${sanMove} `;
                // After a move, if it's now white's turn, increment move number for the next white move
                if (tempChess.turn() === "w") {
                  currentMoveNumber++;
                  formattedLine += `${currentMoveNumber}. `;
                }
              } catch (e) {
                console.warn("Invalid move in PV:", move);
              }
            });

            setTopLine(formattedLine.trim());
          }
          let evalText = "";
          if (scoreType === "cp") {
            const adjustedScore = chess.turn() === "b" ? -scoreValue : scoreValue;
            const score = adjustedScore / 100;
            evalText = `${score > 0 ? "+" : ""}${score}`;
          } else if (scoreType === "mate") {
            const adjustedMate = chess.turn() === "b" ? -scoreValue : scoreValue;
            evalText = `Mate in ${Math.abs(adjustedMate)}`;
          }
          setEngineEval(evalText);
        }
      } else if (message.startsWith("bestmove")) {
        stockfishWorker.isAnalyzing = false;
      }
    };

    stockfishWorker.postMessage("uci");
    stockfishWorker.isAnalyzing = false;
    setStockfish(stockfishWorker);

    return () => {
      stockfishWorker.postMessage("quit");
      stockfishWorker.terminate();
    };
  }, [chess, currentPath]);

  return { stockfish, engineEval, setEngineEval, topLine, setTopLine, depth };
}