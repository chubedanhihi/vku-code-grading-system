export type Role = "STUDENT" | "TEACHER" | "ADMIN";
export type Difficulty = "EASY" | "MEDIUM" | "HARD";
export type Lang = "C" | "CPP" | "JAVA" | "PYTHON";
export type View = "problems" | "submit" | "add-problem" | "login" | "register" | "leaderboard";

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  role: Role;
  token: string;
}

export interface Problem {
  id: number;
  title: string;
  description: string;
  difficulty: Difficulty;
  timeLimit: number;
  memoryLimit: number;
  createdBy?: number;
  createdAt: string;
}

export interface TestCase {
  id: number;
  problemId: number;
  input: string;
  expectedOutput: string;
  isSample: boolean;
}

export interface SubmissionResult {
  testIndex: number;
  verdict: string;
  timeMs: number;
  memoryKb: number;
  sample: boolean;
  message?: string | null;
}

export interface Submission {
  id: number;
  userId: number;
  username?: string;
  problemId: number;
  language: string;
  sourceCode?: string;
  status: string;
  executionTime: number;
  memoryUsed: number;
  passedTests?: number;
  totalTests?: number;
  errorMessage?: string;
  submittedAt: string;
  results?: SubmissionResult[];
}

export interface LeaderboardEntry {
  rank: number;
  userId: number;
  username: string;
  email: string;
  role: string;
  solvedCount: number;
  totalSubmissions: number;
  acceptedSubmissions: number;
  accuracyRate: number;
  totalScore: number;
  tier: "MASTER" | "GOLD" | "SILVER" | "BRONZE";
}

export interface AiAnalyzeResponse {
  success: boolean;
  modelName: string;
  diagnosis: string;
  hints: string[];
  timeComplexity: string;
  spaceComplexity: string;
  optimizationTips: string;
  detailedAnalysis: string;
}

export interface JudgeStatus {
  sandbox: string;
  ready: boolean;
  workers: number;
  running: number;
  pending: number;
}
