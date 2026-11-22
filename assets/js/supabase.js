export const SUPABASE_URL = "https://mamvepuotqbebdnowf.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hbXZlcHVvdHFiZWZiZGJub3dmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUzMTg3MDgsImV4cCI6MjExMDg5NDcwOH0.on-hxSMJ-b1xtHD7Lm2OkfwTCU0bfADvUGi1saxc5m4";

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storage: localStorage }
});
