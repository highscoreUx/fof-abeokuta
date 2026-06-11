"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { useEventApi } from "@/hooks/useEventApi";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardTitle } from "@/components/ui/card";
import type { QuizStateSnapshot } from "@/types";

interface Quiz {
  id: string;
  title: string;
  questions: Array<{ id: string; text: string }>;
  sessions: Array<{ id: string; state: string }>;
}

export function QuizAdmin() {
  const { slug, path, api } = useEventApi();
  const socket = useSocket();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [activeSession, setActiveSession] = useState<QuizStateSnapshot | null>(null);

  const load = () => api<{ quizzes: Quiz[] }>("/quizzes").then((d) => setQuizzes(d.quizzes));

  useEffect(() => {
    load();
  }, [slug]);

  useEffect(() => {
    if (!socket) return;
    socket.on("quiz:state", setActiveSession);
    return () => {
      socket.off("quiz:state", setActiveSession);
    };
  }, [socket]);

  const createQuiz = async () => {
    if (!newTitle.trim()) return;
    await api("/quizzes", { method: "POST", body: JSON.stringify({ title: newTitle }) });
    setNewTitle("");
    load();
  };

  const uploadQuestions = async (quizId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const token = useAuthStore.getState().accessToken;
    await globalThis.fetch(path(`/quizzes/${quizId}/questions`), {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    load();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle>Quiz Admin</CardTitle>
        <div className="mt-4 flex gap-2">
          <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Quiz title" />
          <Button onClick={createQuiz}>Create Quiz</Button>
        </div>
      </Card>

      {quizzes.map((quiz) => (
        <Card key={quiz.id}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold">{quiz.title}</h3>
              <p className="text-sm text-muted-foreground">{quiz.questions.length} questions</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="cursor-pointer">
                <span className="inline-flex rounded-lg border border-border px-4 py-2 text-sm">Upload CSV</span>
                <input
                  type="file"
                  accept=".csv,.xlsx"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadQuestions(quiz.id, file);
                  }}
                />
              </label>
              <Button onClick={() => socket?.emit("quiz:admin:start", quiz.id)}>Start Session</Button>
              {activeSession?.sessionId && (
                <>
                  <Button variant="secondary" onClick={() => socket?.emit("quiz:admin:next", activeSession.sessionId)}>
                    Next Question
                  </Button>
                  <Button variant="danger" onClick={() => socket?.emit("quiz:admin:end", activeSession.sessionId)}>
                    End Game
                  </Button>
                </>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
