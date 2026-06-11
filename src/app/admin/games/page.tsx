import { LatestEventScope } from "@/components/event/LatestEventScope";
import { GamesView } from "@/_views/admin/games/GamesView";

export default async function AdminGamesPage() {
  return (
    <LatestEventScope>
      <GamesView />
    </LatestEventScope>
  );
}
