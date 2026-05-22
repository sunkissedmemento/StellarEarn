import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase';
import { initialsFromOrg, listGigs, mapGigToBounty, toSlug } from '@/lib/gigs';

const CreateGigSchema = z.object({
  created_by_user_id: z.string().uuid('created_by_user_id must be a valid UUID'),
  title: z.string().min(5, 'Title must be at least 5 characters').max(120, 'Title must be at most 120 characters'),
  org: z.string().min(2, 'Organization name is required').max(80, 'Organization name is too long'),
  prize: z.number().int().positive('Prize must be a positive number').optional(),
  reward_amount: z.number().positive('Reward amount must be positive').optional(),
  reward_unit: z.enum(['XLM', 'PHP', 'USDC']).default('XLM'),
  type: z.enum(['bounty', 'project']),
  skill: z.enum(['content', 'design', 'dev', 'research']),
  deadline: z.string().date('Deadline must be a valid date in YYYY-MM-DD format'),
  description: z.string().min(20, 'Description must be at least 20 characters').max(2000, 'Description is too long'),
  deliverables: z.array(z.string().min(3, 'Deliverables must be meaningful')).min(1, 'At least one deliverable is required').max(8, 'Keep deliverables to 8 or fewer'),
  sponsor_name: z.string().max(60).optional(),
  sponsor_wallet: z.string().regex(/^G[A-Z2-7]{55}$/, 'Invalid Stellar public key').optional(),
  soroban_bounty_id: z.number().int().nonnegative().optional(),
  creation_tx_hash: z.string().min(16).max(64).optional(),
  creation_tx_xdr: z.string().min(24).optional(),
}).superRefine((value, ctx) => {
  if (value.reward_amount === undefined && value.prize === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['reward_amount'],
      message: 'Reward amount is required',
    });
  }
});

export async function GET() {
  try {
    const gigs = await listGigs(50);
    return Response.json({ gigs }, { status: 200 });
  } catch (error) {
    console.error('Get gigs failed:', error);
    return Response.json({ error: 'Failed to fetch gigs' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = CreateGigSchema.safeParse(body);

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

    const input = parsed.data;
    const supabase = createServerSupabaseClient();
    const baseSlug = toSlug(input.title);
    const slug = `${baseSlug}-${Date.now().toString().slice(-6)}`;
    const rewardAmount = Number(input.reward_amount ?? input.prize);

    const { data, error } = await supabase
      .from('gigs')
      .insert({
        slug,
        created_by_user_id: input.created_by_user_id,
        title: input.title,
        org: input.org,
        initials: initialsFromOrg(input.org),
        prize_php: Math.round(rewardAmount),
        reward_amount: rewardAmount,
        reward_unit: input.reward_unit,
        type: input.type,
        skill: input.skill,
        status: 'open',
        deadline_at: input.deadline,
        description: input.description,
        deliverables: input.deliverables,
        sponsor_name: input.sponsor_name ?? null,
        sponsor_wallet: input.sponsor_wallet ?? null,
        soroban_bounty_id: input.soroban_bounty_id ?? null,
        creation_tx_hash: input.creation_tx_hash ?? null,
        creation_tx_xdr: input.creation_tx_xdr ?? null,
      })
      .select('*')
      .single();

    if (error) throw error;

    return Response.json({ gig: mapGigToBounty(data) }, { status: 201 });
  } catch (error) {
    console.error('Create gig failed:', error);
    return Response.json({ error: 'Failed to create gig' }, { status: 500 });
  }
}
