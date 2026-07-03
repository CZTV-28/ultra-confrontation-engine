import "./UCWindow.css";

interface UCWindowProps {
  children: React.ReactNode;
}

export default function UCWindow({ children }: UCWindowProps) {
  return (
    <div className="uc-window">
      {children}
    </div>
  );
}