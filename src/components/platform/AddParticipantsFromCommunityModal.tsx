"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { useDebounce } from "@/hooks/useDebounce";
import type { AvailableCommunityMember } from "@/lib/community-event-participants";
import { platformApiFetch } from "@/lib/platform-api-client";
import type { PaginatedResponse } from "@/lib/pagination";
import { cn } from "@/lib/cn";
import { toastError, toastSuccess } from "@/lib/toast";

interface AddParticipantsFromCommunityModalProps {
  open: boolean;
  eventId: string;
  eventTitle: string;
  onClose: () => void;
  onAdded: () => void;
}

export function AddParticipantsFromCommunityModal({
  open,
  eventId,
  eventTitle,
  onClose,
  onAdded,
}: AddParticipantsFromCommunityModalProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<PaginatedResponse<AvailableCommunityMember> | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const debouncedSearch = useDebounce(search, 400);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sortBy: "firstName",
        sortOrder: "asc",
      });
      if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());

      const data = await platformApiFetch<PaginatedResponse<AvailableCommunityMember>>(
        `/api/fg-admin/events/${eventId}/users/available-members?${params.toString()}`,
      );
      setResult(data);
    } catch (err) {
      setResult(null);
      toastError(
        "Failed to load community members",
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, eventId, limit, page]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [load, open]);

  useEffect(() => {
    if (!open) return;
    setPage(1);
  }, [debouncedSearch, open]);

  const reset = () => {
    setSearch("");
    setPage(1);
    setSelectedIds(new Set());
    setResult(null);
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const toggleMember = (memberId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (selectedIds.size === 0) {
      toastError("Select at least one member");
      return;
    }

    setSubmitting(true);
    try {
      const response = await platformApiFetch<{ added: number }>(
        `/api/fg-admin/events/${eventId}/users/from-community`,
        {
          method: "POST",
          body: JSON.stringify({ accountIds: [...selectedIds] }),
        },
      );
      toastSuccess(
        response.added === 1
          ? "Added 1 participant"
          : `Added ${response.added} participants`,
      );
      onAdded();
      handleClose();
    } catch (err) {
      toastError(
        "Failed to add participants",
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const members = result?.data ?? [];

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Add participant from community"
      description={`Choose existing community members to register for ${eventTitle}. Only participant accounts not already on this event are shown.`}
      className="max-w-2xl"
    >
      <div className="space-y-4">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, username, or email…"
        />

        <div className="max-h-[min(24rem,50vh)] overflow-y-auto rounded-xl border border-border">
          {loading ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : members.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No available community members found.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {members.map((member) => {
                const selected = selectedIds.has(member.id);
                return (
                  <li key={member.id}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-muted/60",
                        selected && "bg-muted/40",
                      )}
                      onClick={() => toggleMember(member.id)}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-border text-[10px]",
                          selected && "border-primary bg-primary text-primary-foreground",
                        )}
                        aria-hidden
                      >
                        {selected ? "✓" : ""}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-foreground">
                          {member.firstName} {member.lastName}
                        </span>
                        <span className="block text-sm text-muted-foreground">
                          @{member.username}
                          {member.email ? ` · ${member.email}` : ""}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {member.eventCount === 0
                            ? "Not registered for any event yet"
                            : `${member.eventCount} other event${member.eventCount === 1 ? "" : "s"}`}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {result && result.totalPages > 1 && (
          <Pagination
            currentPage={result.page}
            totalPages={result.totalPages}
            totalItems={result.total}
            itemsPerPage={limit}
            onPageChange={setPage}
          />
        )}

        <div className="flex items-center justify-between gap-3 pt-2">
          <p className="text-sm text-muted-foreground">
            {selectedIds.size === 0
              ? "Select members to add"
              : `${selectedIds.size} selected`}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting || selectedIds.size === 0}
            >
              {submitting ? "Adding…" : "Add to event"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
