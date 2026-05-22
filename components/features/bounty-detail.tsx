"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import * as StellarSdk from "@stellar/stellar-sdk";
import { getAddress, isConnected, requestAccess, signTransaction } from "@stellar/freighter-api";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import type { Bounty } from "@/lib/data";
import { CheckBadgeIcon, ChatBubbleLeftIcon, CheckCircleIcon } from "@heroicons/react/24/solid";
import { ArrowLeftIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { readAuthSession, writeAuthSession } from "@/lib/auth-session";

interface BountyDetailProps {
  bounty: Bounty;
}

type GigSubmission = {
  id: string;
  worker_user_id: string;
  worker_name: string | null;
  worker_username: string | null;
  worker_stellar_public_key: string | null;
  submission_url: string;
  status: "pending_review" | "approved" | "rejected";
  submitted_at: string;
  approved_at: string | null;
  payout_tx_hash: string | null;
};

function getApprovePayErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Please try again.";
  }

  const maybeHorizon = error as Error & {
    response?: {
      data?: {
        type?: string;
        detail?: string;
        extras?: {
          result_codes?: {
            operations?: string[];
          };
        };
      };
    };
  };

  const horizonType = maybeHorizon.response?.data?.type ?? "";
  const horizonDetail = maybeHorizon.response?.data?.detail ?? "";
  const opCodes = maybeHorizon.response?.data?.extras?.result_codes?.operations ?? [];

  if (horizonType.includes("not_found") || horizonDetail.includes("Resource Missing")) {
    return "The sponsor wallet is not funded on testnet. Fund it with Friendbot, then retry.";
  }

  if (opCodes.includes("op_no_destination")) {
    return "Worker wallet is not funded on testnet yet. Ask the worker to fund their address via Friendbot.";
  }

  return error.message || "Please try again.";
}

