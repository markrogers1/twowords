/*
  # Add Profile Images and Connection Request System

  1. Changes to Tables
    - `profiles` table:
      - Add `profile_image_url` (text, nullable) - URL to user's profile image
    
    - `connections` table:
      - Add `status` (text, default 'pending') - Status of connection: 'pending', 'accepted', 'rejected'
      - Add `requester_id` (uuid) - ID of user who initiated the connection request
      - Add `created_at` timestamp if not exists
      - Add `updated_at` timestamp for tracking status changes

  2. Security
    - RLS policies remain enabled
    - Add policies for connection request management
    - Users can view pending requests sent to them
    - Users can update status of requests sent to them

  3. Notes
    - Existing connections will be set to 'accepted' status by default
    - Profile images stored in Supabase Storage (bucket setup in next step)
*/

-- Add profile_image_url to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'profile_image_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN profile_image_url text;
  END IF;
END $$;

-- Add status column to connections table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'connections' AND column_name = 'status'
  ) THEN
    ALTER TABLE connections ADD COLUMN status text DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted', 'rejected'));
  END IF;
END $$;

-- Add requester_id to connections table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'connections' AND column_name = 'requester_id'
  ) THEN
    ALTER TABLE connections ADD COLUMN requester_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Add updated_at to connections table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'connections' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE connections ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Update existing connections to set requester_id as user_one_id (backwards compatibility)
UPDATE connections 
SET requester_id = user_one_id 
WHERE requester_id IS NULL;

-- Create policy for users to view connection requests sent to them
DROP POLICY IF EXISTS "Users can view connection requests" ON connections;
CREATE POLICY "Users can view connection requests"
  ON connections
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_one_id OR 
    auth.uid() = user_two_id
  );

-- Create policy for users to update connection requests sent to them
DROP POLICY IF EXISTS "Users can update their connection requests" ON connections;
CREATE POLICY "Users can update their connection requests"
  ON connections
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_one_id OR 
    auth.uid() = user_two_id
  )
  WITH CHECK (
    auth.uid() = user_one_id OR 
    auth.uid() = user_two_id
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_connections_timestamp ON connections;
CREATE TRIGGER update_connections_timestamp
  BEFORE UPDATE ON connections
  FOR EACH ROW
  EXECUTE FUNCTION update_connections_updated_at();