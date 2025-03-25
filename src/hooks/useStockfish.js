import { useState, useEffect } from "react";
import { Chess } from "chess.js";

export function useStockfish(chess, currentPath) {
  const [stockfish, setStockfish] = useState(null);
  const [engineEval, setEngineEval] = useState(null);
  const [topLine, setTopLine] = useState("");
  const [depth, setDepth] = useState(null); // New state for depth

  useEffect(() => {
    const stockfishWorker = new Worker("/stockfish-17-single.js");
    let isStockfishReady = false;

    stockfishWorker.onmessage = (event) => {
      const message = event.data;
      if (message === "uciok") {
        stockfishWorker.postMessage("isready");
      } else if (message === "readyok") {
        isStockfishReady = true;
      } else if (message.startsWith("info depth")) {
        const parts = message.split(" ");
        const depthIndex = parts.indexOf("depth");
        if (depthIndex !== -1) {
          const depthValue = parseInt(parts[depthIndex + 1], 10);
          setDepth(depthValue); // Set the depth
        //   console.log("Depth set to:", depthValue);
        }
        
        const scoreIndex = parts.indexOf("score");
        if (scoreIndex !== -1) {
          const scoreType = parts[scoreIndex + 1];
          let scoreValue = parseInt(parts[scoreIndex + 2], 10);
          const pvIndex = parts.indexOf("pv");
          if (pvIndex !== -1) {
            const pvMoves = parts.slice(pvIndex + 1).join(" ");
            // console.log("PV Moves:", pvMoves);
            const tempChess = new Chess(chess.fen());
            const moveArray = pvMoves.split(" ").filter((move) => move.length >= 4);
            let formattedLine = "";
            let moveNumber = Math.floor(currentPath.length / 2) + 1;

            moveArray.forEach((move, idx) => {
              try {
                const isWhiteMove = idx % 2 === 0;
                const m = tempChess.move({
                  from: move.slice(0, 2),
                  to: move.slice(2, 4),
                });
                if (!m) throw new Error("Invalid move in PV");
                const sanMove = m.san;
                if (isWhiteMove) {
                  formattedLine += `${moveNumber}. ${sanMove} `;
                  moveNumber++;
                } else {
                  formattedLine += `${sanMove} `;
                }
              } catch (e) {
                // console.warn("Invalid move in PV:", move);
              }
            });

            setTopLine(formattedLine.trim());
            // console.log("After setTopLine, current topLine:", formattedLine.trim());
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
        //   console.log("Engine Eval:", evalText);
          setEngineEval(evalText);
        //   console.log("After setEngineEval, current engineEval:", evalText);
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

  return { stockfish, engineEval, setEngineEval, topLine, setTopLine, depth }; // Return depth
}