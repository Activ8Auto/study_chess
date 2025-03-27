import { useState, useMemo } from "react";
import { Chess } from "chess.js";
import { buildMoveList } from "../utils/moveUtils";

export const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export function useChessGame() {
  const [fen, setFen] = useState(STARTING_FEN);
  const [chess, setChess] = useState(new Chess(STARTING_FEN));
  const [moveTree, setMoveTree] = useState({
    move: null,
    fen: STARTING_FEN,
    annotation: "",
    children: [],
  });
  const [currentPath, setCurrentPath] = useState([]);
  const [boardOrientation, setBoardOrientation] = useState("white");
  const [whitePlayer, setWhitePlayer] = useState("White");
  const [blackPlayer, setBlackPlayer] = useState("Black");
  const [whiteElo, setWhiteElo] = useState("");
  const [blackElo, setBlackElo] = useState("");
  const [finalResult, setFinalResult] = useState("*");

  const moveList = useMemo(() => {
    if (!moveTree) return [];
    const fenParts = moveTree.fen.split(" ");
    const isWhiteTurn = fenParts[1] === "w";
    const startNum = parseInt(fenParts[5], 10) || 1;
    const list = buildMoveList(moveTree, startNum, isWhiteTurn, [], [moveTree], false, 0);
    if (finalResult && finalResult !== "*") {
      list.push({ text: finalResult, isResult: true });
    }
    return list;
  }, [moveTree, finalResult]);

  return {
    fen,
    setFen,
    chess,
    setChess,
    moveTree,
    setMoveTree,
    currentPath,
    setCurrentPath,
    boardOrientation,
    setBoardOrientation,
    toggleBoardOrientation: () => setBoardOrientation((prev) => (prev === "white" ? "black" : "white")),
    whitePlayer,
    setWhitePlayer,
    blackPlayer,
    setBlackPlayer,
    whiteElo,
    setWhiteElo,
    blackElo,
    setBlackElo,
    finalResult,
    setFinalResult,
    moveList,
  };
}