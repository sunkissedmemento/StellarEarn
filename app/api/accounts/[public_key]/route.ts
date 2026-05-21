import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(
  req: Request,
  { params }: { params: { public_key: string } }
) {
  try {
    const publicKey = params.public_key;

    // Validate public key format
    if (!/^G[A-Z2-7]{56}$/.test(publicKey)) {
      return Response.json(
        { error: 'Invalid public key format' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Get account (public view - limited data)
    const { data: account, error } = await supabase
      .from('stellar_accounts')
      .select('public_key, balance_native, num_trustlines, network, created_at')
      .eq('public_key', publicKey)
      .single();

    if (error || !account) {
      return Response.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    return Response.json(
      {
        public_key: account.public_key,
        balance: parseFloat(account.balance_native.toString()),
        num_trustlines: account.num_trustlines,
        network: account.network,
        account_exists: true,
        created_at: account.created_at,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get account error:', error);
    return Response.json(
      {
        error: 'Failed to fetch account',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
