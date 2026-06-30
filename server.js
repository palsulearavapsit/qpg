// server.js — Express server for Render deployment
// Serves static files + /api/config endpoint using Render environment variables

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the project root
app.use(express.static(path.join(__dirname)));

// /api/config — returns env vars to the frontend (no secrets in code!)
app.get('/api/config', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({
    SUPABASE_URL: process.env.SUPABASE_URL || '',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || ''
  });
});

// Fallback — serve index.html for any unmatched route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[+] Server running on port ${PORT}`);
});
