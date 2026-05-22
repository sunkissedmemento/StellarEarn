/* eslint-disable */
// @ts-nocheck
// Usage Examples for StellarEarn Supabase Client

import { supabase, createServerSupabaseClient } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

// ============================================================================
// BROWSER CLIENT (Client-side, anon key)
// ============================================================================

// 1. Get current user's data
async function getUserProfile() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', 'user-id')
    .single();

  if (error) console.error(error);
  return data;
}

// 2. Get user's Stellar account
async function getUserStellarAccount() {
  const { data, error } = await supabase
    .from('stellar_accounts')
    .select('*')
    .single();

  if (error) console.error(error);
  return data;
}

// 3. Update user profile
async function updateProfile(updates: Partial<Database['public']['Tables']['users']['Update']>) {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', 'user-id')
    .select()
    .single();

  if (error) console.error(error);
  return data;
}

// 4. Get account balance
async function getBalance() {
  const { data, error } = await supabase
    .from('stellar_accounts')
    .select('balance_native, num_trustlines')
    .single();

  if (error) console.error(error);

  // Calculate minimum required
  const minimum = 1.0 + (data?.num_trustlines || 0) * 0.5;
  return {
    balance: data?.balance_native || 0,
    minimum,
    available: (data?.balance_native || 0) - minimum,
  };
}

// 5. Get trustlines
async function getTrustlines() {
  const { data, error } = await supabase
    .from('stellar_accounts')
    .select('id')
    .single();

  if (!data) return [];

  const { data: trustlines, error: tlError } = await supabase
    .from('trustlines')
    .select('*')
    .eq('stellar_account_id', data.id);

  if (tlError) console.error(tlError);
  return trustlines || [];
}

// 6. Get transaction history
async function getTransactionHistory(limit = 50) {
  const { data: account } = await supabase
    .from('stellar_accounts')
    .select('id')
    .single();

  if (!account) return [];

  const { data, error } = await supabase
    .from('transactions_signed')
    .select('*')
    .eq('stellar_account_id', account.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) console.error(error);
  return data || [];
}

// 7. Get activity feed
async function getActivityFeed(limit = 50) {
  const { data: account } = await supabase
    .from('stellar_accounts')
    .select('id')
    .single();

  if (!account) return [];

  const { data, error } = await supabase
    .from('account_activity')
    .select('*')
    .eq('stellar_account_id', account.id)
    .order('recorded_at', { ascending: false })
    .limit(limit);

  if (error) console.error(error);
  return data || [];
}

// 8. Real-time subscription to balance changes
function subscribeToBalanceUpdates(callback: (balance: number) => void) {
  const subscription = supabase
    .channel('stellar_accounts')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'stellar_accounts',
      },
      (payload) => {
        callback(payload.new.balance_native);
      }
    )
    .subscribe();

  return subscription;
}

// 9. Real-time activity feed updates
function subscribeToActivityUpdates(callback: (activity: any) => void) {
  const subscription = supabase
    .channel('account_activity')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'account_activity',
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe();

  return subscription;
}

// ============================================================================
// SERVER-SIDE CLIENT (Route handlers, service role)
// ============================================================================

// These functions should be called in app/api/ routes only

