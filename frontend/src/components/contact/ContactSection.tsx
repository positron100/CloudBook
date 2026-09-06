import { Reveal } from "@/components/motion";
import { ContactLetter } from "./ContactLetter";
import "./ContactSection.css";

/** The Contact section for the public pages — a short note on a lit desk. */
export function ContactSection() {
  return (
    <section id="contact" data-section className="contact-section">
      <div className="contact-section__inner">
        <Reveal as="div" className="contact-section__intro">
          <p className="contact-section__eyebrow">Contact</p>
          <h2 className="contact-section__title">Leave a note.</h2>
          <p className="contact-section__lede">
            A question, a bug, an idea for the desk — write it down and it comes straight to us.
          </p>
        </Reveal>

        <Reveal as="div" delay={0.1}>
          <ContactLetter />
        </Reveal>
      </div>
    </section>
  );
}
