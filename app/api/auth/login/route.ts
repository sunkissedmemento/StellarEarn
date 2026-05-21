import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase';

const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        {
          error: 'Validation failed',
          details: parsed.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const email = parsed.data.email.trim().toLowerCase();

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, username, account_status, stellar_public_key')
      .eq('email', email)
      .maybeSingle();

    if (userError) throw userError;

    if (!user) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    return Response.json(
      {
        user_id: user.id,
        email: user.email,
        username: user.username,
        stellar_public_key: user.stellar_public_key,
        account_status: user.account_status,
        message: 'Login successful',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return Response.json({ error: 'Login failed' }, { status: 500 });
  }
}
