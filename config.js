// Copy this file to config.js and fill in your Supabase project values.
// The anon/publishable key is designed for browser use. Database and Storage
// security must be enforced by RLS policies in Supabase (see supabase-setup.sql).
window.APP_CONFIG = {
  SUPABASE_URL: "https://YOUR_PROJECT_REF.supabase.co",
  SUPABASE_ANON_KEY: "YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY",
  PHOTO_BUCKET: "birthday-photos",
  PHOTO_FOLDER: "shared",
  SIGNED_URL_SECONDS: 3600
};
