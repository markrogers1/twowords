/*
  # Fix Infinite Recursion in Social Links RLS Policies

  ## Problem
  Circular dependency between social_links and social_link_visibility RLS policies:
  - social_links policy checks social_link_visibility table
  - social_link_visibility policies check social_links table
  - This creates infinite recursion

  ## Solution
  1. Add user_id column to social_link_visibility table (denormalized)
  2. Populate existing records with user_id from social_links
  3. Drop all existing policies on social_link_visibility
  4. Create new simplified policies that don't reference social_links
  5. Keep social_links policies as they are (they work once social_link_visibility is fixed)

  ## Changes Made
  
  ### 1. Schema Change
  - Add user_id column to social_link_visibility table
  - Populate it from existing social_links data
  - Make it NOT NULL for data integrity
  
  ### 2. RLS Policies for social_link_visibility
  - New policies use direct user_id check instead of joining to social_links
  - This breaks the circular dependency
  
  ## Security
  - All policies still enforce proper ownership checks
  - No data is exposed that wasn't already accessible
  - Circular dependency is eliminated
*/

-- Add user_id column to social_link_visibility table
ALTER TABLE social_link_visibility 
ADD COLUMN IF NOT EXISTS user_id uuid;

-- Populate user_id from social_links for existing records
UPDATE social_link_visibility
SET user_id = social_links.user_id
FROM social_links
WHERE social_link_visibility.social_link_id = social_links.id
AND social_link_visibility.user_id IS NULL;

-- Make user_id NOT NULL after populating existing data
ALTER TABLE social_link_visibility 
ALTER COLUMN user_id SET NOT NULL;

-- Drop all existing policies on social_link_visibility
DROP POLICY IF EXISTS "Users can view visibility settings for their own links" ON social_link_visibility;
DROP POLICY IF EXISTS "Users can insert visibility settings for their own links" ON social_link_visibility;
DROP POLICY IF EXISTS "Users can update visibility settings for their own links" ON social_link_visibility;
DROP POLICY IF EXISTS "Users can delete visibility settings for their own links" ON social_link_visibility;

-- Create new simplified policies that don't reference social_links table

CREATE POLICY "Users can view own visibility settings"
  ON social_link_visibility FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own visibility settings"
  ON social_link_visibility FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own visibility settings"
  ON social_link_visibility FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own visibility settings"
  ON social_link_visibility FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
