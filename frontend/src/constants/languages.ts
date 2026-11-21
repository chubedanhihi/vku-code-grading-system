import type { Lang } from "../types";

export const LANG_META: Record<Lang, { label: string; short: string; monacoLang: string; default: string }> = {
  CPP: {
    label: "C++ 17",
    short: "C++",
    monacoLang: "cpp",
    default: `#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    // Viết lời giải của bạn tại đây
    return 0;
}`,
  },
  C: {
    label: "C11",
    short: "C",
    monacoLang: "c",
    default: `#include <stdio.h>

int main() {
    // Viết lời giải của bạn tại đây
    return 0;
}`,
  },
  JAVA: {
    label: "Java 17",
    short: "Java",
    monacoLang: "java",
    default: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // Viết lời giải của bạn tại đây
    }
}`,
  },
  PYTHON: {
    label: "Python 3",
    short: "Python",
    monacoLang: "python",
    default: `# Viết lời giải của bạn tại đây
import sys
input = sys.stdin.readline
`,
  },
};

export interface VerdictMeta {
  label: string;
  short: string;
  tone: "success" | "danger" | "warning" | "info" | "muted";
}

export const VERDICT_META: Record<string, VerdictMeta> = {
  ACCEPTED: { label: "Accepted", short: "AC", tone: "success" },
  WRONG_ANSWER: { label: "Wrong Answer", short: "WA", tone: "danger" },
  TIME_LIMIT_EXCEEDED: { label: "Time Limit", short: "TLE", tone: "warning" },
  MEMORY_LIMIT_EXCEEDED: { label: "Memory Limit", short: "MLE", tone: "warning" },
  OUTPUT_LIMIT_EXCEEDED: { label: "Output Limit", short: "OLE", tone: "warning" },
  COMPILE_ERROR: { label: "Compile Error", short: "CE", tone: "danger" },
  RUNTIME_ERROR: { label: "Runtime Error", short: "RE", tone: "danger" },
  SYSTEM_ERROR: { label: "System Error", short: "SE", tone: "danger" },
  PENDING: { label: "Đang chờ", short: "PENDING", tone: "info" },
  RUNNING: { label: "Đang chấm", short: "RUNNING", tone: "info" },
  SKIPPED: { label: "Bỏ qua", short: "SKIP", tone: "muted" },
};

export function getVerdictMeta(status: string): VerdictMeta {
  return (
    VERDICT_META[status] ?? {
      label: status.replace(/_/g, " "),
      short: status,
      tone: "muted",
    }
  );
}
