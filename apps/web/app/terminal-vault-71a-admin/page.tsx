import { AdminPage } from "@/components/AdminPage";
import { AuthGate } from "@/components/use-auth";

export default function AdminRoute() {
  return (
    <AuthGate requireAdmin>
      <AdminPage />
    </AuthGate>
  );
}
