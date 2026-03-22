import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL !== "your_supabase_project_url" ? process.env.NEXT_PUBLIC_SUPABASE_URL : "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder";

// For public-facing non-admin reads
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// For admin operations and CRON jobs
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
