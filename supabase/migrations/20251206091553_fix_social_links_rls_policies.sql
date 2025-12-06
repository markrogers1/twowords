/*
  # Fix Social Links RLS Policies

  1. Changes
    - Drop the complex policy that references social_link_visibility (causing 500 errors)
    - This policy is not needed for users to view their own social links
    - The simple "Users can view own social links" policy is sufficient

  2. Security
    - Users can still view their own social links via the existing policy
    - The dropped policy was for viewing connections' visible links (different use case)
*/

DROP POLICY IF EXISTS "Users can view visible social links from connections" ON social_links;