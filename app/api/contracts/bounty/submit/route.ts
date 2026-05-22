import { z } from 'zod';
import { Networks } from '@stellar/stellar-sdk';
import { BountyClient } from '@/lib/bountyClient';

const PrepareSubmitSchema = z.object({
  participant_wallet: z.string().regex(/^G[A-Z2-7]{55}$/, 'Invalid participant wallet'),
  bounty_id: z.number().int().nonnegative('bounty_id must be a non-negative integer'),
  work_hash: z.string().min(3).max(512),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = PrepareSubmitSchema.safeParse(body);

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

    const client = new BountyClient();
    const tx = await client.submit(
      parsed.data.participant_wallet,
      parsed.data.bounty_id,
      parsed.data.work_hash
    );

    const networkPassphrase =
      process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'mainnet'
        ? Networks.PUBLIC
        : Networks.TESTNET;

    return Response.json(
      {
        tx_xdr: tx.toXDR(),
        network_passphrase: networkPassphrase,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Prepare contract submit failed:', error);
    return Response.json({ error: 'Failed to prepare contract submit transaction' }, { status: 500 });
  }
}
