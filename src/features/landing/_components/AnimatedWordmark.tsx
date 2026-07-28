"use client";

import { m } from "motion/react";
import { Fragment, memo } from "react";

import {
  BALL_DELAY,
  CHAR_DURATION,
  CHAR_STAGGER,
  LANDING_EASE,
  NAME_DELAY,
} from "@/features/landing/_lib/landing-motion";

import styles from "./LandingView.module.css";

const NAME_WORDS = ["Sungjoon", "Lee"];
const BALL_DUR = 1.15;
const BALL_KEYFRAMES = {
  y: [-220, 0, -78, 0, -24, 0],
  scaleY: [1, 0.55, 1.12, 0.74, 1.04, 1],
  scaleX: [1, 1.4, 0.9, 1.2, 0.97, 1],
};
const BALL_TIMES = [0, 0.3, 0.55, 0.72, 0.87, 1];
const BALL_EASE = [
  [0.55, 0, 1, 0.45],
  [0.15, 0.85, 0.3, 1],
  [0.55, 0, 1, 0.45],
  [0.15, 0.85, 0.3, 1],
  [0.55, 0, 1, 0.45],
] as [number, number, number, number][];
const CHAR_HIDDEN = { opacity: 0, y: 30, filter: "blur(16px)" };
const CHAR_SHOW = { opacity: 1, y: 0, filter: "blur(0px)" };
const DOT_HIDDEN = { opacity: 0, y: -220 };
const DOT_SHOW = { opacity: 1, ...BALL_KEYFRAMES };

const AnimatedWordmark = memo(function AnimatedWordmark({ started }: { started: boolean }) {
  let charIndex = 0;

  return (
    <h1 className={styles.name} aria-label="Sungjoon Lee.">
      {NAME_WORDS.map((word, wordIndex) => {
        const isLast = wordIndex === NAME_WORDS.length - 1;
        return (
          <Fragment key={word}>
            {wordIndex > 0 ? " " : null}
            <span className={styles.word}>
              {[...word].map((char) => {
                const delay = NAME_DELAY + charIndex * CHAR_STAGGER;
                charIndex += 1;
                return (
                  <m.span
                    key={`${word}-${delay}`}
                    className={`${styles.char}${started ? ` ${styles.charFlash}` : ""}`}
                    aria-hidden="true"
                    initial={CHAR_HIDDEN}
                    animate={started ? CHAR_SHOW : CHAR_HIDDEN}
                    transition={{ duration: CHAR_DURATION, ease: LANDING_EASE, delay }}
                    style={{ animationDelay: `${delay}s` }}
                  >
                    {char}
                  </m.span>
                );
              })}
              {isLast ? (
                <m.span
                  className={styles.dot}
                  aria-hidden="true"
                  initial={DOT_HIDDEN}
                  animate={started ? DOT_SHOW : DOT_HIDDEN}
                  transition={{
                    delay: BALL_DELAY,
                    duration: BALL_DUR,
                    times: BALL_TIMES,
                    ease: BALL_EASE,
                    opacity: { delay: BALL_DELAY, duration: 0.01 },
                  }}
                >
                  .
                </m.span>
              ) : null}
            </span>
          </Fragment>
        );
      })}
    </h1>
  );
});

export { AnimatedWordmark };
