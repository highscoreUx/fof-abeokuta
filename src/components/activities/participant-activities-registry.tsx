"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { hasCompletionGraceExpired } from "@/lib/activities/completion-grace";
import type { SpinnerStateSnapshot } from "@/lib/spinner/types";
import type { TicTacToeMatchSnapshot } from "@/lib/tic-tac-toe/types";
import type { QuizStateSnapshot } from "@/types";

export type CompletedActivityRecord =
  | {
      key: string;
      type: "kahoot";
      title: string;
      completedAt: number;
      sessionId: string;
      snapshot: QuizStateSnapshot;
    }
  | {
      key: string;
      type: "spinner";
      title: string;
      completedAt: number;
      sessionId: string;
      snapshot: SpinnerStateSnapshot;
    }
  | {
      key: string;
      type: "ttt";
      title: string;
      completedAt: number;
      matchId: string;
      snapshot: TicTacToeMatchSnapshot;
    }
  | {
      key: string;
      type: "survey";
      title: string;
      completedAt: number;
      surveyId: string;
    };

interface ParticipantActivitiesRegistryValue {
  records: CompletedActivityRecord[];
  registerCompleted: (record: CompletedActivityRecord) => void;
  completedRecords: CompletedActivityRecord[];
  graceRecords: CompletedActivityRecord[];
}

const ParticipantActivitiesRegistryContext =
  createContext<ParticipantActivitiesRegistryValue | null>(null);

function storageKey(eventSlug: string) {
  return `fof:completed-activities:${eventSlug}`;
}

function readStoredRecords(eventSlug: string): CompletedActivityRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(storageKey(eventSlug));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CompletedActivityRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredRecords(eventSlug: string, records: CompletedActivityRecord[]) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(storageKey(eventSlug), JSON.stringify(records));
  } catch {
    // ignore quota errors
  }
}

export function ParticipantActivitiesRegistryProvider({
  eventSlug,
  children,
}: {
  eventSlug: string;
  children: ReactNode;
}) {
  const [records, setRecords] = useState<CompletedActivityRecord[]>(() =>
    readStoredRecords(eventSlug),
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    writeStoredRecords(eventSlug, records);
  }, [eventSlug, records]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const registerCompleted = useCallback((record: CompletedActivityRecord) => {
    setRecords((prev) => {
      const existing = prev.find((item) => item.key === record.key);
      if (existing) return prev;
      return [record, ...prev];
    });
  }, []);

  const { completedRecords, graceRecords } = useMemo(() => {
    const completed: CompletedActivityRecord[] = [];
    const grace: CompletedActivityRecord[] = [];
    for (const record of records) {
      if (hasCompletionGraceExpired(record.completedAt, now)) {
        completed.push(record);
      } else {
        grace.push(record);
      }
    }
    return {
      completedRecords: completed.sort((a, b) => b.completedAt - a.completedAt),
      graceRecords: grace.sort((a, b) => b.completedAt - a.completedAt),
    };
  }, [records, now]);

  const value = useMemo(
    () => ({
      records,
      registerCompleted,
      completedRecords,
      graceRecords,
    }),
    [records, registerCompleted, completedRecords, graceRecords],
  );

  return (
    <ParticipantActivitiesRegistryContext.Provider value={value}>
      {children}
    </ParticipantActivitiesRegistryContext.Provider>
  );
}

export function useParticipantActivitiesRegistry() {
  const ctx = useContext(ParticipantActivitiesRegistryContext);
  if (!ctx) {
    throw new Error(
      "useParticipantActivitiesRegistry must be used within ParticipantActivitiesRegistryProvider",
    );
  }
  return ctx;
}
