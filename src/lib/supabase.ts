import { createClient } from "@supabase/supabase-js";

/*
SUPABASE SETUP SQL (Run this in your Supabase SQL Editor):

CREATE TABLE debates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic text NOT NULL,
  rounds integer NOT NULL,
  transcript jsonb NOT NULL,
  scores jsonb NOT NULL,
  winner text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS and setup a safe anon insert policy if desired
-- ALTER TABLE debates ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow anon insert" ON debates FOR INSERT TO anon WITH CHECK (true);
-- CREATE POLICY "Allow anon select" ON debates FOR SELECT TO anon USING (true);
*/

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
