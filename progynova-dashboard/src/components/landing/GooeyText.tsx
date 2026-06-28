import * as React from "react";
import "./GooeyText.css";

interface GooeyTextProps {
  texts: string[];
  morphTime?: number;
  cooldownTime?: number;
  className?: string;
  textClassName?: string;
}

const DIRECTIONS = ["bottom", "top", "right", "left"];

// Cubic ease-in-out function for organic, fluid transition speed curves
const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

export function GooeyText({
  texts,
  morphTime = 1.0,
  cooldownTime = 2.0,
  className = "",
  textClassName = ""
}: GooeyTextProps) {
  const text1Ref = React.useRef<HTMLSpanElement>(null);
  const text2Ref = React.useRef<HTMLSpanElement>(null);

  // Helper to split a word into individual character spans
  const setWord = React.useCallback((el: HTMLSpanElement, word: string) => {
    el.innerHTML = "";
    word.split("").forEach((char) => {
      const span = document.createElement("span");
      if (char === " ") {
        span.textContent = "\u00A0";
        span.style.display = "inline-block";
        span.style.width = "0.32em"; // Clean typographic word spacing
      } else {
        span.textContent = char;
        span.style.display = "inline-block";
      }
      el.appendChild(span);
    });
  }, []);

  // Helper to calculate the inset clip-path based on the erasing direction and value (0-100)
  const getClipPath = React.useCallback((direction: string, val: number) => {
    if (direction === "bottom") return `inset(0px 0px ${val}% 0px)`;
    if (direction === "top") return `inset(${val}% 0px 0px 0px)`;
    if (direction === "right") return `inset(0px ${val}% 0px 0px)`;
    if (direction === "left") return `inset(0px 0px 0px ${val}%)`;
    return "none";
  }, []);

  React.useEffect(() => {
    if (texts.length === 0) return;

    // Initialize texts immediately on mount to prevent empty space
    if (text1Ref.current && text2Ref.current) {
      setWord(text1Ref.current, texts[0]);
      setWord(text2Ref.current, texts[1] || "");
      
      const t1Children = text1Ref.current.children;
      for (let i = 0; i < t1Children.length; i++) {
        const child = t1Children[i] as HTMLSpanElement;
        child.style.opacity = "100%";
        child.style.filter = "";
        child.style.clipPath = "none";
      }
      const t2Children = text2Ref.current.children;
      for (let i = 0; i < t2Children.length; i++) {
        const child = t2Children[i] as HTMLSpanElement;
        child.style.opacity = "0%";
        child.style.filter = "";
        child.style.clipPath = "none";
      }
    }

    let textIndex = texts.length - 1;
    let time = new Date();
    let morph = 0;
    let cooldown = 3.5; // Stay longer on initial ProgyNova AI load
    let animationFrameId: number;

    const setMorph = (fraction: number) => {
      if (text1Ref.current && text2Ref.current) {
        // Outgoing word (text1Ref): Staggered erasing from left to right
        const text1Children = text1Ref.current.children;
        const N1 = text1Children.length;
        for (let i = 0; i < N1; i++) {
          const child = text1Children[i] as HTMLSpanElement;
          const direction = DIRECTIONS[i % DIRECTIONS.length];
          const start = i * (0.35 / N1); // Stagger window
          const duration = 0.65; // Transition length
          const charFraction = Math.max(0, Math.min(1, (fraction - start) / duration));
          
          // Apply cubic easing
          const eased = easeInOutCubic(charFraction);
          
          child.style.filter = `blur(${eased * 8}px)`;
          child.style.opacity = `${(1 - eased) * 100}%`;
          child.style.clipPath = getClipPath(direction, eased * 100);
        }

        // Incoming word (text2Ref): Staggered write-in from right to left
        const text2Children = text2Ref.current.children;
        const N2 = text2Children.length;
        for (let i = 0; i < N2; i++) {
          const child = text2Children[i] as HTMLSpanElement;
          const direction = DIRECTIONS[i % DIRECTIONS.length];
          const start = (N2 - 1 - i) * (0.35 / N2); // Reverse stagger
          const duration = 0.65;
          const charFraction = Math.max(0, Math.min(1, (fraction - start) / duration));
          
          // Apply cubic easing
          const eased = easeInOutCubic(charFraction);
          
          child.style.filter = `blur(${(1 - eased) * 8}px)`;
          child.style.opacity = `${eased * 100}%`;
          child.style.clipPath = getClipPath(direction, (1 - eased) * 100);
        }
      }

      // Apply threshold gooey filter only during the transition
      const container = text1Ref.current?.parentElement;
      if (container) {
        container.style.filter = "url(#threshold)";
      }
    };

    const doCooldown = () => {
      morph = 0;
      if (text1Ref.current && text2Ref.current) {
        const text1Children = text1Ref.current.children;
        for (let i = 0; i < text1Children.length; i++) {
          const child = text1Children[i] as HTMLSpanElement;
          child.style.filter = "";
          child.style.opacity = "0%";
          child.style.clipPath = "none";
        }
        
        const text2Children = text2Ref.current.children;
        for (let i = 0; i < text2Children.length; i++) {
          const child = text2Children[i] as HTMLSpanElement;
          child.style.filter = "";
          child.style.opacity = "100%";
          child.style.clipPath = "none";
        }
      }

      // Disable threshold filter during cooldown to restore native subpixel anti-aliasing
      const container = text1Ref.current?.parentElement;
      if (container) {
        container.style.filter = "none";
      }
    };

    const doMorph = () => {
      morph -= cooldown;
      cooldown = 0;
      let fraction = morph / morphTime;

      if (fraction > 1) {
        fraction = 1;
        const nextTextIndex = (textIndex + 1) % texts.length;
        if (nextTextIndex === 0) {
          cooldown = 3.5; // Hold brand name for 3.5s
        } else {
          cooldown = cooldownTime; // Standard pause for other terms
        }
      }

      setMorph(fraction);
    };

    function animate() {
      animationFrameId = requestAnimationFrame(animate);
      const newTime = new Date();
      const shouldIncrementIndex = cooldown > 0;
      const dt = (newTime.getTime() - time.getTime()) / 1000;
      time = newTime;

      cooldown -= dt;

      if (cooldown <= 0) {
        if (shouldIncrementIndex) {
          textIndex = (textIndex + 1) % texts.length;
          if (text1Ref.current && text2Ref.current) {
            setWord(text1Ref.current, texts[textIndex % texts.length]);
            setWord(text2Ref.current, texts[(textIndex + 1) % texts.length]);
          }
        }
        doMorph();
      } else {
        doCooldown();
      }
    }

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [texts, morphTime, cooldownTime, setWord, getClipPath]);

  return (
    <div className={`gooey-wrapper ${className}`}>
      <svg className="gooey-svg-filter" aria-hidden="true" focusable="false">
        <defs>
          <filter id="threshold">
            <feColorMatrix
              in="SourceGraphic"
              type="matrix"
              values="1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 20 -6"
            />
          </filter>
        </defs>
      </svg>

      <div className="gooey-container">
        <span ref={text1Ref} className={`gooey-span ${textClassName}`} />
        <span ref={text2Ref} className={`gooey-span ${textClassName}`} />
      </div>
    </div>
  );
}
