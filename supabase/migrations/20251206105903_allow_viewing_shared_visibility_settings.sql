/*
  # Allow Viewing Shared Visibility Settings

  ## Problem
  Users can't see social links that contacts have shared with them because:
  - Current policy only allows viewing their OWN visibility settings (where user_id = auth.uid())
  - When Contact A shares a link with Contact B, the visibility setting has user_id = A
  - Contact B can't see this setting, so they can't see the shared link

  ## Solution
  Add a new SELECT policy on social_link_visibility that allows users to view visibility settings
  for connections they're part of. This enables them to see what links have been shared with them.

  ## Changes Made
  
  ### New Policy
  - "Users can view visibility settings for their connections"
  - Allows SELECT when the connection_id is a connection the user is part of
  - No circular dependency - only references connections table
  
  ## Security
  - Users can only see visibility settings for their own accepted connections
  - No access to visibility settings of unrelated users
  - The connection must be in 'accepted' status
*/

CREATE POLICY "Users can view visibility settings for their connections"
  ON social_link_visibility FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM connections
      WHERE connections.id = social_link_visibility.connection_id
      AND connections.status = 'accepted'
      AND (connections.user_one_id = auth.uid() OR connections.user_two_id = auth.uid())
    )
  );
