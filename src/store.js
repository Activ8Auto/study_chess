import { create } from "zustand";
import { persist } from "zustand/middleware";
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

const useChessStore = create(
  persist(
    (set, get) => ({
      notes: [],
      selectedPGN: null,
      activeNote: null,
      fen: [],
      count: 0,
      user: "taylorandrews",
      rowData: {},
      loadingNotes: false,

      setSelectedPGN: (pgn) => set({ selectedPGN: pgn }),

      fetchNotes: async () => {
        if (get().loadingNotes) return;
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
          title = createNoteTitle(chess.header());
        } else if (gameData && gameData.white && gameData.black) {
          title = `${gameData.white} vs ${gameData.black}`;
        }

        const newNote = {
          title,
          body: "",
          fen: fen || "",
          moveNotes: {},
          chessComGameId: chessComGameId || null,
          pgn: pgn || ""
        };

        try {
          const response = await fetch("http://localhost:5001/notes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newNote),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
          }

          const data = await response.json();
          set((state) => ({
            notes: [data, ...state.notes],
            activeNote: data.id,
          }));
          return data.id;
        } catch (error) {
          console.error("Error adding note:", error);
          return null;
        }
      },

      updateNotePGN: async (noteId, pgn) => {
        try {
          const note = get().notes.find((n) => n.id === noteId);
          if (!note) {
            console.error("Note not found:", noteId);
            return;
          }
          const updatedNote = { ...note, pgn };
          const response = await fetch(`http://localhost:5001/notes/${noteId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedNote),
          });
          if (!response.ok) {
            throw new Error("Failed to update note PGN");
          }
          const data = await response.json();
          set((state) => ({
            notes: state.notes.map((n) => (n.id === data.id ? data : n)),
          }));
        } catch (error) {
          console.error("Error updating note PGN:", error);
        }
      },

      updateNote: async (updatedNote) => {
        try {
          const response = await fetch(`http://localhost:5001/notes/${updatedNote.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedNote),
          });
          const data = await response.json();
          set((state) => ({
            notes: state.notes.map((note) => (note.id === data.id ? data : note)),
          }));
        } catch (error) {
          console.error("Error updating note:", error);
        }
      },

      deleteNote: async (noteId) => {
        try {
          const response = await fetch(`http://localhost:5001/notes/${noteId}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
          });
          if (!response.ok) {
            throw new Error(`Failed to delete note: ${response.statusText}`);
          }
          set((state) => ({
            notes: state.notes.filter((note) => note.id !== noteId),
          }));
        } catch (error) {
          console.error("Error deleting note from backend:", error);
          throw error;
        }
      },

      setActiveNote: (noteId) => set({ activeNote: noteId }),

      getActiveNote: () => {
        const state = get();
        return state.notes.find((note) => note.id === state.activeNote) || null;
      },

      setFen: (fen) => set({ fen }),
      setCount: (count) => set({ count }),
      setRowData: (data) => set({ rowData: data }),

      saveMoveNotes: async (gameId, moveNotes, fen) => {
        try {
          let note = get().notes.find((n) => n.id === gameId);
          let noteId = gameId;

          if (!note && fen) {
            noteId = await get().addNote(fen, get().selectedPGN);
            note = get().notes.find((n) => n.id === noteId);
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

          const response = await fetch(`http://localhost:5001/notes/${noteId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedNote),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to save move notes: ${response.status} - ${errorText}`);
          }

          const data = await response.json();
          set((state) => ({
            notes: state.notes.map((note) => (note.id === data.id ? data : note)),
          }));
        } catch (error) {
          console.error("Error saving move notes:", error);
        }
      },
    }),
    {
      name: "chess-store",
      getStorage: () => localStorage,
    }
  )
);

export default useChessStore;