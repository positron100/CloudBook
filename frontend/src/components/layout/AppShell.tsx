import type { ReactNode } from "react";
import { ToastRegion } from "@/components/ui/ToastRegion";
import { DeskBackdrop } from "./DeskBackdrop";
import { TopNav } from "./TopNav";
import { BottomNav } from "./BottomNav";
import { Footer } from "./Footer";
import "./AppShell.css";

/**
 * The application frame: skip link, ambient backdrop, responsive navigation
 * (top bar ≥md / bottom bar <md), a centred main column, footer, and the toast
 * stack. Screens render into `children`.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <DeskBackdrop />
      <TopNav />
      <main id="main" className="app-shell__main container-px">
        {children}
      </main>
      <Footer />
      <BottomNav />
      <ToastRegion />
    </div>
  );
}
