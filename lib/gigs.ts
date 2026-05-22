import { createServerSupabaseClient } from '@/lib/supabase';
import type { Bounty, OpportunitySkill, OpportunityType } from '@/lib/data';

type GigRow = {
  id: string;
  created_by_user_id: string;
  slug: string;
  title: string;
  org: string;
  initials: string;
  prize_php: number;
  reward_amount: number;
  reward_unit: "XLM" | "PHP" | "USDC";
  type: OpportunityType;
  skill: OpportunitySkill;
  status: "open" | "pending_review" | "closed" | "paid";
  deadline_at: string;
  description: string;
  deliverables: string[];
  featured: boolean;
  live: boolean;
  submissions: number;
  fee_xlm: number;
  paid_at: string | null;
  payment_tx_hash: string | null;
  soroban_bounty_id: number | null;
  creation_tx_hash: string | null;
  created_at: string;
};

export function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

export function initialsFromOrg(org: string): string {
  const words = org.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'SP';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function prettyDeadline(date: string): string {
  const deadline = new Date(`${date}T00:00:00Z`);
  return deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function dueLabel(date: string): string {
  const now = new Date();
  const deadline = new Date(`${date}T00:00:00Z`);
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / dayMs));
  return diffDays === 0 ? 'Due today' : `Due in ${diffDays}d`;
}

export function mapGigToBounty(gig: GigRow): Bounty {
  const rewardAmount = Number(gig.reward_amount ?? gig.prize_php);
  const rewardUnit = gig.reward_unit ?? "XLM";

  return {
    id: gig.id,
    slug: gig.slug,
    title: gig.title,
    org: gig.org,
    initials: gig.initials,
    bg: gig.type === 'project' ? '#B7ACE81a' : '#00A7B51a',
    color: gig.type === 'project' ? '#B7ACE8' : '#00A7B5',
    prize: rewardAmount,
    rewardAmount,
    rewardUnit,
    type: gig.type,
    skill: gig.skill,
    status: gig.status,
    deadline: prettyDeadline(gig.deadline_at),
    due: dueLabel(gig.deadline_at),
    submissions: gig.submissions,
    fee: `${gig.fee_xlm} XLM`,
    createdByUserId: gig.created_by_user_id,
    paidAt: gig.paid_at,
    paymentTxHash: gig.payment_tx_hash,
    sorobanBountyId: gig.soroban_bounty_id !== null ? String(gig.soroban_bounty_id) : null,
    creationTxHash: gig.creation_tx_hash,
    featured: gig.featured,
    live: gig.live,
    desc: gig.description,
    deliverables: gig.deliverables,
  };
}

export async function getGigBySlug(slug: string, type: OpportunityType): Promise<Bounty | null> {
  const supabase = createServerSupabaseClient();
  const query = supabase.from('gigs').select('*');
  // @ts-expect-error Current generated Supabase type metadata in this workspace rejects valid literal column names.
  const { data, error } = await query.eq('slug', slug).eq('type', type).maybeSingle();

  if (error || !data) {
    return null;
  }

  if (typeof data !== 'object' || Array.isArray(data)) {
    return null;
  }

  return mapGigToBounty(data as GigRow);
}

export async function listGigs(limit = 50): Promise<Bounty[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('gigs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  if (!Array.isArray(data)) {
    return [];
  }

  return data.map((row) => mapGigToBounty(row as unknown as GigRow));
}
