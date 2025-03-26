import { Chess } from "chess.js";

export function generateFullPGN(
  moveTree,
  finalResult,
  whitePlayer,
  blackPlayer,
  whiteElo,
  blackElo
) {
  const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

  const generatePGN = (node, moveNumber = 1, isWhiteTurn = true, forceMoveNumber = false) => {
    if (node.children.length === 0) return "";

    const mainChild = node.children[0];
    let pgn = isWhiteTurn
      ? `${moveNumber}. ${mainChild.move} `
      : forceMoveNumber
      ? `${moveNumber}... ${mainChild.move} `
      : `${mainChild.move} `;

    if (mainChild.annotation) {
      // Replace newlines with spaces in the annotation
      const sanitizedAnnotation = mainChild.annotation.replace(/\n/g, " ");
      pgn += `{${sanitizedAnnotation}} `;
    }

    for (let i = 1; i < node.children.length; i++) {
      const variationNode = node.children[i];
      pgn += " (";
      pgn += isWhiteTurn
        ? `${moveNumber}. ${variationNode.move} `
        : `${moveNumber}... ${variationNode.move} `;

      if (variationNode.annotation) {
        // Replace newlines with spaces in variation annotation
        const sanitizedVariationAnnotation = variationNode.annotation.replace(/\n/g, " ");
        pgn += `{${sanitizedVariationAnnotation}} `;
      }

      if (variationNode.children.length > 0) {
        const varNextMoveNumber = isWhiteTurn ? moveNumber : moveNumber + 1;
        pgn += generatePGN(variationNode, varNextMoveNumber, !isWhiteTurn);
      }

      pgn += ") ";
    }

    if (mainChild.children.length > 0) {
      const nextMoveNumber = isWhiteTurn ? moveNumber : moveNumber + 1;
      pgn += generatePGN(mainChild, nextMoveNumber, !isWhiteTurn, node.children.length > 1);
    }

    return pgn.trim();
  };

  const startingFen = moveTree.fen;
  const fenParts = startingFen.split(" ");
  const isWhiteTurn = fenParts[1] === "w";
  const startingMoveNumber = parseInt(fenParts[5], 10) || 1;
  const pgnBody = generatePGN(moveTree, startingMoveNumber, isWhiteTurn, true);
  const result = finalResult === "½-½" ? "1/2-1/2" : finalResult || "*";

  const headers = {
    Event: "Chess Game",
    White: whitePlayer || "White",
    Black: blackPlayer || "Black",
    WhiteElo: whiteElo || "",
    BlackElo: blackElo || "",
    Date: new Date().toISOString().split("T")[0],
  };

  if (moveTree.fen !== STARTING_FEN) {
    headers.SetUp = "1";
    headers.FEN = moveTree.fen;
  }

  let fullPGN = Object.entries(headers)
    .map(([key, value]) => `[${key} "${value}"]`)
    .join("\n");

  if (pgnBody || result !== "*") {
    fullPGN += `\n\n${pgnBody} ${result}`;
  }

  return fullPGN;
}

export async function savePGNWithAnnotations({
  moveTree,
  finalResult,
  whitePlayer,
  blackPlayer,
  whiteElo,
  blackElo,
  updateNotePGN,
  addNote,
  effectiveGameId,
  setSelectedPGN,
  setFinalResult,
  setSnackbar,
  moveErrors,
  mistakeSequences,
  setAnalysisResults,
}) {
  if (!moveTree) return;

  const finalChess = new Chess(moveTree.fen);
  const buildFenRecursively = (node) => {
    if (node.children.length > 0) {
      const mainChild = node.children[0];
      finalChess.move(mainChild.move);
      buildFenRecursively(mainChild);
    }
  };
  buildFenRecursively(moveTree);

  let result = finalResult && finalResult !== "*" ? finalResult : "*";

  if (finalChess.isGameOver() && (result === "*" || !result)) {
    if (finalChess.isCheckmate()) {
      result = finalChess.turn() === "b" ? "1-0" : "0-1";
    } else if (finalChess.isDraw() || finalChess.isStalemate()) {
      result = "½-½";
    }
  }

  const fullPGN = generateFullPGN(
    moveTree,
    result,
    whitePlayer,
    blackPlayer,
    whiteElo,
    blackElo
  );

  try {
    if (effectiveGameId) {
      await updateNotePGN(effectiveGameId, fullPGN);
      setSnackbar({
        open: true,
        message: "Game updated with new annotations and moves!",
        severity: "success",
      });
    } else {
      const noteId = await addNote(fullPGN);
      if (!noteId) throw new Error("Failed to create new note");
      setAnalysisResults(noteId, moveErrors, mistakeSequences);
      setSelectedPGN(fullPGN);
      setSnackbar({
        open: true,
        message: "New game saved!",
        severity: "success",
      });
    }
    setFinalResult(result);
  } catch (error) {
    console.error("Error saving PGN:", error);
    setSnackbar({
      open: true,
      message: `Failed to save PGN: ${error.message}`,
      severity: "error",
    });
  }
}