export function BountyDetail({ bounty }: BountyDetailProps) {
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [authUserId] = useState<string | null>(() => readAuthSession()?.userId ?? null);
  const [authWalletAddress, setAuthWalletAddress] = useState<string | null>(() => readAuthSession()?.walletAddress ?? null);
  const [submissionUrl, setSubmissionUrl] = useState("");
  const [workerName, setWorkerName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApproving, setIsApproving] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<GigSubmission[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [isCheckingWallet, setIsCheckingWallet] = useState(false);
  const [freighterAddress, setFreighterAddress] = useState<string | null>(null);
  const [walletStatusText, setWalletStatusText] = useState("Not checked");

  const rewardAmount = bounty.rewardAmount ?? bounty.prize;
  const rewardUnit = bounty.rewardUnit ?? "PHP";
  const status = bounty.status ?? "open";
  const isDatabaseGig = typeof bounty.id === "string";
  const canReviewAndPay = Boolean(
    isHydrated &&
    isDatabaseGig &&
    authUserId &&
    bounty.createdByUserId &&
    authUserId === bounty.createdByUserId
  );
  const pendingSubmissions = useMemo(
    () => submissions.filter((item) => item.status === "pending_review"),
    [submissions]
  );
  const walletMismatch = Boolean(
    authWalletAddress && freighterAddress && authWalletAddress !== freighterAddress
  );

  const networkPassphrase =
    process.env.NEXT_PUBLIC_STELLAR_NETWORK === "mainnet"
      ? StellarSdk.Networks.PUBLIC
      : StellarSdk.Networks.TESTNET;
  const horizonUrl =
    process.env.NEXT_PUBLIC_STELLAR_NETWORK === "mainnet"
      ? "https://horizon.stellar.org"
      : "https://horizon-testnet.stellar.org";

  useEffect(() => {
    if (!isDatabaseGig) return;

    const loadSubmissions = async () => {
      setIsLoadingSubmissions(true);
      try {
        const response = await fetch(`/api/gigs/${bounty.slug}/submissions`, {
          cache: "no-store",
        });

        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error || "Failed to load submissions");
        }

        setSubmissions(Array.isArray(payload?.submissions) ? payload.submissions : []);
      } catch (error) {
        toast.error("Could not load submissions", {
          description: error instanceof Error ? error.message : "Please refresh and try again.",
        });
      } finally {
        setIsLoadingSubmissions(false);
      }
    };

    void loadSubmissions();
  }, [bounty.slug, isDatabaseGig]);

  const statusLabel =
    status === "pending_review"
      ? "Pending Review"
      : status === "closed"
        ? "Closed"
        : "Open";

  const submitWork = async () => {
    const session = readAuthSession();

    if (!session?.userId) {
      toast.error("Please log in before submitting work");
      return;
    }

    if (!submissionUrl.trim()) {
      toast.error("Please provide a submission link");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/gigs/${bounty.slug}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          worker_user_id: session.userId,
          worker_name: workerName || undefined,
          submission_url: submissionUrl,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const details = Array.isArray(payload?.details)
          ? payload.details.map((item: { message?: string }) => item.message).filter(Boolean).join(", ")
          : "";
        throw new Error(details || payload?.error || "Submission failed");
      }

      toast.success("Work submitted", {
        description: "Gig status is now Pending Review",
      });

      setSubmissionUrl("");
      window.location.reload();
    } catch (error) {
      toast.error("Could not submit work", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const approveAndPay = async (submission: GigSubmission) => {
    if (!authUserId) {
      toast.error("Please log in as the sponsor to approve payment");
      return;
    }

    if (!submission.worker_stellar_public_key) {
      toast.error("Worker wallet address is missing");
      return;
    }

    if (rewardUnit !== "XLM") {
      toast.error("MVP payout currently supports XLM only");
      return;
    }

    const normalizedAmount = Number(rewardAmount);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      toast.error("Invalid reward amount");
      return;
    }

    setIsApproving(submission.id);

    try {
      const access = await requestAccess();
      if (access.error) {
        throw new Error(access.error.message || "Freighter access was not granted");
      }

      const signerAddress = access.address;
      if (!signerAddress) {
        throw new Error("Freighter did not return a wallet address");
      }

      if (!StellarSdk.StrKey.isValidEd25519PublicKey(signerAddress)) {
        throw new Error("Freighter returned an invalid Stellar public key");
      }

      if (!StellarSdk.StrKey.isValidEd25519PublicKey(submission.worker_stellar_public_key)) {
        throw new Error("Worker wallet address is invalid");
      }

      const server = new StellarSdk.Horizon.Server(horizonUrl);
      const sourceAccount = await server.loadAccount(signerAddress);

      const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase,
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination: submission.worker_stellar_public_key,
            asset: StellarSdk.Asset.native(),
            amount: normalizedAmount.toFixed(7),
          })
        )
        .setTimeout(120)
        .build();

      const signed = await signTransaction(tx.toXDR(), {
        networkPassphrase,
        address: signerAddress,
      });

      if (signed.error) {
        throw new Error(signed.error.message || "Freighter could not sign the transaction");
      }

      const signedXdr = signed.signedTxXdr;

      if (!signedXdr) {
        throw new Error("Freighter did not return a signed transaction");
      }

      const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, networkPassphrase);
      const result = await server.submitTransaction(signedTx);

      const finalizeResponse = await fetch(`/api/gigs/${bounty.slug}/approve-pay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          submission_id: submission.id,
          sponsor_user_id: authUserId,
          tx_hash: result.hash,
        }),
      });

      const finalizePayload = await finalizeResponse.json().catch(() => null);
      if (!finalizeResponse.ok) {
        throw new Error(finalizePayload?.error || "Failed to finalize payment");
      }

      toast.success("Approved and paid", {
        description: `Transaction hash: ${result.hash}`,
      });

      window.location.reload();
    } catch (error) {
      toast.error("Approve & Pay failed", {
        description: getApprovePayErrorMessage(error),
      });
    } finally {
      setIsApproving(null);
    }
  };

  const checkWalletStatus = async () => {
    setIsCheckingWallet(true);
    try {
      const connected = await isConnected();
      if (connected.error || !connected.isConnected) {
        setFreighterAddress(null);
        setWalletStatusText("Freighter not connected");
        return;
      }

      const addressResult = await getAddress();
      if (addressResult.error || !addressResult.address) {
        setFreighterAddress(null);
        setWalletStatusText(addressResult.error?.message || "Wallet address unavailable");
        return;
      }

      setFreighterAddress(addressResult.address);

      if (!authWalletAddress) {
        setWalletStatusText("Session wallet not set — click \"Use This Wallet\" to link it");
        return;
      }

      setWalletStatusText(
        authWalletAddress === addressResult.address ? "Wallet match" : "Wallet mismatch — click \"Use This Wallet\" to update"
      );
    } catch {
      setFreighterAddress(null);
      setWalletStatusText("Unable to read Freighter wallet");
    } finally {
      setIsCheckingWallet(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-6">
      <Link
        href="/"
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "mb-5 h-auto p-0 text-xs text-muted-foreground hover:bg-transparent hover:text-stellar-black dark:text-stellar-gray/70 dark:hover:text-stellar-yellow inline-flex items-center gap-1.5 transition-colors duration-200"
        )}
      >
        <ArrowLeftIcon className="h-3 w-3 transition-transform duration-200 group-hover:-translate-x-0.5" /> Browse opportunities
      </Link>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_280px]">
        <div>
          <div className="mb-2.5 flex items-center gap-2">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-stellar-gray/30 dark:border-stellar-gray/10 text-[9.5px] font-bold shadow-xs"
              style={{ background: bounty.bg, color: bounty.color }}
            >
              {bounty.initials}
            </div>
            <span className="text-[13px] font-semibold text-stellar-black/80 dark:text-stellar-white/80">{bounty.org}</span>
            <CheckBadgeIcon className="h-4 w-4 text-stellar-teal" />
          </div>
          <h1 className="mb-2.5 text-[24px] font-bold leading-[1.3] text-stellar-black dark:text-stellar-white tracking-tight">
            {bounty.title}
          </h1>
          <div className="mb-5 flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground dark:text-stellar-gray/70">
            <Badge
              variant="outline"
              className={`h-5 px-2 text-[10px] font-semibold transition-colors duration-200 ${
                bounty.type === "bounty"
                  ? "border-stellar-teal/20 bg-stellar-teal/5 text-stellar-teal"
                  : "border-stellar-lavender/30 bg-stellar-lavender/5 text-stellar-lavender"
              }`}
            >
              {bounty.type.charAt(0).toUpperCase() + bounty.type.slice(1)}
            </Badge>
            <span className="text-stellar-black/20 dark:text-stellar-gray/20">·</span>
            <span className="font-medium text-stellar-black/70 dark:text-stellar-gray/70">{bounty.due}</span>
            <span className="text-stellar-black/20 dark:text-stellar-gray/20">·</span>
            <div className="flex items-center gap-1 font-medium text-stellar-black/70 dark:text-stellar-gray/70">
              <ChatBubbleLeftIcon className="h-3.5 w-3.5 text-stellar-black/40 dark:text-stellar-gray/60" />
              <span>{bounty.submissions} submissions</span>
            </div>
            {bounty.live && (
              <span className="relative flex h-2 w-2 ml-0.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            )}
          </div>

          <p className="mb-3 block text-[10.5px] font-bold uppercase tracking-[0.1em] text-stellar-navy dark:text-stellar-lavender">About this bounty</p>
          <p className="mb-6 text-[13.5px] leading-[1.7] text-stellar-black/85 dark:text-stellar-white/85">{bounty.desc}</p>

          <p className="mb-3 block text-[10.5px] font-bold uppercase tracking-[0.1em] text-stellar-navy dark:text-stellar-lavender">Deliverables</p>
          <ul className="m-0 list-none p-0 space-y-1">
            {bounty.deliverables.map((d, i) => (
              <li key={i} className="flex gap-2.5 border-b border-stellar-gray/15 dark:border-stellar-gray/5 py-2.5 text-[12.5px] leading-[1.6] text-stellar-black/80 dark:text-stellar-white/80 last:border-0 items-start hover:bg-stellar-gray/5 dark:hover:bg-stellar-gray/5 px-2 rounded-lg transition-colors duration-200">
                <ArrowRightIcon className="mt-1 h-3.5 w-3.5 shrink-0 text-stellar-teal" />
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <Card className="group relative overflow-hidden mb-3 p-5 shadow-[0_4px_20px_rgba(15,15,15,0.02)] border border-stellar-gray/20 dark:border-stellar-gray/10 bg-white/70 dark:bg-[#151515]/70 backdrop-blur-md">

            <div className="relative z-10 pt-2 pb-1.5 text-center text-[30px] font-bold text-stellar-teal tracking-tight">
              {rewardAmount.toLocaleString()} {rewardUnit}
            </div>
            <div className="relative z-10 mb-4 text-center text-[10.5px] font-medium tracking-wide text-stellar-navy/60 dark:text-stellar-lavender/60">
              Reward set by sponsor
            </div>
            {[
              ["Submission fee", bounty.fee],
              ["Submissions", String(bounty.submissions)],
              ["Deadline", bounty.deadline],
              ["Status", <div key="status" className="flex items-center gap-1 text-emerald-500 font-semibold">{statusLabel} <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-500 animate-pulse" /></div>],
            ].map(([l, v], idx, arr) => (
              <div key={idx} className={`relative z-10 flex justify-between items-center py-2 text-[12px] ${idx !== arr.length - 1 ? "border-b border-stellar-gray/15 dark:border-stellar-gray/10" : ""}`}>
                <span className="text-muted-foreground dark:text-stellar-gray/70 font-medium">{l as string}</span>
                <span className={`font-semibold ${l === "Escrow status" ? "" : "text-stellar-black dark:text-stellar-white"}`}>{v}</span>
              </div>
            ))}
            <div className="relative z-10 mt-4 space-y-2">
              <input
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
                placeholder="Your name (optional)"
                value={workerName}
                onChange={(e) => setWorkerName(e.target.value)}
              />
              <input
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
                placeholder="Google Doc or GitHub repo link"
                value={submissionUrl}
                onChange={(e) => setSubmissionUrl(e.target.value)}
              />
              <Button
                className="w-full bg-stellar-yellow text-[13px] font-bold text-stellar-black border border-stellar-yellow hover:bg-stellar-yellow/95 hover:shadow-[0_2px_12px_rgba(253,218,36,0.3)] active:scale-[0.98] transition-all duration-200 cursor-pointer py-5"
                onClick={submitWork}
                disabled={isSubmitting || !isDatabaseGig}
              >
                {isSubmitting ? "Submitting..." : "Submit Work"}
              </Button>
            </div>
            <p className="relative z-10 mt-3 text-center text-[10px] leading-[1.5] text-stellar-black/50 dark:text-stellar-gray/60 font-medium">
              Submit a Google Doc or GitHub repository. New submissions are saved in the database with Pending Review status.
            </p>
            {!isDatabaseGig && (
              <p className="relative z-10 mt-2 text-center text-[10px] leading-[1.5] text-stellar-black/50 dark:text-stellar-gray/60 font-medium">
                Submission saving is enabled for sponsor-created gigs.
              </p>
            )}
          </Card>

          {canReviewAndPay && (
            <Card className="group relative overflow-hidden p-5 shadow-[0_4px_20px_rgba(15,15,15,0.02)] border border-stellar-gray/20 dark:border-stellar-gray/10 bg-white/70 dark:bg-[#151515]/70 backdrop-blur-md">
              <p className="relative z-10 mb-3 text-[10px] font-bold uppercase tracking-[0.1em] text-stellar-navy dark:text-stellar-lavender">
                Sponsor Review
              </p>
              <div className="mb-3 rounded-md border border-border p-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Wallet Status
                </p>
                <p className="mt-1 break-all text-[11px] text-foreground">
                  Session: {authWalletAddress ?? "Not set"}
                </p>
                <p className="mt-1 break-all text-[11px] text-foreground">
                  Freighter: {freighterAddress ?? "Not checked"}
                </p>
                <p
                  className={cn(
                    "mt-1 text-[11px] font-semibold",
                    walletMismatch ? "text-red-500" : "text-emerald-600"
                  )}
                >
                  {walletStatusText}
                </p>
                <div className="mt-2 flex gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-7 flex-1 text-[10px]"
                    onClick={checkWalletStatus}
                    disabled={isCheckingWallet}
                  >
                    {isCheckingWallet ? "Checking..." : "Refresh"}
                  </Button>
                  {freighterAddress && freighterAddress !== authWalletAddress && (
                    <Button
                      type="button"
                      className="h-7 flex-1 bg-stellar-teal text-[10px] font-semibold text-white hover:bg-stellar-teal/90"
                      onClick={() => {
                        const session = readAuthSession();
                        if (!session) return;
                        writeAuthSession({ ...session, walletAddress: freighterAddress, walletConnected: true });
                        setAuthWalletAddress(freighterAddress);
                        setWalletStatusText("Wallet match");
                        toast.success("Session wallet updated");
                      }}
                    >
                      Use This Wallet
                    </Button>
                  )}
                </div>
              </div>
              {isLoadingSubmissions ? (
                <p className="text-xs text-muted-foreground">Loading submissions...</p>
              ) : pendingSubmissions.length === 0 ? (
                <p className="text-xs text-muted-foreground">No pending submissions to review.</p>
              ) : (
                <div className="space-y-2">
                  {pendingSubmissions.map((submission) => (
                    <div key={submission.id} className="rounded-md border border-border p-2.5">
                      <p className="text-[11px] font-semibold text-foreground">
                        {submission.worker_username ?? submission.worker_name ?? "Unknown worker"}
                      </p>
                      <a
                        href={submission.submission_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block break-all text-[10px] text-stellar-teal hover:underline"
                      >
                        {submission.submission_url}
                      </a>
                      <Button
                        className="mt-2 h-8 w-full bg-stellar-yellow text-[11px] font-bold text-stellar-black hover:bg-stellar-yellow/90"
                        onClick={() => approveAndPay(submission)}
                        disabled={Boolean(isApproving) || walletMismatch}
                      >
                        {isApproving === submission.id ? "Processing..." : `Approve & Pay ${rewardAmount} ${rewardUnit}`}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          <Card className="group relative overflow-hidden p-5 shadow-[0_4px_20px_rgba(15,15,15,0.02)] border border-stellar-gray/20 dark:border-stellar-gray/10 bg-white/70 dark:bg-[#151515]/70 backdrop-blur-md">
            <p className="relative z-10 mb-3 text-[10px] font-bold uppercase tracking-[0.1em] text-stellar-navy dark:text-stellar-lavender">Posted by</p>
            <div className="relative z-10 flex items-center gap-2.5">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-stellar-gray/30 dark:border-stellar-gray/10 text-[9.5px] font-bold shadow-xs"
                style={{ background: bounty.bg, color: bounty.color }}
              >
                {bounty.initials}
              </div>
              <div>
                <div className="text-[12.5px] font-bold text-stellar-black dark:text-stellar-white">{bounty.org}</div>
                <div className="flex items-center gap-1 text-[11px] text-stellar-black/50 dark:text-stellar-gray/60 font-medium">
                  Verified DAO <CheckBadgeIcon className="h-3.5 w-3.5 text-stellar-teal" />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
