interface ProgressBarProps {
  progress: number;
}

export default function ProgressBar({ progress }: ProgressBarProps) {
  return <div className="progress" style={{ width: `${progress}%` }} />;
}
