import { Chess } from "chess.js";
import { parsePGN } from "./parsePGN";

export function loadPGNData({
  selectedPGN,
  STARTING_FEN,
  setMoveTree,
  setCurrentPath,
  setChess,
  setFen,
  setWhitePlayer,
  setBlackPlayer,
  setWhiteElo,
  setBlackElo,
  setFinalResult,
}) {
  if (!selectedPGN) return;

  try {
    const parsedData = parsePGN(selectedPGN);
    setMoveTree(parsedData.moveTree);
    setCurrentPath([parsedData.moveTree]);

    const newChess = new Chess(parsedData.moveTree.fen);
    setChess(newChess);
    setFen(parsedData.moveTree.fen);
    setWhitePlayer(parsedData.whitePlayer);
    setBlackPlayer(parsedData.blackPlayer);
    setWhiteElo(parsedData.whiteElo);
    setBlackElo(parsedData.blackElo);
    setFinalResult(parsedData.finalResult);
  } catch (error) {
    console.error("Error loading PGN:", error);

    const newChess = new Chess(STARTING_FEN);
    const emptyTree = {
      move: null,
      fen: STARTING_FEN,
      annotation: "",
      children: [],
    };

    setChess(newChess);
    setFen(STARTING_FEN);
    setMoveTree(emptyTree);
    setCurrentPath([emptyTree]);
    setWhitePlayer("White");
    setBlackPlayer("Black");
    setWhiteElo("");
    setBlackElo("");
    setFinalResult("*");
  }
}
