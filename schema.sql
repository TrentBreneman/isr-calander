-- SQL for creating the events table in Supabase
-- Run this in the Supabase SQL Editor

CREATE TABLE events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  created_at TIMESTAMPTZ DEFAULT now(),
  title TEXT NOT NULL,
  start_date TEXT NOT NULL, -- YYYY-MM-DD
  end_date TEXT,           -- YYYY-MM-DD
  time TEXT,               -- HH:mm
  color TEXT,
  user_id UUID REFERENCES auth.users(id) -- Optional: link to creator
);

-- Enable Row Level Security (RLS)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read all events
CREATE POLICY "Anyone can view events" ON events
  FOR SELECT USING (true);

-- Allow authenticated users to insert events
CREATE POLICY "Authenticated users can create events" ON events
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow users to delete their own events (or all for now if shared)
CREATE POLICY "Users can delete events" ON events
  FOR DELETE USING (auth.role() = 'authenticated');
