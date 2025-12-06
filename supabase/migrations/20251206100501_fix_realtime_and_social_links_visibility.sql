/*
  # Fix Real-time Messages and Social Links Visibility

  ## Overview
  Fixes two critical issues:
  1. Enable real-time updates for messages table so chat updates instantly
  2. Add back RLS policy to allow users to view social links shared with them

  ## Changes

  ### 1. Enable Real-time for Messages
  - Enable realtime replication on messages table
  - This allows instant message delivery without page refresh

  ### 2. Social Links Visibility Policy
  - Add policy allowing users to view social links that have been marked as visible to them
  - Checks the social_link_visibility table to determine access
  - User must have an accepted connection with the link owner
  - The visibility setting must be set to true

  ## Security
  - Real-time only works with existing RLS policies (users can only see their own messages)
  - Social links are only visible if explicitly shared through social_link_visibility
  - All queries verify active connections between users
*/

-- Enable realtime on messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Add policy to allow users to view social links shared with them
CREATE POLICY "Users can view social links shared with them"
  ON social_links FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM connections c
      INNER JOIN social_link_visibility slv ON slv.connection_id = c.id
      WHERE slv.social_link_id = social_links.id
      AND slv.is_visible = true
      AND c.status = 'accepted'
      AND (
        (c.user_one_id = auth.uid() AND c.user_two_id = social_links.user_id)
        OR 
        (c.user_two_id = auth.uid() AND c.user_one_id = social_links.user_id)
      )
    )
  );
