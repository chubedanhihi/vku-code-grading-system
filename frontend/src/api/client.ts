import type {
  AiAnalyzeResponse,
  CheckerMode,
  ClassroomView,
  ContestStandingRow,
  ContestView,
  Difficulty,
  GradebookRow,
  JudgeStatus,
  LeaderboardEntry,
  PlagiarismMatch,
  Problem,
  ProblemCommentView,
  ProfileStatsView,
  Role,
  RunCustomResponse,
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
  const isForm = init.body instanceof FormData;
  if (!headers.has("Content-Type") && init.body && !isForm) {
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
    checkerMode?: CheckerMode;
    tags?: string;
    studyPlan?: string;
    editorial?: string;
  }) =>
    request<Problem>("/problems", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  update: (
    id: number,
    payload: {
      title: string;
      description: string;
      difficulty: Difficulty;
      timeLimit: number;
      memoryLimit: number;
      checkerMode: CheckerMode;
      tags?: string;
      studyPlan?: string;
      editorial?: string;
    }
  ) =>
    request<Problem>(`/problems/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  remove: (id: number) => request<void>(`/problems/${id}`, { method: "DELETE" }),
  plagiarism: (id: number) => request<PlagiarismMatch[]>(`/problems/${id}/plagiarism`),
  editorial: (id: number) => request<{ unlocked: boolean; editorial: string }>(`/problems/${id}/editorial`),
  comments: (id: number) => request<ProblemCommentView[]>(`/problems/${id}/comments`),
  addComment: (id: number, content: string) =>
    request<ProblemCommentView>(`/problems/${id}/comments`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
  deleteComment: (commentId: number) =>
    request<void>(`/problems/comments/${commentId}`, { method: "DELETE" }),
  likeComment: (commentId: number) =>
    request<{ commentId: number; likes: number; liked: boolean }>(`/problems/comments/${commentId}/like`, {
      method: "POST",
    }),
};

export const testCasesApi = {
  byProblem: (problemId: number) => request<TestCase[]>(`/testcases/problem/${problemId}`),
  create: (payload: {
    problemId: number;
    input: string;
    expectedOutput: string;
    isSample: boolean;
    points?: number;
    subtask?: number;
  }) =>
    request<TestCase>("/testcases", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  update: (
    id: number,
    payload: {
      input: string;
      expectedOutput: string;
      isSample: boolean;
      points?: number;
      subtask?: number;
    }
  ) =>
    request<TestCase>(`/testcases/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  remove: (id: number) => request<void>(`/testcases/${id}`, { method: "DELETE" }),
  importZip: (problemId: number, file: File, markFirstAsSample = true) => {
    const fd = new FormData();
    fd.append("file", file);
    return request<{ success: boolean; imported: number }>(
      `/testcases/problem/${problemId}/import-zip?markFirstAsSample=${markFirstAsSample}`,
      { method: "POST", body: fd }
    );
  },
  exportZip: async (problemId: number) => {
    const user = loadStoredUser();
    const res = await fetch(`${API_BASE}/testcases/problem/${problemId}/export-zip`, {
      headers: user?.token ? { Authorization: `Bearer ${user.token}` } : {},
    });
    if (!res.ok) throw new ApiError(res.status, "Không thể tải file zip test case.");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `problem-${problemId}-tests.zip`;
    a.click();
    URL.revokeObjectURL(url);
  },
  generate: (
    problemId: number,
    payload: {
      count: number;
      generatorLang: string;
      generatorCode: string;
      solutionLang: string;
      solutionCode: string;
      markFirstAsSample: boolean;
    }
  ) =>
    request<{ success: boolean; generated: number }>(`/testcases/problem/${problemId}/generate`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

export const submissionsApi = {
  byProblem: (problemId: number, size = 50) =>
    request<Submission[]>(`/submissions/problem/${problemId}?size=${size}`),
  byProblemAndUser: (problemId: number, userId: number, size = 50) =>
    request<Submission[]>(`/submissions/problem/${problemId}/user/${userId}?size=${size}`),
  byUser: (userId: number, size = 50) =>
    request<Submission[]>(`/submissions/user/${userId}?size=${size}`),
  detail: (id: number) => request<Submission>(`/submissions/${id}`),
  submit: (payload: {
    problemId: number;
    contestId?: number | null;
    classroomId?: number | null;
    language: string;
    sourceCode: string;
  }) =>
    request<Submission>("/submissions", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  runCustom: (payload: {
    problemId?: number;
    language: string;
    sourceCode: string;
    input: string;
  }) =>
    request<RunCustomResponse>("/submissions/run", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  streamUrl: (id: number) => {
    const token = loadStoredUser()?.token || "";
    return `${API_BASE}/submissions/${id}/stream?token=${encodeURIComponent(token)}`;
  },
};

export const contestsApi = {
  list: () => request<ContestView[]>("/contests"),
  detail: (id: number) => request<ContestView>(`/contests/${id}`),
  create: (payload: {
    title: string;
    description: string;
    startTime: string;
    endTime: string;
    problemIds: number[];
  }) =>
    request<ContestView>("/contests", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  remove: (id: number) => request<void>(`/contests/${id}`, { method: "DELETE" }),
  register: (id: number) =>
    request<{ success: boolean; message: string }>(`/contests/${id}/register`, { method: "POST" }),
  standings: (id: number) => request<ContestStandingRow[]>(`/contests/${id}/standings`),
};

export const profileApi = {
  myProfile: () => request<ProfileStatsView>("/users/me/profile"),
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

export const classroomsApi = {
  list: () => request<ClassroomView[]>("/classrooms"),
  detail: (id: number) => request<ClassroomView>(`/classrooms/${id}`),
  create: (payload: { name: string; description: string }) =>
    request<ClassroomView>("/classrooms", { method: "POST", body: JSON.stringify(payload) }),
  join: (joinCode: string) =>
    request<ClassroomView>("/classrooms/join", { method: "POST", body: JSON.stringify({ joinCode }) }),
  addAssignment: (
    classroomId: number,
    payload: { problemId: number; weekLabel: string; dueAt?: string | null; allowLate: boolean }
  ) =>
    request(`/classrooms/${classroomId}/assignments`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  removeAssignment: (assignmentId: number) =>
    request<void>(`/classrooms/assignments/${assignmentId}`, { method: "DELETE" }),
  remove: (id: number) => request<void>(`/classrooms/${id}`, { method: "DELETE" }),
  gradebook: (id: number) => request<GradebookRow[]>(`/classrooms/${id}/gradebook`),
  exportCsv: async (id: number) => {
    const user = loadStoredUser();
    const res = await fetch(`${API_BASE}/classrooms/${id}/export-csv`, {
      headers: user?.token ? { Authorization: `Bearer ${user.token}` } : {},
    });
    if (!res.ok) throw new ApiError(res.status, "Không thể xuất bảng điểm CSV.");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `classroom-${id}-grades.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
