import { useEffect, useRef } from "react";
import "./UCCursor.css";

export default function UCCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const targetPos = useRef({ x: 0, y: 0 });
  const currentPos = useRef({ x: 0, y: 0 });
  const hueRef = useRef(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      targetPos.current = { x: e.clientX, y: e.clientY };
      hueRef.current = (hueRef.current + 2) % 360;
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;

    const animate = () => {
      currentPos.current.x += (targetPos.current.x - currentPos.current.x) * 0.3;
      currentPos.current.y += (targetPos.current.y - currentPos.current.y) * 0.3;

      const hue = hueRef.current;
      const color = `hsl(${hue}, 100%, 50%)`;

      cursor.style.left = currentPos.current.x + "px";
      cursor.style.top = currentPos.current.y + "px";
      cursor.style.color = color;
      cursor.style.textShadow = `
        0 0 8px ${color},
        0 0 16px ${color},
        0 0 24px ${color}
      `;

      frameRef.current = requestAnimationFrame(animate);
    };

    const frameRef = { current: requestAnimationFrame(animate) };
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  return (
    <div
      ref={cursorRef}
      className="uc-cursor"
    >
      ♥
    </div>
  );
}
