import { useEffect, useState } from "react";
import "./UCMenuItem.css";

interface UCMenuItemProps {
  text: string;
  isSelected: boolean;
  index: number;
  onClick?: () => void;
  onMouseEnter?: () => void;
}

export default function UCMenuItem({
  text,
  isSelected,
  index,
  onClick,
  onMouseEnter,
}: UCMenuItemProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true);
    }, index * 150);
    return () => clearTimeout(timer);
  }, [index]);

  return (
    <div
      className={`uc-menu-item ${isSelected ? "uc-menu-item-selected" : ""} ${
        visible ? "uc-menu-item-visible" : ""
      }`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
    >
      <span className="uc-menu-cursor">
        {isSelected ? "♥" : " "}
      </span>
      <span className="uc-menu-text">{text}</span>
    </div>
  );
}