import { OverviewPage } from "@/components/OverviewPage";
import { AuthGate } from "@/components/use-auth";

export default function HomePage() {
  return (
    <AuthGate>
      <OverviewPage />
    </AuthGate>
  );
}
