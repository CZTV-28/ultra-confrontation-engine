import "./UCButton.css";

interface UCButtonProps {
  text: string;
  onClick?: () => void;
  disabled?: boolean;
}

export default function UCButton({ text, onClick, disabled = false }: UCButtonProps) {
  return (
    <button
      className={`uc-button ${disabled ? "uc-button-disabled" : ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      {text}
    </button>
  );
}