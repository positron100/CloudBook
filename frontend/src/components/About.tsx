import { Reveal } from "@/components/motion";
import { ContactSection } from "@/components/contact/ContactSection";
import { ScrollAffordance } from "@/components/ScrollAffordance";
import { useSectionNav } from "@/hooks/useSectionNav";
import "./About.css";

/** The public landing — a short sequence of sections on the lit desk. */
export default function About() {
  const { atEnd, goNext } = useSectionNav();

  return (
    <div className="about">
      <section id="top" data-section className="about__hero">
        <Reveal as="div" onView={false} className="about__hero-inner">
          <p className="about__eyebrow">CloudBook</p>
          <h1 className="about__title">A calm place to keep your notes.</h1>
          <p className="about__lede">
            Write it down and it is on every device you own, laid out like paper on a lit
            desk — nothing to configure, nothing in the way.
          </p>
        </Reveal>
      </section>

      <ContactSection />

      <ScrollAffordance visible={!atEnd} onClick={goNext} />
    </div>
  );
}
