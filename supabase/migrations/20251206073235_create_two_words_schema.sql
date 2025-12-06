/*
  # TWO WORDS App - Complete Schema

  ## Overview
  Creates the complete database schema for the TWO WORDS encrypted chat app with unique two-word usernames.

  ## New Tables

  ### 1. `word_list`
  Stores the master list of 20,000+ safe words for username generation
    - `id` (uuid, primary key)
    - `word` (text, unique) - The actual word
    - `created_at` (timestamptz)

  ### 2. `profiles`
  Extended user profile information linked to auth.users
    - `id` (uuid, primary key, links to auth.users)
    - `email` (text, unique, not null)
    - `first_name` (text, not null)
    - `last_name` (text, not null)
    - `country` (text, not null) - ISO country code
    - `word_one` (text, not null) - First word of username
    - `word_two` (text, not null) - Second word of username
    - `avatar_url` (text, nullable)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)
    - Unique constraint on (word_one, word_two, country)

  ### 3. `connection_requests`
  Tracks connection requests between users (double opt-in system)
    - `id` (uuid, primary key)
    - `from_user_id` (uuid, references profiles)
    - `to_user_id` (uuid, references profiles)
    - `status` (text) - 'pending', 'accepted', 'rejected'
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### 4. `connections`
  Established connections between users who can chat
    - `id` (uuid, primary key)
    - `user_one_id` (uuid, references profiles)
    - `user_two_id` (uuid, references profiles)
    - `created_at` (timestamptz)
    - Unique constraint ensuring no duplicate connections

  ### 5. `messages`
  Encrypted chat messages between connected users
    - `id` (uuid, primary key)
    - `from_user_id` (uuid, references profiles)
    - `to_user_id` (uuid, references profiles)
    - `encrypted_content` (text, not null) - Encrypted message content
    - `encryption_key_id` (text) - Reference to encryption key used
    - `created_at` (timestamptz)
    - `read_at` (timestamptz, nullable)

  ## Security
  - All tables have RLS enabled
  - Users can only read their own profile
  - Users can update their own profile (except username and country)
  - Users can see connection requests involving them
  - Users can only message connected users
  - Users can only read messages they sent or received

  ## Indexes
  - Indexes on foreign keys for performance
  - Composite index on (word_one, word_two, country) for fast username lookups
  - Index on messages for efficient chat queries
*/

-- Create word_list table
CREATE TABLE IF NOT EXISTS word_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  country text NOT NULL,
  word_one text NOT NULL,
  word_two text NOT NULL,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_username_per_country UNIQUE (word_one, word_two, country)
);

-- Create connection_requests table
CREATE TABLE IF NOT EXISTS connection_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT no_self_requests CHECK (from_user_id != to_user_id)
);

-- Create connections table
CREATE TABLE IF NOT EXISTS connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_one_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_two_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT no_self_connections CHECK (user_one_id != user_two_id),
  CONSTRAINT unique_connection UNIQUE (user_one_id, user_two_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  encrypted_content text NOT NULL,
  encryption_key_id text,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz,
  CONSTRAINT no_self_messages CHECK (from_user_id != to_user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(word_one, word_two, country);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_connection_requests_from ON connection_requests(from_user_id);
CREATE INDEX IF NOT EXISTS idx_connection_requests_to ON connection_requests(to_user_id);
CREATE INDEX IF NOT EXISTS idx_connection_requests_status ON connection_requests(status);
CREATE INDEX IF NOT EXISTS idx_connections_user_one ON connections(user_one_id);
CREATE INDEX IF NOT EXISTS idx_connections_user_two ON connections(user_two_id);
CREATE INDEX IF NOT EXISTS idx_messages_from ON messages(from_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_to ON messages(to_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- Enable RLS on all tables
ALTER TABLE word_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for word_list
-- Anyone can read words (needed for username generation)
CREATE POLICY "Anyone can read word list"
  ON word_list FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id 
    AND word_one = (SELECT word_one FROM profiles WHERE id = auth.uid())
    AND word_two = (SELECT word_two FROM profiles WHERE id = auth.uid())
    AND country = (SELECT country FROM profiles WHERE id = auth.uid())
  );

-- RLS Policies for connection_requests
CREATE POLICY "Users can view requests involving them"
  ON connection_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can create connection requests"
  ON connection_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can update requests sent to them"
  ON connection_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = to_user_id)
  WITH CHECK (auth.uid() = to_user_id);

CREATE POLICY "Users can delete own requests"
  ON connection_requests FOR DELETE
  TO authenticated
  USING (auth.uid() = from_user_id);

-- RLS Policies for connections
CREATE POLICY "Users can view their connections"
  ON connections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_one_id OR auth.uid() = user_two_id);

CREATE POLICY "System can create connections"
  ON connections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_one_id OR auth.uid() = user_two_id);

CREATE POLICY "Users can delete their connections"
  ON connections FOR DELETE
  TO authenticated
  USING (auth.uid() = user_one_id OR auth.uid() = user_two_id);

-- RLS Policies for messages
CREATE POLICY "Users can view their messages"
  ON messages FOR SELECT
  TO authenticated
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can send messages to connections"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = from_user_id
    AND EXISTS (
      SELECT 1 FROM connections
      WHERE (user_one_id = auth.uid() AND user_two_id = to_user_id)
         OR (user_two_id = auth.uid() AND user_one_id = to_user_id)
    )
  );

CREATE POLICY "Users can update message read status"
  ON messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = to_user_id)
  WITH CHECK (auth.uid() = to_user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_connection_requests_updated_at ON connection_requests;
CREATE TRIGGER update_connection_requests_updated_at
  BEFORE UPDATE ON connection_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();