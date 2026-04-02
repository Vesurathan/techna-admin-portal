import { redirect } from "next/navigation";

export default function LegacyPhotoLibraryRedirect() {
  redirect("/admin/drive");
}
