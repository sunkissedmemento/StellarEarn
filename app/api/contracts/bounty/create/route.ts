import { z } from 'zod';
import { Networks } from '@stellar/stellar-sdk';
import { BountyClient } from '@/lib/bountyClient';

const PrepareCreateSchema = z.object({
  sponsor_wallet: z.string().regex(/^G[A-Z2-7]{55}$/, 'Invalid sponsor wallet'),
  token_contract: z.string().min(8, 'token_contract is required'),
  prize: z.union([z.string().min(1), z.number().positive()]),
  deadline_unix: z.number().int().positive('deadline_unix must be a unix timestamp in seconds'),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = PrepareCreateSchema.safeParse(body);

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
    const tx = await client.createBounty(
      parsed.data.sponsor_wallet,
      parsed.data.token_contract,
      parsed.data.prize,
      parsed.data.deadline_unix
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
    console.error('Prepare contract create failed:', error);
    return Response.json({ error: 'Failed to prepare contract create transaction' }, { status: 500 });
  }
}
