-- Create a table for move analysis
CREATE TABLE move_analysis (
    id SERIAL PRIMARY KEY,
    note_id INTEGER REFERENCES notes(id) ON DELETE CASCADE,
    move_path TEXT[] NOT NULL, -- Array of moves leading to this position
    fen TEXT NOT NULL,
    analysis TEXT NOT NULL,
    chatgpt_analysis TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add an index for faster lookups
CREATE INDEX idx_move_analysis_note_id ON move_analysis(note_id);
CREATE INDEX idx_move_analysis_move_path ON move_analysis USING GIN(move_path);

-- Add a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_move_analysis_updated_at
    BEFORE UPDATE ON move_analysis
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 