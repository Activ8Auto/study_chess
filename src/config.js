const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://chess-notes.com'
  : 'http://localhost:5001';

export { API_BASE_URL }; 