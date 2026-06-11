import { EventScopeProvider } from "@/contexts/EventScopeContext";
import { QuizView } from "@/_views/admin/quiz/QuizView";

export default async function AdminQuizPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = await params;

  return (
    <EventScopeProvider eventSlug={eventSlug} pathPrefix={`/${eventSlug}`}>
      <QuizView />
    </EventScopeProvider>
  );
}
