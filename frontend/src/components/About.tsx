import { Reveal } from "@/components/motion";
import { ContactLetter, ContactReach } from "@/components/contact/ContactLetter";
import "./About.css";

/**
 * The public destination — About and Contact as one scene on the lit desk:
 * a short note about CloudBook on the left, a letter to write on the right.
 * Fits one viewport on desktop; stacks on mobile.
 */
export default function About() {
  return (
    <div className="about">
      <section id="contact" data-section className="about__scene" aria-label="Contact us">
        <div className="about__grid">
          <Reveal as="div" onView={false} className="about__intro">
            <p className="about__eyebrow">CloudBook</p>
            <h1 className="about__title">A calm place to keep your notes.</h1>
            <p className="about__lede">
              Write it down and it is on every device you own, laid out like paper on a lit
              desk — nothing to configure, nothing in the way.
            </p>
            <p className="about__note">
              You write on a diary page, tear it out, and it lands on the clipboard. Pick one
              up to read or edit it; put it back to let it go.
            </p>
            <div className="about__reach">
              <ContactReach />
            </div>
          </Reveal>

          <Reveal as="div" delay={0.1} className="about__letter">
            <p className="about__letter-label">Say hello</p>
            <ContactLetter />
          </Reveal>
        </div>
      </section>
    </div>
  );
}
