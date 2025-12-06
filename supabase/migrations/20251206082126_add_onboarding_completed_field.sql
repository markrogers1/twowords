/*
  # Add Onboarding Tracking

  1. Changes
    - Add `onboarding_completed` column to `profiles` table
      - Type: boolean
      - Default: false
      - Tracks whether user has completed the initial onboarding tour

  2. Notes
    - New users will see the onboarding tour on first login
    - Tour explains how to add app to home screen and enable notifications
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'onboarding_completed'
  ) THEN
    ALTER TABLE profiles ADD COLUMN onboarding_completed boolean DEFAULT false NOT NULL;
  END IF;
END $$;
