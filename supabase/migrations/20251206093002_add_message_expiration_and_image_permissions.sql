/*
  # Add Message Expiration and Image Permissions

  1. Changes to Messages Table
    - Add `expires_at` field (timestamptz) - automatically set to 24 hours after creation
    - Add `message_type` field to distinguish between text and image messages
    - Add index on expires_at for efficient cleanup queries

  2. Changes to Connections Table
    - Add `user_one_allows_images` boolean field - whether user_one allows images from user_two
    - Add `user_two_allows_images` boolean field - whether user_two allows images from user_one
    - Default both to false for privacy (users must explicitly grant permission)

  3. Purpose
    - Messages auto-expire after 24 hours for privacy and storage management
    - Image permissions prevent unwanted/unsafe images from being sent or displayed
    - Users must explicitly authorize each contact to send images

  4. Security
    - No RLS policy changes needed - existing policies still apply
    - Image permissions are enforced in application code
*/

-- Add fields to messages table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE messages 
    ADD COLUMN expires_at timestamptz DEFAULT (now() + interval '24 hours');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'message_type'
  ) THEN
    ALTER TABLE messages 
    ADD COLUMN message_type text DEFAULT 'text'
    CHECK (message_type IN ('text', 'image'));
  END IF;
END $$;

-- Add index for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_messages_expires_at ON messages(expires_at) WHERE expires_at IS NOT NULL;

-- Add image permission fields to connections table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'connections' AND column_name = 'user_one_allows_images'
  ) THEN
    ALTER TABLE connections 
    ADD COLUMN user_one_allows_images boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'connections' AND column_name = 'user_two_allows_images'
  ) THEN
    ALTER TABLE connections 
    ADD COLUMN user_two_allows_images boolean DEFAULT false;
  END IF;
END $$;