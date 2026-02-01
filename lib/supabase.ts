import { createClient } from '@supabase/supabase-js';

// --- CONFIGURATION ---
// 1. Go to your Supabase Project -> Settings -> API
// 2. Copy "Project URL" and "anon public key"
// 3. Paste them below (retain the quotes)

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ---------------------

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
