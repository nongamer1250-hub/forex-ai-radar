import { SignalsPage } from "@/components/SignalsPage";
import { AuthGate } from "@/components/use-auth";

export default function SignalsRoute() {
  return (
    <AuthGate>
      <SignalsPage />
    </AuthGate>
  );
}
