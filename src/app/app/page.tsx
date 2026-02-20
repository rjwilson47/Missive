/**
 * @file src/app/app/page.tsx
 * /app — redirects to /app/unopened (default mailbox view).
 */

import { redirect } from "next/navigation";

export default function AppIndexPage() {
  redirect("/app/unopened");
}
