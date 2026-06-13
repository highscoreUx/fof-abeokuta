"use client";

import { Card, CardTitle } from "@/components/ui/card";
import { QuizFinishedResults } from "@/components/quiz/QuizFinishedResults";
import { SpinnerFinishedResults } from "@/components/spinner/SpinnerFinishedResults";
import { TttFinishedResults } from "@/components/tic-tac-toe/TttFinishedResults";
import type { CompletedActivityRecord } from "@/components/activities/participant-activities-registry";
import { useAuth } from "@/hooks/useAuth";

function SurveyResultsCard({ title }: { title: string }) {
  return (
    <Card className="p-6">
      <CardTitle>{title}</CardTitle>
      <p className="mt-2 text-sm text-muted-foreground">
        Your response was submitted. This survey is now closed.
      </p>
    </Card>
  );
}

export function CompletedActivityCards({ records }: { records: CompletedActivityRecord[] }) {
  const { user } = useAuth();

  if (records.length === 0) {
    return (
      <Card>
        <CardTitle>No completed activities</CardTitle>
        <p className="mt-2 text-sm text-muted-foreground">
          Finished activities and results will show up here.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {records.map((record) => {
        if (record.type === "kahoot") {
          return (
            <QuizFinishedResults
              key={record.key}
              state={record.snapshot}
              highlightUserId={user?.id}
            />
          );
        }
        if (record.type === "spinner") {
          return <SpinnerFinishedResults key={record.key} snapshot={record.snapshot} />;
        }
        if (record.type === "ttt") {
          return <TttFinishedResults key={record.key} snapshot={record.snapshot} />;
        }
        return <SurveyResultsCard key={record.key} title={record.title} />;
      })}
    </div>
  );
}
