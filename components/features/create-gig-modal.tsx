"use client";

import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { Bounty, OpportunitySkill, OpportunityType } from "@/lib/data";

type FormState = {
  title: string;
  org: string;
  rewardAmount: string;
  rewardUnit: "XLM" | "PHP" | "USDC";
  type: OpportunityType;
  skill: OpportunitySkill;
  deadline: string;
  description: string;
  deliverablesText: string;
};

interface CreateGigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
  sponsorName?: string;
  sponsorWallet?: string;
  onGigCreated: (gig: Bounty) => void;
}

export function CreateGigModal({ isOpen, onClose, currentUserId, sponsorName, sponsorWallet, onGigCreated }: CreateGigModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<FormState>({
    title: "",
    org: "",
    rewardAmount: "",
    rewardUnit: "XLM",
    type: "bounty",
    skill: "dev",
    deadline: "",
    description: "",
    deliverablesText: "",
  });

  const minDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const resetForm = () => {
    setForm({
      title: "",
      org: "",
      rewardAmount: "",
      rewardUnit: "XLM",
      type: "bounty",
      skill: "dev",
      deadline: "",
      description: "",
      deliverablesText: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUserId) {
      toast.error("Please log in before creating a gig");
      return;
    }

    const deliverables = form.deliverablesText
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    if (deliverables.length === 0) {
      toast.error("Add at least one deliverable");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/gigs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: form.title,
          created_by_user_id: currentUserId,
          org: form.org,
          reward_amount: Number(form.rewardAmount),
          reward_unit: form.rewardUnit,
          type: form.type,
          skill: form.skill,
          deadline: form.deadline,
          description: form.description,
          deliverables,
          sponsor_name: sponsorName,
          sponsor_wallet: sponsorWallet,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const details = Array.isArray(data?.details)
          ? data.details.map((item: { message?: string }) => item.message).filter(Boolean).join(", ")
          : "";
        throw new Error(details || data?.error || "Failed to create gig");
      }

      const gig = data?.gig as Bounty | undefined;
      if (!gig) {
        throw new Error("Gig response was empty");
      }

      onGigCreated(gig);
      toast.success("Gig created successfully");
      resetForm();
      onClose();
    } catch (error) {
      toast.error("Could not create gig", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-[620px]">
        <DialogHeader>
          <DialogTitle>Create a New Gig</DialogTitle>
          <DialogDescription>Publish a bounty or project and make it visible on the opportunities list.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="gig-title">Gig title</Label>
            <Input
              id="gig-title"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Build Stellar payroll payout dashboard"
              required
              minLength={5}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor="gig-org">Organization</Label>
              <Input
                id="gig-org"
                value={form.org}
                onChange={(e) => setForm((prev) => ({ ...prev, org: e.target.value }))}
                placeholder="StellarEarn Labs"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="gig-prize">Reward amount</Label>
              <Input
                id="gig-prize"
                type="number"
                min={1}
                step={1}
                value={form.rewardAmount}
                onChange={(e) => setForm((prev) => ({ ...prev, rewardAmount: e.target.value }))}
                placeholder="50"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="gig-reward-unit">Reward unit</Label>
              <select
                id="gig-reward-unit"
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={form.rewardUnit}
                onChange={(e) => setForm((prev) => ({ ...prev, rewardUnit: e.target.value as "XLM" | "PHP" | "USDC" }))}
              >
                <option value="XLM">XLM</option>
                <option value="USDC">USDC</option>
                <option value="PHP">PHP</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor="gig-type">Type</Label>
              <select
                id="gig-type"
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={form.type}
                onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as OpportunityType }))}
              >
                <option value="bounty">Bounty</option>
                <option value="project">Project</option>
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="gig-skill">Skill</Label>
              <select
                id="gig-skill"
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={form.skill}
                onChange={(e) => setForm((prev) => ({ ...prev, skill: e.target.value as OpportunitySkill }))}
              >
                <option value="dev">Development</option>
                <option value="design">Design</option>
                <option value="content">Content</option>
                <option value="research">Other</option>
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="gig-deadline">Deadline</Label>
              <Input
                id="gig-deadline"
                type="date"
                min={minDate}
                value={form.deadline}
                onChange={(e) => setForm((prev) => ({ ...prev, deadline: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="gig-description">Description</Label>
            <textarea
              id="gig-description"
              className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the outcome you expect and acceptance criteria."
              required
              minLength={20}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="gig-deliverables">Deliverables (one per line)</Label>
            <textarea
              id="gig-deliverables"
              className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.deliverablesText}
              onChange={(e) => setForm((prev) => ({ ...prev, deliverablesText: e.target.value }))}
              placeholder={"Working app URL\nGitHub repo\nShort walkthrough video"}
              required
            />
          </div>

          <div className="mt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onClose();
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-stellar-yellow text-stellar-black hover:bg-stellar-yellow/90" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Gig"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
