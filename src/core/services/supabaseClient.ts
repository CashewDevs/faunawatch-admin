import { createClient } from "@supabase/supabase-js";
import { authStorage } from "./authStorage";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error(
    "Missing VITE_SUPABASE_URL environment variable. Please check your .env configuration.",
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_ANON_KEY environment variable. Please check your .env configuration.",
  );
}

// supabase-js defaults to the implicit flow, which returns tokens in the
// URL. PKCE returns a one-time code instead; its verifier is kept in
// authStorage until the Google sign-in redirect comes back.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { storage: authStorage, flowType: "pkce" },
});
