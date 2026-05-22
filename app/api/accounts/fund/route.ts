import { createServerSupabaseClient, isValidStellarPublicKey } from '@/lib/supabase';
import { z } from 'zod';

const FundSchema = z.object({
  public_key: z.string().refine(isValidStellarPublicKey, 'Invalid Stellar public key format'),
  network: z.enum(['testnet', 'mainnet']).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = FundSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        {
          error: 'Validation failed',
          details: parsed.error.issues.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    const { public_key, network = 'testnet' } = parsed.data;
    const supabase = createServerSupabaseClient();

    // Verify network matches env
    const envNetwork = process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';
    if (network !== envNetwork) {
      return Response.json(
        { error: `Network mismatch. This instance is configured for ${envNetwork}` },
        { status: 400 }
      );
    }

    // Find the stellar account
    const { data: stellarAccount, error: accountError } = await supabase
      .from('stellar_accounts')
      .select('*')
      .eq('public_key', public_key)
      .single();

    if (accountError || !stellarAccount) {
      return Response.json(
        { error: 'Stellar account not found. Please register first.' },
        { status: 404 }
      );
    }

    // Check if already funded
    if (stellarAccount.account_created_on_network) {
      return Response.json(
        { error: 'Account already funded' },
        { status: 409 }
      );
    }

    // 1. Log the funding request
    const { data: fundingLog, error: logError } = await supabase
      .from('account_funding_log')
      .insert({
        user_id: stellarAccount.user_id,
        stellar_account_id: stellarAccount.id,
        funding_method: network === 'testnet' ? 'friendbot' : 'createAccount',
        amount_xlm: network === 'testnet' ? 10000 : 2.5,
        status: 'pending',
      })
      .select()
      .single();

    if (logError) throw logError;

    // 2. Fund the account (testnet: Friendbot, mainnet: createAccount)
    let txn_hash: string | null = null;
    let fundingError: string | null = null;

    if (network === 'testnet') {
      try {
        const response = await fetch(
          `https://friendbot.stellar.org?addr=${encodeURIComponent(public_key)}`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || 'Friendbot funding failed');
        }

        txn_hash = data.hash;

        // Update funding log with success
        await supabase
          .from('account_funding_log')
          .update({
            status: 'completed',
            funding_txn_hash: txn_hash,
            completed_at: new Date().toISOString(),
          })
          .eq('id', fundingLog.id);

        // Update stellar account
        await supabase
          .from('stellar_accounts')
          .update({
            account_created_on_network: new Date().toISOString(),
            balance_native: 10000,
            balance_last_updated: new Date().toISOString(),
          })
          .eq('id', stellarAccount.id);

        // Update user status
        await supabase
          .from('users')
          .update({
            account_status: 'active',
            account_created_at: new Date().toISOString(),
          })
          .eq('id', stellarAccount.user_id);

        // Log activity
        await supabase
          .from('account_activity')
          .insert({
            stellar_account_id: stellarAccount.id,
            activity_type: 'account_created',
            description: `Account funded via Friendbot on testnet`,
            data: {
              txn_hash,
              amount: 10000,
              method: 'friendbot',
            },
            txn_hash,
          });
      } catch (error) {
        fundingError = error instanceof Error ? error.message : 'Unknown error';

        // Update funding log with failure
        await supabase
          .from('account_funding_log')
          .update({
            status: 'failed',
            error_message: fundingError,
          })
          .eq('id', fundingLog.id);

        return Response.json(
          {
            error: 'Funding failed',
            details: fundingError,
            funding_log_id: fundingLog.id,
          },
          { status: 500 }
        );
      }
    } else {
      // Mainnet: createAccount operation (requires master account secret)
      return Response.json(
        {
          error: 'Mainnet funding not yet implemented. Use testnet for development.',
          status: 'pending',
          message: 'Contact support for mainnet funding',
        },
        { status: 501 }
      );
    }

    return Response.json(
      {
        account_id: stellarAccount.id,
        funding_log_id: fundingLog.id,
        status: 'completed',
        txn_hash,
        balance: 10000,
        message: 'Account successfully funded!',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Funding error:', error);
    return Response.json(
      {
        error: 'Funding failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
