import { createClient } from '@supabase/supabase-js';
import { StrKey } from '@stellar/stellar-sdk';
import type { Database } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)');
}

// Client-side (browser) - Use anon key
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'stellar-earn-auth',
  },
});

// Server-side - Use service role key (for admin operations only)
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceRoleKey || '', {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Helper: Create a server-side client for Route Handlers
export function createServerSupabaseClient() {
  if (!supabaseServiceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable (server-side operations only)');
  }
  const serviceRoleKey = supabaseServiceRoleKey;
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Validate Stellar public key format
export function isValidStellarPublicKey(publicKey: string): boolean {
  return StrKey.isValidEd25519PublicKey(publicKey);
}
