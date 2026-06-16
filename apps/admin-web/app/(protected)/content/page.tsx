import ModulePage from "../../../components/module-page";
import ProtectedModule from "../../../components/protected-module";

export default function ContentPage() {
  return (
    <ProtectedModule allowedRoles={["SUPER_ADMIN", "ADMIN", "MODERATOR"]}>
      <ModulePage
        title="Content Moderation"
        description="Moderate and manage announcements, clips, eBooks, and policies."
        endpointPlaceholder="GET /announcements, /clips, /ebooks, /policies"
      />
    </ProtectedModule>
  );
}
