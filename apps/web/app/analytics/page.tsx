import { AnalyticsPage } from "@/components/AnalyticsPage";
import { AuthGate } from "@/components/use-auth";

export default function AnalyticsRoute() {
  return (
    <AuthGate>
      <AnalyticsPage />
    </AuthGate>
  );
}
