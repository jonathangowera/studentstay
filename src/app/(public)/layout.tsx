import { PublicHeader } from "@/components/shell/PublicHeader";
import { PublicFooter } from "@/components/shell/PublicFooter";

/** Everything under (public) is readable by signed-out visitors (PRD FR3.8). */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicHeader />
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <PublicFooter />
    </>
  );
}
