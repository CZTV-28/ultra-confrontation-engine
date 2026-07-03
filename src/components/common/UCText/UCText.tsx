import { useState, useEffect } from "react";
import "./UCText.css";

interface UCTextProps {
  text: string;
  speed?: number;
  delay?: number;
  onComplete?: () => void;
  className?: string;
}

export default function UCText({
  text,
  speed = 50,
  delay = 0,
  onComplete,
  className = "",
}: UCTextProps) {
  const [displayedLength, setDisplayedLength] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const delayTimer = setTimeout(() => {
      setHasStarted(true);
    }, delay);

    return () => clearTimeout(delayTimer);
  }, [delay]);

  useEffect(() => {
    if (!hasStarted) return;
    if (displayedLength >= text.length) {
      onComplete?.();
      return;
    }

    const timer = setTimeout(() => {
      setDisplayedLength((prev) => prev + 1);
    }, speed);

    return () => clearTimeout(timer);
  }, [hasStarted, displayedLength, text.length, speed, onComplete]);

  return (
    <span className={`uc-text ${className}`}>
      {text.slice(0, displayedLength)}
      <span className="uc-text-cursor">|</span>
    </span>
  );
}
