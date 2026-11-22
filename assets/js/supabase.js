export const SUPABASE_URL = "https://tftbewyknnxevbxnhydo.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmdGJld3lrbm54ZXZieG5oeWRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUzNDM0MDMsImV4cCI6MjExMDkxOTQwM30.3xJ2exBvYlVZ7HWp8ZfWLKP6a2DlwmAlkhYHEDiph1c";

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storage: localStorage }
});
