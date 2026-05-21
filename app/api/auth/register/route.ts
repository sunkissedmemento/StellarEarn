import { createServerSupabaseClient, isValidStellarPublicKey } from '@/lib/supabase';
import { z } from 'zod';

const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(30, 'Username must be at most 30 characters').regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  stellar_public_key: z.string().refine(isValidStellarPublicKey, 'Invalid Stellar public key format'),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        {
          error: 'Validation failed',
          details: parsed.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    const { email, username, stellar_public_key } = parsed.data;
    const supabase = createServerSupabaseClient();

    // 1. Create user record
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        email,
        username,
        stellar_public_key,
      })
      .select()
      .single();

    if (userError) {
      if (userError.code === '23505') {
        // Unique constraint violation
        return Response.json(
          { error: 'Email or username already exists' },
          { status: 409 }
        );
      }
      throw userError;
    }

    // 2. Create stellar_accounts record
    const { data: account, error: accountError } = await supabase
      .from('stellar_accounts')
      .insert({
        user_id: user.id,
        public_key: stellar_public_key,
        network: process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'mainnet' ? 'mainnet' : 'testnet',
        num_signers: 1, // Default to 1 signer
      })
      .select()
      .single();

    if (accountError) throw accountError;

    // 3. Log account creation activity
    await supabase
      .from('account_activity')
      .insert({
        stellar_account_id: account.id,
        activity_type: 'account_created',
        description: `Account created for user ${username}`,
        data: {
          email,
          username,
        },
      });

    return Response.json(
      {
        user_id: user.id,
        email: user.email,
        username: user.username,
        stellar_public_key: user.stellar_public_key,
        account_id: account.id,
        next_step: 'fund_account',
        message: 'Registration successful. Please fund your account to begin.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return Response.json(
      {
        error: 'Registration failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
