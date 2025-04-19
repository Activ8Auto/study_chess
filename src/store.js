import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Chess } from "chess.js";
import { createJSONStorage } from "zustand/middleware";


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
export const API_BASE_URL = "https://chess-notes.com/api"
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
              "Authorization": token, // Use raw token (no "Bearer" prefix needed for your setup)
            },
          });
          if (response.status === 401 || response.status === 403) {
            get().logout();
            return;
          }
          if (!response.ok) throw new Error("Failed to fetch notes");
          const data = await response.json();
          set({ notes: data });
        } catch (error) {
          console.error("Error fetching notes:", error);
        }
      },
      addNote: async (pgn) => {
        const token = get().token;
        if (!token) {
          console.error("No token, please log in");
          throw new Error("No token available");
        }
        try {
          const headers = parsePGNHeaders(pgn);
          const title = createNoteTitle(headers);
          const newNote = { title, pgn };
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
      updateNotePGN: async (noteId, pgn) => {
        const token = get().token;
        if (!token) return;
        const note = get().notes.find((n) => n.id === noteId);
        if (!note) return;
        const updatedNote = { ...note, pgn };
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
      }),
    }
  )
);

export default useChessStore;