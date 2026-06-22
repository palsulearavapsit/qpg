// Configuration Parameters and Runtime .env Loader
const CONFIG = {
  SUPABASE_URL: "https://your-project-id.supabase.co",
  SUPABASE_ANON_KEY: "your-anon-key-here",
  GEMINI_API_KEY: "your-gemini-api-key-here"
};

// Dynamically fetch configuration from serverless environment or local .env file
async function loadEnvironment() {
  // 1. Try to load from Vercel Serverless Function first (Production)
  try {
    const apiResponse = await fetch('/api/config');
    if (apiResponse.ok) {
      const data = await apiResponse.json();
      let keysUpdated = 0;
      Object.keys(data).forEach(key => {
        if (data[key] && CONFIG.hasOwnProperty(key)) {
          CONFIG[key] = data[key];
          keysUpdated++;
        }
      });
      if (keysUpdated > 0) {
        console.log("Configuration loaded successfully from Vercel environment variables.");
        return; // Success, skip loading local .env
      }
    }
  } catch (apiError) {
    console.log("Serverless config endpoint '/api/config' not accessible. Trying local .env...");
  }

  // 2. Fall back to parsing local .env file (Local Development)
  try {
    const response = await fetch('.env');
    if (response.ok) {
      const text = await response.text();
      const lines = text.split('\n');
      lines.forEach(line => {
        const trimmed = line.trim();
        // Skip comments and empty lines
        if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) return;
        
        const index = trimmed.indexOf('=');
        const key = trimmed.slice(0, index).trim();
        const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, ''); // strip optional quotes
        
        if (key && CONFIG.hasOwnProperty(key)) {
          CONFIG[key] = value;
        }
      });
      console.log("Configuration successfully overridden from local .env");
    }
  } catch (error) {
    console.log("Local .env could not be loaded via fetch. Using hardcoded config.js variables.");
  }
}
window.CONFIG = CONFIG;
window.loadEnvironment = loadEnvironment;
