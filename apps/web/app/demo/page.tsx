import { DemoPage } from "@/components/DemoPage";
import { AuthGate } from "@/components/use-auth";

export default function DemoRoute() {
  return (
    <AuthGate>
      <DemoPage />
    </AuthGate>
  );
}
