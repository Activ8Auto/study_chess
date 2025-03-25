import { Chess } from "chess.js";
import pgnParser from "pgn-parser";

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const parsePGN = (pgn) => {
    const normalizedPgn = pgn.includes("\n\n") ? pgn : pgn.replace(/^\[.*?\]\s*(?=\d)/, "$&\n\n");
    const [parsedPgn] = pgnParser.parse(normalizedPgn);

    const headers = Array.isArray(parsedPgn.headers)
      ? parsedPgn.headers.reduce((acc, h) => {
          acc[h.name] = h.value;
          return acc;
        }, {})
      : parsedPgn.headers || {};

    const possibleResult = (pgn.trim().split(/\s+/).pop() || "").trim();
    let recognizedResult = "*";
    if (["1-0", "0-1", "1/2-1/2", "½-½"].includes(possibleResult)) {
      recognizedResult = possibleResult === "1/2-1/2" ? "½-½" : possibleResult;
    }

    const startingFen =
      headers.SetUp === "1" && headers.FEN ? headers.FEN : STARTING_FEN;
    const chessInstance = new Chess(startingFen);

    const root = {
      move: null,
      fen: startingFen,
      annotation: "",
      children: [],
    };

    const buildTree = (pgnMoves, currentNode) => {
      let current = currentNode;
      const chess = new Chess(current.fen);

      pgnMoves.forEach((pgnMove) => {
        const move = chess.move(pgnMove.move);

        if (!move) return;

        let mainAnnotationText = "";
        if (pgnMove.comments) {
          if (Array.isArray(pgnMove.comments)) {
            mainAnnotationText = pgnMove.comments
              .map((comment) =>
                typeof comment === "string"
                  ? comment
                  : comment.text
                  ? comment.text
                  : ""
              )
              .join(" ");
          } else {
            mainAnnotationText =
              typeof pgnMove.comments === "string"
                ? pgnMove.comments
                : pgnMove.comments?.text || "";
          }
        }

        const newNode = {
          move: move.san,
          fen: chess.fen(),
          annotation: mainAnnotationText,
          children: [],
        };
        current.children.push(newNode);

        if (pgnMove.ravs && pgnMove.ravs.length > 0) {
          pgnMove.ravs.forEach((variation) => {
            if (variation.moves && variation.moves.length > 0) {
              const variationChess = new Chess(current.fen);
              const variationMove = variationChess.move(variation.moves[0].move);
              if (variationMove) {
                let annotationText = "";
                if (variation.moves[0].comments) {
                  if (Array.isArray(variation.moves[0].comments)) {
                    annotationText = variation.moves[0].comments
                      .map((comment) =>
                        typeof comment === "string"
                          ? comment
                          : comment.text
                          ? comment.text
                          : String(comment)
                      )
                      .join(" ");
                  } else {
                    annotationText = String(variation.moves[0].comments);
                  }
                }
                const variationNode = {
                  move: variationMove.san,
                  fen: variationChess.fen(),
                  annotation: annotationText,
                  children: [],
                };
                current.children.push(variationNode);
                if (variation.moves.length > 1) {
                  buildTree(variation.moves.slice(1), variationNode);
                }
              }
            }
          });
        }

        current = newNode;
      });
    };

    buildTree(parsedPgn.moves, root);

    return {
      moveTree: root,
      whitePlayer: headers.White || "White",
      blackPlayer: headers.Black || "Black",
      whiteElo: headers.WhiteElo || "",
      blackElo: headers.BlackElo || "",
      finalResult: recognizedResult,
    };
  };

  export { parsePGN };