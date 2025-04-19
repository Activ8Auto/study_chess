import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Chess } from "chess.js";
import { createJSONStorage } from "zustand/middleware";
import { API_BASE_URL } from "./config";


const parsePGNHeaders = (pgn) => {
  const chess = new Chess();
  try {
    const headerLines = pgn.split("\n").filter((line) => line.startsWith("["));
    const headers = {};
    headerLines.forEach((line) => {
      const match = line.match(/\[(\w+)\s+"([^"]*)"\]/);
      if (match) headers[match[1]] = match[2];
    });
    if (headers.SetUp === "1" && headers.FEN) {
      chess.load(headers.FEN);
    }
    let movesPart = pgn.split("\n\n")[1] || "";
    if (movesPart) {
      chess.loadPgn(movesPart, { sloppy: true });
    }
    return {
      white: headers.White || "Unknown",
      black: headers.Black || "Unknown",
      whiteElo: headers.WhiteElo || "",
      blackElo: headers.BlackElo || "",
      date: headers.Date || "Unknown Date",
    };
  } catch (error) {
    console.error("Failed to parse PGN headers:", error.message, "PGN:", pgn);
    throw error;
  }
};

const createNoteTitle = (headers) => {
  const { white, black, whiteElo, blackElo, date } = headers;
  return `${white} (${whiteElo}) vs ${black} (${blackElo}) - ${date}`;
};
// export const API_BASE_URL = "http://localhost:5001";
console.log('REACT_APP_API_PATH:', process.env.REACT_APP_API_PATH);
const useChessStore = create(
  persist(
    (set, get) => ({
      notes: [],
      selectedPGN: null,
      token: null,
      chesscomUsername: null,
      setUserChesscomUsername: (chesscomUsername) => set({ chesscomUsername }),
      setToken: (token) => set({ token }),
      logout: () => set({ token: null, notes: [] }),
      fen: new Chess().fen(),
      analysisResults: {},
      setFen: (newFen) => set({ fen: newFen }),
      fetchNotes: async () => {
        const token = get().token;
        if (!token) {
          console.error("No token, please log in");
          return;
        }
        try {
          const response = await fetch(`${API_BASE_URL}/notes`, {
            headers: {
              "Authorization": token,
            },
          });
          if (response.status === 401 || response.status === 403) {
            get().logout();
            return;
          }
          if (!response.ok) throw new Error("Failed to fetch notes");
          const data = await response.json();
          // Ensure chatgpt_analysis is properly initialized for each note
          const notesWithAnalysis = data.map(note => ({
            ...note,
            chatgpt_analysis: note.chatgpt_analysis || {}
          }));
          set({ notes: notesWithAnalysis });
        } catch (error) {
          console.error("Error fetching notes:", error);
        }
      },
      addNote: async (pgn, chatgpt_analysis = {}) => {
        const token = get().token;
        if (!token) {
          console.error("No token, please log in");
          throw new Error("No token available");
        }
        try {
          const headers = parsePGNHeaders(pgn);
          const title = createNoteTitle(headers);
          const newNote = { title, pgn, chatgpt_analysis };
          const response = await fetch(`${API_BASE_URL}/notes`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": token,
            },
            body: JSON.stringify(newNote),
          });
          if (response.status === 401 || response.status === 403) {
            get().logout();
            throw new Error("Unauthorized");
          }
          if (!response.ok) throw new Error("Failed to create new note");
          const data = await response.json();
          set((state) => ({ notes: [data, ...state.notes] }));
          return data.id;
        } catch (error) {
          console.error("Error adding note:", error);
          throw error;
        }
      },
      updateNotePGN: async (noteId, pgn, chatgpt_analysis) => {
        const token = get().token;
        if (!token) return;
        const note = get().notes.find((n) => n.id === noteId);
        if (!note) return;
        const updatedNote = { ...note, pgn, chatgpt_analysis };
        try {
          const response = await fetch(`${API_BASE_URL}/notes/${noteId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "Authorization": token,
            },
            body: JSON.stringify(updatedNote),
          });
          if (response.status === 401 || response.status === 403) {
            get().logout();
            return;
          }
          if (!response.ok) throw new Error("Failed to update note");
          const data = await response.json();
          set((state) => ({
            notes: state.notes.map((n) => (n.id === data.id ? data : n)),
          }));
        } catch (error) {
          console.error("Error updating note PGN:", error);
        }
      },
      deleteNote: async (noteId) => {
        const token = get().token;
        if (!token) return;
        try {
          const response = await fetch(`${API_BASE_URL}/notes/${noteId}`, {
            method: "DELETE",
            headers: {
              "Authorization": token,
            },
          });
          if (response.status === 401 || response.status === 403) {
            get().logout();
            return;
          }
          if (!response.ok) throw new Error("Failed to delete note");
          set((state) => ({
            notes: state.notes.filter((n) => n.id !== noteId),
            analysisResults: { ...state.analysisResults, [noteId]: undefined },
          }));
        } catch (error) {
          console.error("Error deleting note:", error);
        }
      },
      setSelectedPGN: (pgn) => set({ selectedPGN: pgn }),
      setAnalysisResults: (noteId, moveErrors, mistakeSequences) =>
        set((state) => ({
          analysisResults: {
            ...state.analysisResults,
            [noteId]: { moveErrors, mistakeSequences },
          },
        })),
      moveAnalyses: {},
      saveMoveAnalysis: async (noteId, movePath, fen, analysis, chatgptAnalysis) => {
        const token = get().token;
        if (!token) {
          console.error("No token, please log in");
          throw new Error("No token available");
        }
        try {
          const response = await fetch(`${API_BASE_URL}/analysis`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": token,
            },
            body: JSON.stringify({
              note_id: noteId,
              move_path: movePath,
              fen,
              analysis,
              chatgpt_analysis: chatgptAnalysis
            }),
          });
          
          if (response.status === 401 || response.status === 403) {
            get().logout();
            throw new Error("Unauthorized");
          }
          
          if (!response.ok) throw new Error("Failed to save analysis");
          
          const data = await response.json();
          
          set((state) => ({
            moveAnalyses: {
              ...state.moveAnalyses,
              [noteId]: {
                ...state.moveAnalyses[noteId],
                [movePath.join(',')]: {
                  ...data,
                  chatgpt_analysis: chatgptAnalysis
                }
              }
            }
          }));
          
          return data;
        } catch (error) {
          console.error("Error saving move analysis:", error);
          throw error;
        }
      },
      getMoveAnalysis: async (noteId, movePath) => {
        const token = get().token;
        if (!token) {
          console.error("No token, please log in");
          throw new Error("No token available");
        }
        
        const cachedAnalysis = get().moveAnalyses[noteId]?.[movePath.join(',')];
        if (cachedAnalysis) {
          return cachedAnalysis;
        }
        
        try {
          const response = await fetch(`${API_BASE_URL}/analysis/${noteId}/${movePath.join(',')}`, {
            headers: {
              "Authorization": token,
            },
          });
          
          if (response.status === 401 || response.status === 403) {
            get().logout();
            throw new Error("Unauthorized");
          }
          
          if (response.status === 404) {
            return null;
          }
          
          if (!response.ok) throw new Error("Failed to get analysis");
          
          const data = await response.json();
          
          set((state) => ({
            moveAnalyses: {
              ...state.moveAnalyses,
              [noteId]: {
                ...state.moveAnalyses[noteId],
                [movePath.join(',')]: data
              }
            }
          }));
          
          return data;
        } catch (error) {
          console.error("Error getting move analysis:", error);
          throw error;
        }
      },
      getAllMoveAnalyses: async (noteId) => {
        const token = get().token;
        if (!token) {
          console.error("No token, please log in");
          throw new Error("No token available");
        }
        
        try {
          const response = await fetch(`${API_BASE_URL}/analysis/${noteId}`, {
            headers: {
              "Authorization": token,
            },
          });
          
          if (response.status === 401 || response.status === 403) {
            get().logout();
            throw new Error("Unauthorized");
          }
          
          if (!response.ok) throw new Error("Failed to get analyses");
          
          const data = await response.json();
          
          const analysesMap = data.reduce((acc, analysis) => {
            acc[analysis.move_path.join(',')] = analysis;
            return acc;
          }, {});
          
          set((state) => ({
            moveAnalyses: {
              ...state.moveAnalyses,
              [noteId]: analysesMap
            }
          }));
          
          return data;
        } catch (error) {
          console.error("Error getting all move analyses:", error);
          throw error;
        }
      },
      getChatGPTAnalysis: async ({ fen, bestMove, pv, evaluation, sideToMove, whiteElo, blackElo, analyzingPlayer }) => {
        const token = get().token;
        if (!token) {
          console.error("No token, please log in");
          throw new Error("No token available");
        }
        try {
          const response = await fetch(`${API_BASE_URL}/chess/analyze`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": token,
            },
            body: JSON.stringify({
              fen,
              bestMove,
              pv,
              evaluation,
              sideToMove,
              whiteElo,
              blackElo,
              analyzingPlayer,
            }),
          });
          if (response.status === 401 || response.status === 403) {
            get().logout();
            throw new Error("Unauthorized");
          }
          if (!response.ok) {
            throw new Error("Failed to get analysis");
          }
          const data = await response.json();
          return data.analysis;
        } catch (error) {
          console.error("Error getting ChatGPT analysis:", error);
          throw error;
        }
      },
      saveAnalysisResults: async (noteId, moveErrors, mistakeSequences) => {
        const token = get().token;
        if (!token) {
          console.error("No token, please log in");
          throw new Error("No token available");
        }
        try {
          // Ensure we're sending arrays
          const moveErrorsArray = Array.isArray(moveErrors) ? moveErrors : [];
          const mistakeSequencesArray = Array.isArray(mistakeSequences) ? mistakeSequences : [];
          
          console.log("Saving analysis results:", {
            noteId,
            moveErrors: moveErrorsArray,
            mistakeSequences: mistakeSequencesArray
          });
          
          const response = await fetch(`${API_BASE_URL}/notes/${noteId}/analysis`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": token,
            },
            body: JSON.stringify({
              move_errors: moveErrorsArray,
              mistake_sequences: mistakeSequencesArray
            }),
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            console.error("Failed to save analysis results:", errorData);
            throw new Error(errorData.error || "Failed to save analysis results");
          }
          
          const result = await response.json();
          console.log("Analysis results saved successfully:", result);
          
          // Update the local notes state
          const updatedNotes = get().notes.map(note => 
            note.id === noteId 
              ? { 
                  ...note, 
                  move_errors: moveErrorsArray,
                  mistake_sequences: mistakeSequencesArray
                }
              : note
          );
          set({ notes: updatedNotes });
        } catch (error) {
          console.error("Error saving analysis results:", error);
          throw error;
        }
      },
    }),
    {
      name: "chess-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        notes: state.notes,
        selectedPGN: state.selectedPGN,
        fen: state.fen,
        analysisResults: state.analysisResults,
        token: state.token,
        chesscomUsername: state.chesscomUsername,
        moveAnalyses: state.moveAnalyses,
      }),
    }
  )
);

export default useChessStore;