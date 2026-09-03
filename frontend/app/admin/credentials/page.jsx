import { redirect } from "next/navigation";

/**
 * Credentials Page — digabung ke Vendors & Kredensial.
 * Redirect otomatis ke /admin/vendors.
 */
export default function CredentialsPage() {
  redirect("/admin/vendors");
}
