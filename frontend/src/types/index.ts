export type Role = "STUDENT" | "TEACHER" | "ADMIN";
export type Difficulty = "EASY" | "MEDIUM" | "HARD";
export type CheckerMode = "EXACT" | "FLOAT_1E6" | "FLOAT_1E4" | "TOKENS_IGNORE_CASE";
export type Lang = "C" | "CPP" | "JAVA" | "PYTHON";
export type View =
  | "home"
  | "problems"
  | "submit"
  | "add-problem"
  | "classrooms"
  | "contests"
  | "profile"
  | "login"
  | "register"
  | "leaderboard";

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
  checkerMode?: CheckerMode;
  tags?: string;
  studyPlan?: string;
  hasEditorial?: boolean;
  createdBy?: number;
  createdAt: string;
  totalSubmissions?: number;
  acceptedSubmissions?: number;
  acRate?: number;
  myStatus?: "SOLVED" | "ATTEMPTED" | "NONE";
}

export interface TestCase {
  id: number;
  problemId: number;
  input: string;
  expectedOutput: string;
  isSample: boolean;
  points?: number;
  subtask?: number;
}

export interface SubmissionResult {
  testIndex: number;
  verdict: string;
  timeMs: number;
  memoryKb: number;
  sample: boolean;
  message?: string | null;
  expectedOutput?: string | null;
  actualOutput?: string | null;
}

export interface Submission {
  id: number;
  userId: number;
  username?: string;
  problemId: number;
  contestId?: number | null;
  classroomId?: number | null;
  isLate?: boolean;
  language: string;
  sourceCode?: string;
  status: string;
  executionTime: number;
  memoryUsed: number;
  passedTests?: number;
  totalTests?: number;
  score?: number;
  maxScore?: number;
  errorMessage?: string;
  submittedAt: string;
  results?: SubmissionResult[];
}

export interface RunCustomResponse {
  verdict: string;
  timeMs: number;
  memoryKb: number;
  stdout?: string;
  stderr?: string;
  compileError?: string;
}

export interface PlagiarismMatch {
  userAId: number;
  userAName: string;
  submissionAId: number;
  userBId: number;
  userBName: string;
  submissionBId: number;
  language: string;
  similarityPercent: number;
}

export interface ContestProblemView {
  problemId: number;
  title: string;
  difficulty: Difficulty;
  timeLimit: number;
  memoryLimit: number;
  orderIndex: number;
  points: number;
}

export interface ContestView {
  id: number;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  status: "UPCOMING" | "RUNNING" | "ENDED";
  participantCount: number;
  problemCount: number;
  registered: boolean;
  problems?: ContestProblemView[];
}

export interface ContestStandingRow {
  rank: number;
  userId: number;
  username: string;
  solved: number;
  penaltyMinutes: number;
  cells: Record<number, { solved: boolean; wrongAttempts: number; solvedMinutes: number }>;
}

export interface ProfileStatsView {
  id: number;
  username: string;
  email: string;
  role: string;
  totalSubmissions: number;
  acceptedSubmissions: number;
  solvedCount: number;
  accuracyRate: number;
  languageBreakdown: Record<string, number>;
  dailyHeatmap: Record<string, number>;
  solvedProblems: Array<{ id: number; title: string; difficulty: Difficulty }>;
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
  broker?: string;
  ready: boolean;
  workers: number;
  running: number;
  pending: number;
}

export interface AssignmentView {
  id: number;
  problemId: number;
  title: string;
  difficulty: Difficulty;
  weekLabel: string;
  dueAt?: string | null;
  allowLate: boolean;
  overdue: boolean;
  myStatus: "SOLVED" | "LATE_SOLVED" | "ATTEMPTED" | "NONE";
}

export interface ClassroomView {
  id: number;
  name: string;
  description: string;
  joinCode: string;
  teacherId: number;
  teacherName: string;
  memberCount: number;
  assignmentCount: number;
  joined: boolean;
  assignments?: AssignmentView[];
}

export interface GradebookRow {
  userId: number;
  username: string;
  email: string;
  solvedCount: number;
  totalScore: number;
  statuses: Record<number, string>;
}

export interface ProblemCommentView {
  id: number;
  problemId: number;
  userId: number;
  username: string;
  role: string;
  content: string;
  likes?: number;
  liked?: boolean;
  createdAt: string;
}
