// src/utils/moveUtils.js
export function getMoveSequence(path) {
    return path.slice(1).map((node) => node.move).join(" ");
  }
  
  export function buildMoveList(
    node,
    moveNumber = 1,
    isWhiteTurn = true,
    moveList = [],
    currentPath = [],
    isVariation = false,
    variationDepth = 0,
    skipMoveAdd = false,
    afterVariation = false,
    isVariationStart = false
  ) {
    if (!skipMoveAdd && node.move) {
      let moveText;
      if (isVariation) {
        if (isVariationStart) {
          moveText = isWhiteTurn
            ? `${moveNumber}. ${node.move}`
            : `${moveNumber}... ${node.move}`;
        } else {
          moveText = ` ${node.move}`;
        }
      } else {
        moveText = isWhiteTurn
          ? `${moveNumber}. ${node.move}`
          : afterVariation
          ? `${moveNumber}... ${node.move}`
          : ` ${node.move}`;
      }
  
      moveList.push({
        text: moveText,
        annotation: node.annotation || "",
        path: [...currentPath],
        isVariation,
        variationDepth,
      });
  
      if (!isWhiteTurn) moveNumber += 1;
      isWhiteTurn = !isWhiteTurn;
    }
  
    if (node.children.length > 0) {
      const mainChild = node.children[0];
      const hasVariations = node.children.length > 1;
  
      if (mainChild.move) {
        const mainMoveText = isWhiteTurn
          ? `${moveNumber}. ${mainChild.move}`
          : afterVariation
          ? `${moveNumber}... ${mainChild.move}`
          : ` ${mainChild.move}`;
  
        moveList.push({
          text: mainMoveText,
          annotation: mainChild.annotation || "",
          path: [...currentPath, mainChild],
          isVariation,
          variationDepth,
        });
  
        const updatedIsWhiteTurn = !isWhiteTurn;
        const updatedMoveNumber = !isWhiteTurn ? moveNumber + 1 : moveNumber;
  
        if (hasVariations) {
          for (let i = 1; i < node.children.length; i++) {
            const variationNode = node.children[i];
            moveList.push({
              text: "(",
              isVariationStart: true,
              variationDepth,
            });
            buildMoveList(
              variationNode,
              moveNumber,
              isWhiteTurn,
              moveList,
              [...currentPath, variationNode],
              true,
              variationDepth + 1,
              false,
              false,
              true
            );
            moveList.push({
              text: ")",
              isVariationEnd: true,
              variationDepth,
            });
          }
        }
  
        buildMoveList(
          mainChild,
          updatedMoveNumber,
          updatedIsWhiteTurn,
          moveList,
          [...currentPath, mainChild],
          isVariation,
          variationDepth,
          true,
          hasVariations
        );
      } else {
        buildMoveList(
          mainChild,
          moveNumber,
          isWhiteTurn,
          moveList,
          [...currentPath, mainChild],
          isVariation,
          variationDepth,
          false,
          afterVariation
        );
      }
    }
  
    return moveList;
  }
  
  export function generatePGN(
    node,
    moveNumber = 1,
    isWhiteTurn = true,
    forceMoveNumber = false
  ) {
    if (node.children.length === 0) {
      return "";
    }
  
    const mainChild = node.children[0];
    let pgn = "";
  
    if (isWhiteTurn) {
      pgn += `${moveNumber}. ${mainChild.move} `;
    } else {
      pgn += forceMoveNumber
        ? `${moveNumber}... ${mainChild.move} `
        : `${mainChild.move} `;
    }
  
    if (mainChild.annotation) {
      pgn += `{${mainChild.annotation}} `;
    }
  
    const hasVariations = node.children.length > 1;
    if (hasVariations) {
      for (let i = 1; i < node.children.length; i++) {
        const variationNode = node.children[i];
        pgn += " (";
  
        pgn += isWhiteTurn
          ? `${moveNumber}. ${variationNode.move} `
          : `${moveNumber}... ${variationNode.move} `;
  
        if (variationNode.annotation) {
          pgn += `{${variationNode.annotation}} `;
        }
  
        if (variationNode.children.length > 0) {
          const nextMoveNumber = isWhiteTurn ? moveNumber : moveNumber + 1;
          pgn += generatePGN(
            variationNode,
            nextMoveNumber,
            !isWhiteTurn,
            false
          );
        }
  
        pgn += ") ";
      }
    }
  
    if (mainChild.children.length > 0) {
      const nextMoveNumber = isWhiteTurn ? moveNumber : moveNumber + 1;
      pgn += generatePGN(
        mainChild,
        nextMoveNumber,
        !isWhiteTurn,
        hasVariations
      );
    }
  
    return pgn.trim();
  }
  