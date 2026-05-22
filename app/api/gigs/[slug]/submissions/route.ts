import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } | Promise<{ slug: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const slug = decodeURIComponent(resolvedParams?.slug ?? '').trim();

    if (!slug) {
      return Response.json({ error: 'Gig slug is required' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    const { data: gig, error: gigError } = await supabase
      .from('gigs')
      .select('id, created_by_user_id, status, reward_amount, reward_unit')
      .eq('slug', slug)
      .maybeSingle();

    if (gigError) throw gigError;

    if (!gig) {
      return Response.json({ error: 'Gig not found' }, { status: 404 });
    }

    const { data: submissions, error: submissionsError } = await supabase
      .from('gig_submissions')
      .select('id, gig_id, worker_user_id, worker_name, submission_url, status, submitted_at, approved_by_user_id, approved_at, payout_tx_hash')
      .eq('gig_id', gig.id)
      .order('submitted_at', { ascending: false });

    if (submissionsError) throw submissionsError;

    const workerIds = Array.from(new Set((submissions ?? []).map((item) => item.worker_user_id)));

    const workerProfiles = workerIds.length
      ? await supabase
          .from('users')
          .select('id, username, stellar_public_key')
          .in('id', workerIds)
      : { data: [], error: null };

    if (workerProfiles.error) throw workerProfiles.error;

    const workerMap = new Map(
      (workerProfiles.data ?? []).map((worker) => [
        worker.id,
        {
          username: worker.username,
          stellar_public_key: worker.stellar_public_key,
        },
      ])
    );

    const hydratedSubmissions = (submissions ?? []).map((item) => ({
      ...item,
      worker_username: workerMap.get(item.worker_user_id)?.username ?? item.worker_name,
      worker_stellar_public_key: workerMap.get(item.worker_user_id)?.stellar_public_key ?? null,
    }));

    return Response.json(
      {
        gig,
        submissions: hydratedSubmissions,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get submissions failed:', error);
    return Response.json({ error: 'Failed to fetch submissions' }, { status: 500 });
  }
}
