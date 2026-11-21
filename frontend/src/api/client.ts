import type {
  AiAnalyzeResponse,
  Difficulty,
  JudgeStatus,
  LeaderboardEntry,
  Problem,
  Role,
  Submission,
  TestCase,
  UserProfile,
} from "../types";

export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080/api";
const STORAGE_KEY = "vku_judge_user";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

let unauthorizedHandler: (() => void) | null = null;
export function onUnauthorized(handler: () => void) {
  unauthorizedHandler = handler;
}

export function loadStoredUser(): UserProfile | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<UserProfile>;
    // Yêu cầu phải có JWT token hợp lệ (bỏ session cũ không có token)
    if (!parsed || !parsed.token || !parsed.id || !parsed.username) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed as UserProfile;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function saveStoredUser(user: UserProfile | null) {
  if (user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const user = loadStoredUser();
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  if (user?.token) {
    headers.set("Authorization", `Bearer ${user.token}`);
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, "Không kết nối được tới máy chủ Backend (port 8080).");
  }

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const msg =
      typeof data === "object" && data !== null && "message" in data
        ? String((data as { message: unknown }).message)
        : `Lỗi máy chủ (HTTP ${res.status})`;

    if (res.status === 401 && unauthorizedHandler) {
      unauthorizedHandler();
    }
    throw new ApiError(res.status, msg);
  }

  return data as T;
}

export interface AuthPayload {
  success: boolean;
  message: string;
  id: number;
  username: string;
  email: string;
  role: Role;
  token: string;
}

export const authApi = {
  login: (username: string, password: string) =>
    request<AuthPayload>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  register: (payload: {
    username: string;
    email: string;
    password: string;
    role: "STUDENT" | "TEACHER";
    inviteCode?: string;
  }) =>
    request<AuthPayload>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

export const problemsApi = {
  list: () => request<Problem[]>("/problems"),
  create: (payload: {
    title: string;
    description: string;
    difficulty: Difficulty;
    timeLimit: number;
    memoryLimit: number;
  }) =>
    request<Problem>("/problems", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  remove: (id: number) =>
    request<void>(`/problems/${id}`, { method: "DELETE" }),
};

export const testCasesApi = {
  byProblem: (problemId: number) =>
    request<TestCase[]>(`/testcases/problem/${problemId}`),
  create: (payload: {
    problemId: number;
    input: string;
    expectedOutput: string;
    isSample: boolean;
  }) =>
    request<TestCase>("/testcases", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  remove: (id: number) =>
    request<void>(`/testcases/${id}`, { method: "DELETE" }),
};

export const submissionsApi = {
  byProblem: (problemId: number, size = 50) =>
    request<Submission[]>(`/submissions/problem/${problemId}?size=${size}`),
  byProblemAndUser: (problemId: number, userId: number, size = 50) =>
    request<Submission[]>(`/submissions/problem/${problemId}/user/${userId}?size=${size}`),
  detail: (id: number) => request<Submission>(`/submissions/${id}`),
  submit: (payload: { problemId: number; language: string; sourceCode: string }) =>
    request<Submission>("/submissions", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

export const leaderboardApi = {
  list: () => request<LeaderboardEntry[]>("/leaderboard"),
};

export const judgeApi = {
  status: () => request<JudgeStatus>("/judge/status"),
};

export const aiApi = {
  analyze: (payload: {
    problemTitle: string;
    problemDescription: string;
    language: string;
    sourceCode: string;
    verdict: string;
    errorMessage: string;
    timeLimit: number;
    memoryLimit: number;
    userQuestion: string;
  }) =>
    request<AiAnalyzeResponse>("/ai/analyze", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
