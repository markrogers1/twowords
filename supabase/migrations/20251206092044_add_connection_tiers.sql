/*
  # Add Connection Tier System

  1. Changes
    - Add `tier` field to connections table with four levels:
      - `random`: Someone you just met
      - `acquaintance`: Someone you know a bit
      - `friend`: Regular friend (default)
      - `close_friend`: Close friend
    - Add `tier` field to connection_requests table so tier is set when accepting
    - This allows users to control what information is shared with different relationship levels

  2. Security
    - No RLS changes needed - existing policies still apply
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'connections' AND column_name = 'tier'
  ) THEN
    ALTER TABLE connections 
    ADD COLUMN tier text DEFAULT 'friend' 
    CHECK (tier IN ('random', 'acquaintance', 'friend', 'close_friend'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'connection_requests' AND column_name = 'tier'
  ) THEN
    ALTER TABLE connection_requests 
    ADD COLUMN tier text DEFAULT 'friend'
    CHECK (tier IN ('random', 'acquaintance', 'friend', 'close_friend'));
  END IF;
END $$;