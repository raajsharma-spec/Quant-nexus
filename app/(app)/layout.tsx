import { AppShell } from "@/components/AppShell";

/** Every page in this folder gets the sidebar and top bar. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
