import type { Metadata } from "next";
import { Suspense } from "react";
import { ContactsView } from "@/components/views/contacts";

export const metadata: Metadata = { title: "Contacts" };

export default function Page() {
  return (
    <Suspense>
      <ContactsView />
    </Suspense>
  );
}
