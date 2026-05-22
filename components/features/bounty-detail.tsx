"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { SUBMISSIONS, type Bounty } from "@/lib/data";
import { SubmissionModal } from "@/components/features/submission-modal";
import { WinnersPodium } from "@/components/features/winners-podium";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ClockIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import {
  CheckBadgeIcon,
  ChatBubbleLeftIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/solid";

type CurrencyUnit = "PHP" | "USDC";

const STATUS_CONFIG = {
  open: {
    label: "Open",
    dot: "bg-emerald-500",
    badge:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  pending_review: {
    label: "Pending Review",
    dot: "bg-amber-400 animate-pulse",
    badge:
      "border-amber-400/30 bg-amber-400/10 text-amber-600 dark:text-amber-400",
  },
  under_review: {
    label: "Under Review",
    dot: "bg-amber-400 animate-pulse",
    badge:
      "border-amber-400/30 bg-amber-400/10 text-amber-600 dark:text-amber-400",
  },
  closed: {
    label: "Closed",
    dot: "bg-stellar-teal",
    badge: "border-stellar-teal/30 bg-stellar-teal/10 text-stellar-teal",
  },
  paid: {
    label: "Paid",
    dot: "bg-stellar-teal",
    badge: "border-stellar-teal/30 bg-stellar-teal/10 text-stellar-teal",
  },
  draft: {
    label: "Draft",
    dot: "bg-stellar-gray/60",
    badge: "border-stellar-gray/30 bg-stellar-gray/10 text-muted-foreground",
  },
  cancelled: {
    label: "Cancelled",
    dot: "bg-red-500",
    badge: "border-red-500/30 bg-red-500/10 text-red-500",
  },
} as const;

interface BountyDetailProps {
  bounty: Bounty;
}

export function BountyDetail({ bounty }: BountyDetailProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [unit, setUnit] = useState<CurrencyUnit>("PHP");

  const status = bounty.status ?? "open";
  const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.open;

  const bountySubmissions = useMemo(
    () => SUBMISSIONS.filter((s) => s.bountySlug === bounty.slug),
    [bounty.slug]
  );

  const usdcValue = bounty.prizeUsdc ?? Math.max(1, Math.round(bounty.prize / 120));
  const displayPrize =
    unit === "PHP"
      ? `PHP ${bounty.prize.toLocaleString()}`
      : `$${usdcValue.toLocaleString()} USDC`;

  return (
    <>
      <SubmissionModal open={modalOpen} onOpenChange={setModalOpen} bounty={bounty} />

      <div className="mx-auto max-w-5xl p-6">
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "mb-5 h-auto p-0 text-xs text-muted-foreground hover:bg-transparent inline-flex items-center gap-1.5"
          )}
        >
          <ArrowLeftIcon className="h-3 w-3" />
          Browse opportunities
        </Link>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_280px]">
          <div>
            <div className="mb-2.5 flex flex-wrap items-center gap-2">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-[9.5px] font-bold"
                style={{ background: bounty.bg, color: bounty.color }}
              >
                {bounty.initials}
              </div>
              <span className="text-[13px] font-semibold">{bounty.org}</span>
              <CheckBadgeIcon className="h-4 w-4 text-stellar-teal" />
              <Badge
                variant="outline"
                className={cn("h-5 px-2 text-[10px] font-semibold flex items-center gap-1", statusCfg.badge)}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", statusCfg.dot)} />
                {statusCfg.label}
              </Badge>
            </div>

            <h1 className="mb-2.5 text-[24px] font-bold leading-[1.3] tracking-tight">{bounty.title}</h1>

            <div className="mb-5 flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground">
              <Badge variant="outline" className="h-5 px-2 text-[10px] font-semibold">
                {bounty.type.charAt(0).toUpperCase() + bounty.type.slice(1)}
              </Badge>
              <span>·</span>
              <div className="flex items-center gap-1 font-medium">
                <ClockIcon className="h-3.5 w-3.5" />
                <span>{bounty.due}</span>
              </div>
              <span>·</span>
              <div className="flex items-center gap-1 font-medium">
                <ChatBubbleLeftIcon className="h-3.5 w-3.5" />
                <span>{bounty.submissions} submissions</span>
              </div>
            </div>

            <p className="mb-3 block text-[10.5px] font-bold uppercase tracking-[0.1em]">About this bounty</p>
            <p className="mb-6 text-[13.5px] leading-[1.7]">{bounty.desc}</p>

            <p className="mb-3 block text-[10.5px] font-bold uppercase tracking-[0.1em]">Deliverables</p>
            <ul className="m-0 list-none p-0 space-y-1">
              {bounty.deliverables.map((d, i) => (
                <li key={i} className="flex gap-2.5 border-b py-2.5 text-[12.5px] leading-[1.6] last:border-0 items-start">
                  <ArrowRightIcon className="mt-1 h-3.5 w-3.5 shrink-0 text-stellar-teal" />
                  <span>{d}</span>
                </li>
              ))}
            </ul>

            {status !== "draft" && bountySubmissions.length > 0 && (
              <div className="mt-8">
                <p className="mb-3 block text-[10.5px] font-bold uppercase tracking-[0.1em]">
                  Submissions ({bountySubmissions.length})
                </p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Card className="p-5">
              <div className="mb-3 flex justify-end">
                <div className="inline-flex rounded-lg border p-0.5 text-[10px]">
                  {(["PHP", "USDC"] as CurrencyUnit[]).map((u) => (
                    <button
                      key={u}
                      onClick={() => setUnit(u)}
                      className={cn(
                        "rounded-md px-2.5 py-1 font-bold",
                        unit === u ? "bg-stellar-yellow text-stellar-black" : "text-muted-foreground"
                      )}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pb-1.5 text-center text-[30px] font-bold text-stellar-teal tracking-tight">{displayPrize}</div>
              <div className="mb-4 text-center text-[10.5px] font-medium tracking-wide text-muted-foreground">Prize</div>

              <div className="space-y-2 text-[12px]">
                <div className="flex justify-between"><span>Entry fee</span><span className="font-semibold">{bounty.fee}</span></div>
                <div className="flex justify-between"><span>Deadline</span><span className="font-semibold">{bounty.deadline}</span></div>
                <div className="flex justify-between items-center">
                  <span>Status</span>
                  <span className="flex items-center gap-1 font-semibold text-emerald-600">
                    {statusCfg.label} <CheckCircleIcon className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>

              <div className="mt-4">
                {status === "open" && (
                  <Button onClick={() => setModalOpen(true)} className="w-full bg-stellar-yellow text-stellar-black hover:bg-stellar-yellow/90">
                    Submit your work
                  </Button>
                )}
                {(status === "under_review" || status === "pending_review") && (
                  <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 text-center text-[11px]">
                    Submissions closed. Sponsor is reviewing entries.
                  </div>
                )}
                {(status === "closed" || status === "paid") && (
                  <div className="rounded-xl border border-stellar-teal/20 bg-stellar-teal/5 p-4 text-center text-[11px]">
                    <LockClosedIcon className="mx-auto mb-1 h-5 w-5 text-stellar-teal" />
                    This bounty is complete.
                  </div>
                )}
              </div>
            </Card>

            {(status === "closed" || status === "paid") && bounty.winner && (
              <Card className="p-5">
                <WinnersPodium winner={bounty.winner} prizeToken={bounty.prizeToken ?? "PHP"} />
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
