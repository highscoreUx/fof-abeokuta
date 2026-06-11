import { LatestEventScope } from "@/components/event/LatestEventScope";
import { QuizView } from "@/_views/admin/quiz/QuizView";

export default async function AdminQuizPage() {
  return (
    <LatestEventScope>
      <QuizView />
    </LatestEventScope>
  );
}
