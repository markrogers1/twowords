import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  country: string;
  word_one: string;
  word_two: string;
  avatar_url?: string;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  from_user_id: string;
  to_user_id: string;
  encrypted_content: string;
  encryption_key_id?: string;
  created_at: string;
  read_at?: string;
}

export interface Connection {
  id: string;
  user_one_id: string;
  user_two_id: string;
  created_at: string;
}

export interface ConnectionRequest {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
}
