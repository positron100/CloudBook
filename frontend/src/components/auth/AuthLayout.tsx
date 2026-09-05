import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Surface } from "@/components/ui";
import { Reveal } from "@/components/motion";
import "./AuthLayout.css";

interface AuthLayoutProps {
  pitch: string;
  pitchSub: string;
  children: ReactNode;
}

/**
 * The shared lit-desk composition for login / register: an editorial brand
 * column beside the form card, both framed by the global DeskBackdrop. Stacks
 * to a single column below md.
 */
export function AuthLayout({ pitch, pitchSub, children }: AuthLayoutProps) {
  return (
    <div className="auth">
      <Reveal as="div" onView={false} className="auth__brand">
        <Link to="/" className="auth__wordmark">
          cloudbook
        </Link>
        <h1 className="auth__pitch">{pitch}</h1>
        <p className="auth__pitch-sub">{pitchSub}</p>
      </Reveal>

      <Reveal as="div" onView={false} delay={0.06} className="auth__card-wrap">
        <Surface level={4} as="section" className="auth__card">
          {children}
        </Surface>
      </Reveal>
    </div>
  );
}
