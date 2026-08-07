/** Shared score→style mapping so every surface bands ReadScore identically. */

export function scoreClass(score: number | null | undefined): string {
  if (score === null || score === undefined) return "";
  if (score >= 75) return "pill-good";
  if (score >= 55) return "pill-warn";
  return "pill-serious";
}

export function severityClass(severity: string): string {
  switch (severity) {
    case "high":
      return "sev-high";
    case "medium":
      return "sev-medium";
    case "low":
      return "sev-low";
    default:
      return "sev-ok";
  }
}

export function riskLabel(score: number | null | undefined): string {
  if (score === null || score === undefined) return "unknown";
  if (score >= 75) return "low";
  if (score >= 55) return "medium";
  return "high";
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
