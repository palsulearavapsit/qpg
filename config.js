// Configuration Parameters and Runtime .env Loader
const CONFIG = {
  SUPABASE_URL: "https://your-project-id.supabase.co",
  SUPABASE_ANON_KEY: "your-anon-key-here",
  GEMINI_API_KEY: "your-gemini-api-key-here"
};

// Dynamically fetch and parse the .env file if running on a local development server
async function loadEnvironment() {
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
      console.log("Configuration successfully overridden from .env");
    }
  } catch (error) {
    console.log("Local .env could not be loaded via fetch (e.g. running directly via file:// protocol). Using hardcoded config.js variables.");
  }
}
window.CONFIG = CONFIG;
window.loadEnvironment = loadEnvironment;
