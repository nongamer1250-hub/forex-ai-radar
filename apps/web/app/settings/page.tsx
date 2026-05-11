import { SettingsPage } from "@/components/SettingsPage";
import { AuthGate } from "@/components/use-auth";

export default function SettingsRoute() {
  return (
    <AuthGate>
      <SettingsPage />
    </AuthGate>
  );
}
