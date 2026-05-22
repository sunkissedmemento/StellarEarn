import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase';
import { mapGigToBounty } from '@/lib/gigs';

const SubmitWorkSchema = z.object({
  worker_user_id: z.string().uuid('worker_user_id must be a valid UUID'),
  worker_name: z.string().trim().min(2, 'Worker name is required').max(80).optional(),
  worker_stellar_public_key: z.string().regex(/^G[A-Z2-7]{55}$/, 'Invalid Stellar public key').optional(),
  submission_url: z.string().url('Submission must be a valid URL'),
  soroban_submission_hash: z.string().min(3).max(512).optional(),
  submit_tx_hash: z.string().min(16).max(64).optional(),
  submit_tx_xdr: z.string().min(24).optional(),
});

function isSupportedSubmissionLink(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return host.includes('github.com') || host.includes('docs.google.com');
  } catch {
    return false;
  }
}

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
    const parsed = SubmitWorkSchema.safeParse(body);

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

    if (!isSupportedSubmissionLink(parsed.data.submission_url)) {
      return Response.json(
        {
          error: 'Unsupported submission link',
          details: [
            {
              field: 'submission_url',
              message: 'Use a Google Docs or GitHub repository link',
            },
          ],
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

    const { error: insertError } = await supabase
      .from('gig_submissions')
      .insert({
        gig_id: gig.id,
        worker_user_id: parsed.data.worker_user_id,
        worker_name: parsed.data.worker_name ?? null,
        worker_stellar_public_key: parsed.data.worker_stellar_public_key ?? null,
        submission_url: parsed.data.submission_url,
        soroban_submission_hash: parsed.data.soroban_submission_hash ?? null,
        submit_tx_hash: parsed.data.submit_tx_hash ?? null,
        submit_tx_xdr: parsed.data.submit_tx_xdr ?? null,
        status: 'pending_review',
      });

    if (insertError) throw insertError;

    const { data: updatedGig, error: updateError } = await supabase
      .from('gigs')
      .update({
        status: 'pending_review',
        submissions: Number(gig.submissions ?? 0) + 1,
      })
      .eq('id', gig.id)
      .select('*')
      .single();

    if (updateError) throw updateError;

    return Response.json(
      {
        message: 'Work submitted successfully',
        gig: mapGigToBounty(updatedGig),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Submit work failed:', error);
    return Response.json({ error: 'Failed to submit work' }, { status: 500 });
  }
}
