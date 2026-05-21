We are going to build a "Web 2.5" application. Steps 1-3 will be handled by a traditional database (like Supabase or Firebase). Step 4 is the only part where we talk to the Stellar blockchain.

Here is how we execute your 4 steps, blending standard web tech with Stellar's native primitives.

1. Signin / Signup (Web2 + Wallet Connection)
Users will create a standard account (email/password) so you can store their profile in your database. Then, we ask them to "Connect Wallet".

The Stellar Concept: Keypairs & Wallets. On Stellar, your account is a "Keypair" consisting of a Public Key (starts with 'G', safe to share, acts like a username/bank account number) and a Secret Key (starts with 'S', never share this, acts like a password).

The Tool: We will use Freighter, the standard browser extension wallet for Stellar. When a user connects Freighter, your app grabs their Public Key and saves it to their profile in your database.

2 & 3. Post Gigs, Apply, and Submit Work (Pure Web2)
This is strictly database work. Do not touch the blockchain here.

Action: A user creates a gig. You save the title, description, and the reward amount (e.g., "50 XLM") in your database.

Action: A worker clicks "Submit" and drops a Google Doc link or GitHub repo link. You update the gig status to "Pending Review" in your database.

4. Receive Rewards (The Web3 Magic)
This is where our hackathon points are scored. When the gig creator reviews the submitted work and clicks "Approve & Pay", we trigger a blockchain transaction.

The Stellar Concept: The Stellar Stack. We don't talk to the blockchain directly. We talk to Horizon, which is Stellar's REST API that interfaces with the Stellar network.

The Stellar Concept: Payment Operations. We will use the Stellar SDK to construct a simple Payment operation.

The Flow:

Your app uses the Stellar SDK to draft a transaction sending 50 XLM from the Creator's Public Key to the Worker's Public Key.

Your app passes this draft to the Creator's Freighter wallet extension.

Freighter pops up on the Creator's screen saying: "Sign this transaction to send 50 XLM?"

They click "Approve", Freighter signs it with their Secret Key, and submits it to Horizon.

The blockchain settles the payment in about 5 seconds. Once confirmed, you update your database to mark the gig as "Paid".

🛑 What We Are Skipping (Scope Guardrails)
Smart Contracts (Soroban): We are not building an automated escrow system. Escrow requires smart contracts, which means learning Rust and setting up a complex local testing environment. Manual payouts via simple Payment Operations will work just fine for an MVP and prove you can integrate Stellar.

Custom Assets (Stablecoins): While you can easily issue custom tokens on Stellar, let's stick to paying out in native XLM or Stellar's official USDC for the MVP to save time.
