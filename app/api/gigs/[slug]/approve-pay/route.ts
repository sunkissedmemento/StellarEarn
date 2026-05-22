import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase';
import { mapGigToBounty } from '@/lib/gigs';

const ApprovePaySchema = z.object({
  submission_id: z.string().uuid('submission_id must be a valid UUID'),
  sponsor_user_id: z.string().uuid('sponsor_user_id must be a valid UUID'),
  tx_hash: z.string().min(16, 'tx_hash is required').max(64),
});

export async function POST(
  req: Request,
  { params }: { params: { slug: string } | Promise<{ slug: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const slug = decodeURIComponent(resolvedParams?.slug ?? '').trim();

    if (!slug) {
      return Response.json({ error: 'Gig slug is required' }, { status: 400 });
    }

    const body = await req.json();
    const parsed = ApprovePaySchema.safeParse(body);

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

    const { data: gig, error: gigError } = await supabase
      .from('gigs')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (gigError) throw gigError;

    if (!gig) {
      return Response.json({ error: 'Gig not found' }, { status: 404 });
    }

    if (gig.created_by_user_id !== parsed.data.sponsor_user_id) {
      return Response.json({ error: 'Only the gig creator can approve payment' }, { status: 403 });
    }

    const { data: submission, error: submissionError } = await supabase
      .from('gig_submissions')
      .select('*')
      .eq('id', parsed.data.submission_id)
      .eq('gig_id', gig.id)
      .maybeSingle();

    if (submissionError) throw submissionError;

    if (!submission) {
      return Response.json({ error: 'Submission not found' }, { status: 404 });
    }

    const txHash = parsed.data.tx_hash;

    const { error: approveError } = await supabase
      .from('gig_submissions')
      .update({
        status: 'approved',
        approved_by_user_id: parsed.data.sponsor_user_id,
        approved_at: new Date().toISOString(),
        payout_tx_hash: txHash,
      })
      .eq('id', submission.id);

    if (approveError) throw approveError;

    const { error: rejectOthersError } = await supabase
      .from('gig_submissions')
      .update({
        status: 'rejected',
      })
      .eq('gig_id', gig.id)
      .neq('id', submission.id)
      .eq('status', 'pending_review');

    if (rejectOthersError) throw rejectOthersError;

    const { data: updatedGig, error: gigUpdateError } = await supabase
      .from('gigs')
      .update({
        status: 'paid',
        paid_by_user_id: parsed.data.sponsor_user_id,
        paid_at: new Date().toISOString(),
        payment_tx_hash: txHash,
      })
      .eq('id', gig.id)
      .select('*')
      .single();

    if (gigUpdateError) throw gigUpdateError;

    return Response.json(
      {
        message: 'Submission approved and gig paid',
        gig: mapGigToBounty(updatedGig),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Approve and pay failed:', error);
    return Response.json({ error: 'Failed to approve and pay' }, { status: 500 });
  }
}
