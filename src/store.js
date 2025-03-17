import { create } from "zustand";
import { Chess } from "chess.js";

const parsePGNHeaders = (pgn) => {
  const chess = new Chess();
  chess.loadPgn(pgn);
  const headers = chess.header();
  return {
    white: headers.White || "Unknown",
    black: headers.Black || "Unknown",
    whiteElo: headers.WhiteElo || "",
    blackElo: headers.BlackElo || "",
    date: headers.Date || "Unknown Date",
  };
};
const createNoteTitle = (headers) => {
  const { white, black, whiteElo, blackElo, date } = headers;
  return `${white} (${whiteElo}) vs ${black} (${blackElo}) - ${date}`;
};

const useChessStore = create((set) => ({
  notes: [],
  selectedPGN: null,
  setSelectedPGN: (pgn) => set({ selectedPGN: pgn }),
  activeNote: null,
  fen: [],
  count: 0,
  user: "taylorandrews",
  rowData: {},
  loadingNotes: false,

  fetchNotes: async () => {
    if (useChessStore.getState().loadingNotes) return;
    set({ loadingNotes: true });
    try {
      const response = await fetch("http://localhost:5001/notes");
      const data = await response.json();
      console.log("Fetched notes:", data);
      set({ notes: data, loadingNotes: false });
    } catch (error) {
      console.error("Error fetching notes:", error);
      set({ loadingNotes: false });
    }
  },
  addNote: async (fen, pgn, chessComGameId, gameData) => {
    let title = "New Game Note";
    if (pgn) {
      const chess = new Chess();
      chess.loadPgn(pgn);
      const headers = chess.header();
      const white = headers.White || "Unknown";
      const black = headers.Black || "Unknown";
      const whiteElo = headers.WhiteElo || "";
      const blackElo = headers.BlackElo || "";
      const date = headers.Date || "Unknown Date";
      title = `${white} (${whiteElo}) vs ${black} (${blackElo}) - ${date}`;
    } else if (gameData && gameData.white && gameData.black) {
      title = `${gameData.white} vs ${gameData.black}`;
    }

    const newNote = {
      title,
      body: "",
      fen: fen || "", // Save FEN
      moveNotes: {},
      chessComGameId: chessComGameId || null,
    };
    try {
      const response = await fetch("http://localhost:5001/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newNote),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`,
        );
      }
      const data = await response.json();
      set((state) => ({ notes: [data, ...state.notes], activeNote: data.id }));
      return data.id;
    } catch (error) {
      console.error("Error adding note:", error);
      return null;
    }
  },

  updateNote: async (updatedNote) => {
    try {
      const response = await fetch(
        `http://localhost:5001/notes/${updatedNote.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedNote),
        },
      );
      const data = await response.json();
      set((state) => ({
        notes: state.notes.map((note) => (note.id === data.id ? data : note)),
      }));
    } catch (error) {
      console.error("Error updating note:", error);
    }
  },

  // store.js
  deleteNote: async (noteId) => {
    try {
      const response = await fetch(`http://localhost:5001/notes/${noteId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete note: ${response.statusText}`);
      }

      // Update local state after successful deletion
      set((state) => ({
        notes: state.notes.filter((note) => note.id !== noteId),
      }));
    } catch (error) {
      console.error("Error deleting note from backend:", error);
      throw error; // Let the caller handle the error
    }
  },

  setActiveNote: (noteId) => set({ activeNote: noteId }),

  getActiveNote: () => {
    const state = useChessStore.getState();
    return state.notes.find((note) => note.id === state.activeNote) || null;
  },

  setFen: (fen) => set({ fen }),
  setCount: (count) => set({ count }),
  setRowData: (data) => set({ rowData: data }),

  saveMoveNotes: async (gameId, moveNotes, fen) => {
    try {
      let note = useChessStore.getState().notes.find((n) => n.id === gameId);
      let noteId = gameId;

      if (!note && fen) {
        noteId = await useChessStore
          .getState()
          .addNote(fen, useChessStore.getState().selectedPGN);
        note = useChessStore.getState().notes.find((n) => n.id === noteId);
      }

      if (!note) {
        console.error("Failed to find or create note for gameId:", gameId);
        return;
      }

      const updatedNote = {
        ...note,
        title: note.title || "New Game Note",
        fen: fen || note.fen || "",
        moveNotes,
      };
      console.log("Sending to PUT /notes/:id:", updatedNote);
      const response = await fetch(`http://localhost:5001/notes/${noteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedNote),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to save move notes: ${response.status} - ${errorText}`,
        );
      }

      const data = await response.json();
      set((state) => ({
        notes: state.notes.map((note) => (note.id === data.id ? data : note)),
      }));
    } catch (error) {
      console.error("Error saving move notes:", error);
    }
  },
}));

export default useChessStore;
