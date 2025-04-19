import useChessStore from '../store';

export const getChatGPTAnalysis = async ({
  fen,
  bestMove,
  pv,
  evaluation,
  sideToMove,
  whiteElo,
  blackElo,
  analyzingPlayer
}) => {
  try {
    return await useChessStore.getState().getChatGPTAnalysis({
      fen,
      bestMove,
      pv,
      evaluation,
      sideToMove,
      whiteElo,
      blackElo,
      analyzingPlayer
    });
  } catch (error) {
    console.error('Error getting ChatGPT analysis:', error);
    throw error;
  }
}; 