// 1. Create a new user (server-side)
async function createUser(
  email: string,
  username: string,
  stellar_public_key: string
) {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('users')
    .insert({
      email,
      username,
      stellar_public_key,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 2. Update account balance (server-side)
async function updateAccountBalance(
  account_id: string,
  balance: number
) {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('stellar_accounts')
    .update({
      balance_native: balance,
      balance_last_updated: new Date().toISOString(),
    })
    .eq('id', account_id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 3. Log a transaction (server-side)
async function logTransaction(
  account_id: string,
  txn_xdr: string,
  operation_type: string,
  status: 'submitted' | 'confirmed' | 'failed'
) {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('transactions_signed')
    .insert({
      stellar_account_id: account_id,
      txn_xdr,
      operation_type,
      status,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 4. Log activity (server-side)
async function logActivity(
  account_id: string,
  activity_type: Database['public']['Enums']['activity_type'],
  description: string,
  data?: Record<string, any>
) {
  const supabase = createServerSupabaseClient();

  const { error } = await supabase
    .from('account_activity')
    .insert({
      stellar_account_id: account_id,
      activity_type,
      description,
      data,
    });

  if (error) throw error;
}

// 5. Get all accounts with low balance (server-side)
async function getAccountsWithLowBalance(threshold = 2.0) {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('stellar_accounts')
    .select('id, user_id, public_key, balance_native')
    .lt('balance_native', threshold);

  if (error) throw error;
  return data || [];
}

// 6. Batch update account balances (server-side)
async function updateMultipleBalances(
  updates: Array<{ account_id: string; balance: number }>
) {
  const supabase = createServerSupabaseClient();

  const updatePromises = updates.map(({ account_id, balance }) =>
    supabase
      .from('stellar_accounts')
      .update({
        balance_native: balance,
        balance_last_updated: new Date().toISOString(),
      })
      .eq('id', account_id)
  );

  const results = await Promise.all(updatePromises);
  return results;
}

// 7. Query with RLS bypass (service role only)
async function getPublicAccount(public_key: string) {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('stellar_accounts')
    .select('public_key, balance_native, num_trustlines, network')
    .eq('public_key', public_key)
    .single();

  if (error) throw error;
  return data;
}

// 8. Check if account is healthy
async function isAccountHealthy(account_id: string): Promise<boolean> {
  const supabase = createServerSupabaseClient();

  const { data } = await supabase
    .rpc('check_minimum_balance', { account_id });

  return data === true;
}

// 9. Get user by public key (server-side)
async function getUserByPublicKey(public_key: string) {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('users')
    .select('*, stellar_accounts(*)')
    .eq('stellar_public_key', public_key)
    .single();

  if (error) throw error;
  return data;
}

// 10. Create funding log entry (server-side)
async function logFunding(
  user_id: string,
  account_id: string,
  amount: number,
  funding_method: 'friendbot' | 'createAccount' | 'exchange' | 'sponsor'
) {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('account_funding_log')
    .insert({
      user_id,
      stellar_account_id: account_id,
      funding_method,
      amount_xlm: amount,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// REACT HOOKS (Optional - for easier component integration)
// ============================================================================

import { useEffect, useState } from 'react';

// Hook to fetch and watch user's balance
export function useBalance() {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let subscription: any;

    async function fetchBalance() {
      try {
        const data = await getBalance();
        setBalance(data.available);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    }

    fetchBalance();

    // Subscribe to real-time updates
    subscription = subscribeToBalanceUpdates((newBalance: number) => {
      setBalance(newBalance);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  return { balance, loading, error };
}

// Hook to fetch activity feed
export function useActivityFeed() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let subscription: any;

    async function fetchActivities() {
      try {
        const data = await getActivityFeed();
        setActivities(data);
      } finally {
        setLoading(false);
      }
    }

    fetchActivities();

    // Subscribe to new activities
    subscription = subscribeToActivityUpdates((newActivity: any) => {
      setActivities((prev) => [newActivity, ...prev]);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  return { activities, loading };
}

// ============================================================================
// ERROR HANDLING PATTERNS
// ============================================================================

async function handleQueryWithErrorBoundary() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .single();

    if (error) {
      // Handle different error types
      if (error.code === 'PGRST116') {
        // Not found
        console.error('User not found');
      } else if (error.code === '42P01') {
        // Table doesn't exist
        console.error('Database not initialized');
      } else {
        // Generic error
        console.error('Query failed:', error.message);
      }
      throw error;
    }

    return data;
  } catch (error) {
    // Re-throw for component error boundary
    throw error;
  }
}

export {
  // Browser Client Exports
  getUserProfile,
  getUserStellarAccount,
  updateProfile,
  getBalance,
  getTrustlines,
  getTransactionHistory,
  getActivityFeed,
  subscribeToBalanceUpdates,
  subscribeToActivityUpdates,
  // Server-side Exports
  createUser,
  updateAccountBalance,
  logTransaction,
  logActivity,
  getAccountsWithLowBalance,
  updateMultipleBalances,
  getPublicAccount,
  isAccountHealthy,
  getUserByPublicKey,
  logFunding,
};
