import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Chess } from "chess.js";

const parsePGNHeaders = (pgn) => {
    const chess = new Chess();
    try {
      // Extract headers manually
      const headerLines = pgn.split("\n").filter(line => line.startsWith("["));
      const headers = {};
      headerLines.forEach(line => {
        const match = line.match(/\[(\w+)\s+"([^"]*)"\]/);
        if (match) headers[match[1]] = match[2];
      });
  
      // Load FEN if present
      if (headers.SetUp === "1" && headers.FEN) {
        chess.load(headers.FEN);
      }
  
      // Extract moves section **without** the final result
      let movesPart = pgn.split("\n\n")[1] || "";
      
      
  
      if (movesPart) {
        chess.loadPgn(movesPart, { sloppy: true }); // Load only the clean moves
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

const useChessStore = create(
  persist(
    (set, get) => ({
      notes: [],
      selectedPGN: null,
      fen: new Chess().fen(), // Add this
      setFen: (newFen) => set({ fen: newFen }), // Add this
      fetchNotes: async () => {
        try {
          const response = await fetch("http://localhost:5001/notes");
          const data = await response.json();
          set({ notes: data });
        } catch (error) {
          console.error("Error fetching notes:", error);
        }
      },
      addNote: async (pgn) => {
        try {
          const headers = parsePGNHeaders(pgn);
          const title = createNoteTitle(headers);
          const newNote = { title, pgn };
          const response = await fetch("http://localhost:5001/notes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newNote),
          });
          const data = await response.json();
          set((state) => ({ notes: [data, ...state.notes] }));
          return data.id;
        } catch (error) {
          console.error("Error adding note:", error);
          throw error; // Re-throw to propagate to savePGNWithAnnotations
        }
      },
      updateNotePGN: async (noteId, pgn) => {
        const note = get().notes.find((n) => n.id === noteId);
        if (!note) return;
        const updatedNote = { ...note, pgn };
        try {
          const response = await fetch(`http://localhost:5001/notes/${noteId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedNote),
          });
          const data = await response.json();
          set((state) => ({
            notes: state.notes.map((n) => (n.id === data.id ? data : n)),
          }));
        } catch (error) {
          console.error("Error updating note PGN:", error);
        }
      },
      deleteNote: async (noteId) => {
        try {
          await fetch(`http://localhost:5001/notes/${noteId}`, {
            method: "DELETE",
          });
          set((state) => ({
            notes: state.notes.filter((n) => n.id !== noteId),
          }));
        } catch (error) {
          console.error("Error deleting note:", error);
        }
      },
      setSelectedPGN: (pgn) => set({ selectedPGN: pgn }),
    }),
    { name: "chess-store", getStorage: () => localStorage }
  )
);

export default useChessStore;