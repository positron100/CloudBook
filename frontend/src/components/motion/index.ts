/**
 * CloudBook motion primitives. Components consume these — they do not
 * hand-write `initial`/`animate`/`transition` inline. Every primitive respects
 * prefers-reduced-motion internally (renders the final state, no animation).
 *
 * The LazyMotion boundary + feature set live in App.tsx.
 */
export { Reveal } from "./Reveal";
export { Stagger } from "./Stagger";
export { Pressable } from "./Pressable";
export { Magnetic } from "./Magnetic";
export { FadePresence } from "./FadePresence";
