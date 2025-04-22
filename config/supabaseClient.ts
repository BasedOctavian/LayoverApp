// supabaseClient.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL: string = 'https://ckcglzgarinhadgrvfks.supabase.co'; // replace with your project URL
const SUPABASE_ANON_KEY: string = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrY2dsemdhcmluaGFkZ3J2ZmtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5OTkxMDIsImV4cCI6MjA1NTU3NTEwMn0.NOBKtmeoo-Zn2iAa1zYb6FtLgdbbfaTOaPwzOwBjjN8'; // replace with your anon key

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
