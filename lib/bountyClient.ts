import {
  Account,
  Contract,
  rpc,
  Networks,
  TransactionBuilder,
  BASE_FEE,
  nativeToScVal,
} from "@stellar/stellar-sdk";

const DEFAULT_RPC_URL = "https://soroban-testnet.stellar.org";
const READ_ONLY_ACCOUNT = new Account(
  "GBZXN7PIRZGNMHGA6DK6MY6AC72O453END5TPHJUIXQ3OSBXUPJYNO3S",
  "0"
);

function getNetworkPassphrase() {
  return process.env.NEXT_PUBLIC_STELLAR_NETWORK === "mainnet"
    ? Networks.PUBLIC
    : Networks.TESTNET;
}

function getRpcUrl() {
  return (
    process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ||
    process.env.SOROBAN_RPC_URL ||
    DEFAULT_RPC_URL
  );
}

function resolveContractId(explicit?: string) {
  const contractId =
    explicit ||
    process.env.NEXT_PUBLIC_SOROBAN_CONTRACT_ID ||
    process.env.SOROBAN_CONTRACT_ID;

  if (!contractId || contractId === "YOUR_CONTRACT_ID") {
    throw new Error(
      "Soroban contract ID is missing. Set NEXT_PUBLIC_SOROBAN_CONTRACT_ID in your environment."
    );
  }

  return contractId;
}

function toU64(value: number | bigint) {
  return nativeToScVal(BigInt(value), { type: "u64" });
}

function toI128(value: string | number | bigint) {
  return nativeToScVal(BigInt(value), { type: "i128" });
}

export class BountyClient {
  contract: Contract;
  private readonly server: rpc.Server;
  private readonly networkPassphrase: string;

  constructor(contractId?: string) {
    this.contract = new Contract(resolveContractId(contractId));
    this.server = new rpc.Server(getRpcUrl());
    this.networkPassphrase = getNetworkPassphrase();
  }

  // -------------------------
  // CREATE BOUNTY (correct Soroban flow)
  // -------------------------
  async createBounty(
    sponsor: string,
    token: string,
    prize: string | number | bigint,
    deadline: number
  ) {
    const sponsorAccount = await this.server.getAccount(sponsor);
    const tx = await this.server.prepareTransaction(
      new TransactionBuilder(sponsorAccount, {
        fee: BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          this.contract.call(
            "create_bounty",
            nativeToScVal(sponsor),
            nativeToScVal(token),
            toI128(prize),
            toU64(deadline)
          )
        )
        .setTimeout(30)
        .build()
    );

    return tx;
  }

  // -------------------------
  // SUBMIT
  // -------------------------
  async submit(
    participant: string,
    bountyId: number | bigint,
    workHash: string
  ) {
    const participantAccount = await this.server.getAccount(participant);
    const tx = await this.server.prepareTransaction(
      new TransactionBuilder(participantAccount, {
        fee: BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          this.contract.call(
            "submit",
            toU64(bountyId),
            nativeToScVal(participant),
            nativeToScVal(workHash)
          )
        )
        .setTimeout(30)
        .build()
    );

    return tx;
  }

  // -------------------------
  // SELECT WINNER
  // -------------------------
  async selectWinner(
    sponsor: string,
    bountyId: number | bigint,
    winner: string
  ) {
    const sponsorAccount = await this.server.getAccount(sponsor);
    const tx = await this.server.prepareTransaction(
      new TransactionBuilder(sponsorAccount, {
        fee: BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          this.contract.call(
            "select_winner",
            toU64(bountyId),
            nativeToScVal(sponsor),
            nativeToScVal(winner)
          )
        )
        .setTimeout(30)
        .build()
    );

    return tx;
  }

  // -------------------------
  // CANCEL
  // -------------------------
  async cancel(
    sponsor: string,
    bountyId: number | bigint
  ) {
    const sponsorAccount = await this.server.getAccount(sponsor);
    const tx = await this.server.prepareTransaction(
      new TransactionBuilder(sponsorAccount, {
        fee: BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          this.contract.call(
            "cancel",
            toU64(bountyId),
            nativeToScVal(sponsor)
          )
        )
        .setTimeout(30)
        .build()
    );

    return tx;
  }

  // -------------------------
  // READ ONLY (CORRECT WAY)
  // -------------------------
  async getBounty(id: number | bigint) {
    const tx = new TransactionBuilder(READ_ONLY_ACCOUNT, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(
        this.contract.call("get_bounty", toU64(id))
      )
      .setTimeout(30)
      .build();

    return this.server.simulateTransaction(tx);
  }

  async getSubmissions(id: number | bigint) {
    const tx = new TransactionBuilder(READ_ONLY_ACCOUNT, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(
        this.contract.call("get_submissions", toU64(id))
      )
      .setTimeout(30)
      .build();

    return this.server.simulateTransaction(tx);
  }

  async getFees() {
    const tx = new TransactionBuilder(READ_ONLY_ACCOUNT, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(this.contract.call("platform_fees"))
      .setTimeout(30)
      .build();

    return this.server.simulateTransaction(tx);
  }
}