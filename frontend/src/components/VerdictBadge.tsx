import { getVerdictMeta } from "../constants/languages";

interface VerdictBadgeProps {
  status: string;
  passedTests?: number;
  totalTests?: number;
  title?: string;
}

export function VerdictBadge({ status, passedTests, totalTests, title }: VerdictBadgeProps) {
  const meta = getVerdictMeta(status);
  const showScore =
    typeof passedTests === "number" &&
    typeof totalTests === "number" &&
    totalTests > 0 &&
    status !== "PENDING" &&
    status !== "RUNNING";

  return (
    <span className={`verdict-badge tone-${meta.tone}`} title={title}>
      {(status === "PENDING" || status === "RUNNING") && <span className="pulse-dot" />}
      <span>{meta.label}</span>
      {showScore && (
        <span className="verdict-score">
          {passedTests}/{totalTests}
        </span>
      )}
    </span>
  );
}
