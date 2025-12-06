/*
  # Add Connection Types and Social Links

  1. Changes to existing tables
    - Add `connection_type` to `connections` table (enum: 'friend' or 'business')
    - Add `connection_type` to `connection_requests` table
  
  2. New Tables
    - `social_links`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `platform` (text) - e.g., 'instagram', 'snapchat', 'linkedin', 'facebook', 'twitter', 'tiktok', 'whatsapp'
      - `url` (text) - the link to the profile
      - `category` (text) - 'personal' or 'business'
      - `created_at` (timestamptz)
    
    - `social_link_visibility`
      - `id` (uuid, primary key)
      - `social_link_id` (uuid, references social_links)
      - `connection_id` (uuid, references connections)
      - `is_visible` (boolean) - default false
      - `created_at` (timestamptz)
      - Unique constraint on (social_link_id, connection_id)
  
  3. Security
    - Enable RLS on all new tables
    - Users can manage their own social links
    - Users can view social links they have permission to see
    - Users can manage visibility settings for their own links
*/

-- Add connection_type to connections table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'connections' AND column_name = 'connection_type'
  ) THEN
    ALTER TABLE connections ADD COLUMN connection_type text NOT NULL DEFAULT 'friend';
  END IF;
END $$;

-- Add connection_type to connection_requests table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'connection_requests' AND column_name = 'connection_type'
  ) THEN
    ALTER TABLE connection_requests ADD COLUMN connection_type text NOT NULL DEFAULT 'friend';
  END IF;
END $$;

-- Create social_links table
CREATE TABLE IF NOT EXISTS social_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform text NOT NULL,
  url text NOT NULL,
  category text NOT NULL DEFAULT 'personal',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE social_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own social links"
  ON social_links FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own social links"
  ON social_links FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own social links"
  ON social_links FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own social links"
  ON social_links FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create social_link_visibility table
CREATE TABLE IF NOT EXISTS social_link_visibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  social_link_id uuid NOT NULL REFERENCES social_links(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  is_visible boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(social_link_id, connection_id)
);

ALTER TABLE social_link_visibility ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view visibility settings for their own links"
  ON social_link_visibility FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM social_links
      WHERE social_links.id = social_link_id
      AND social_links.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert visibility settings for their own links"
  ON social_link_visibility FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM social_links
      WHERE social_links.id = social_link_id
      AND social_links.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update visibility settings for their own links"
  ON social_link_visibility FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM social_links
      WHERE social_links.id = social_link_id
      AND social_links.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM social_links
      WHERE social_links.id = social_link_id
      AND social_links.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete visibility settings for their own links"
  ON social_link_visibility FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM social_links
      WHERE social_links.id = social_link_id
      AND social_links.user_id = auth.uid()
    )
  );

-- Allow users to view social links that are visible to them
CREATE POLICY "Users can view visible social links from connections"
  ON social_links FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM connections c
      INNER JOIN social_link_visibility slv ON slv.connection_id = c.id
      WHERE slv.social_link_id = social_links.id
      AND slv.is_visible = true
      AND (c.user_one_id = auth.uid() OR c.user_two_id = auth.uid())
    )
  );
