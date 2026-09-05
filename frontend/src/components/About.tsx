import { Reveal } from "@/components/motion";
import "./About.css";

/** Interim About — real composition in a later phase. */
export default function About() {
  return (
    <Reveal as="section" onView={false} className="about">
      <h1 className="about__title">CloudBook lets you save your notes on the cloud.</h1>
      <p className="about__lede">So you can get to them anytime you need.</p>
    </Reveal>
  );
}
