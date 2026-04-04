"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";

export function Footer() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: "0px 0px -20px 0px" });

  return (
    <motion.footer
      ref={ref}
      initial={{ opacity: 0, y: 12 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="border-t border-white/8 bg-transparent"
    >
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 sm:flex-row sm:px-6 lg:px-8">
        <motion.p
          initial={{ opacity: 0, x: -8 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.45, delay: 0.1, ease: "easeOut" }}
          className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground"
        >
          © 2026 PlayGroundAI. All rights reserved.
        </motion.p>
        <motion.p
          initial={{ opacity: 0, x: 8 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.45, delay: 0.18, ease: "easeOut" }}
          className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground"
        >
          Made by{" "}
          <a
            href="https://x.com/yajush_who"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground/60 transition-colors hover:text-foreground"
          >
            Yajush Srivastava
          </a>
        </motion.p>
      </div>
    </motion.footer>
  );
}
