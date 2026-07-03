import "./UCPanel.css";

interface UCPanelProps {
  children: React.ReactNode;
  width?: string;
  padding?: string;
}

export default function UCPanel({
  children,
  width = "900px",
  padding = "60px",
}: UCPanelProps) {
  return (
    <div
      className="uc-panel"
      style={{ width, padding }}
    >
      {children}
    </div>
  );
}