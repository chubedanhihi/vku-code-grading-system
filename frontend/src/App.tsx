import { useCallback, useEffect, useRef, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import "./App.css";
import {
  aiApi,
  ApiError,
  authApi,
  judgeApi,
  leaderboardApi,
  loadStoredUser,
  onUnauthorized,
  problemsApi,
  saveStoredUser,
  submissionsApi,
  testCasesApi,
} from "./api/client";
import { AiAssistantModal } from "./components/AiAssistantModal";
import { Navbar } from "./components/Navbar";
import { SubmissionDetailModal } from "./components/SubmissionDetailModal";
import { getVerdictMeta, LANG_META } from "./constants/languages";
import { AddProblemPage } from "./pages/AddProblemPage";
import { AuthPage } from "./pages/AuthPage";
import { HomePage } from "./pages/HomePage";
import { LeaderboardPage } from "./pages/LeaderboardPage";
import { ProblemDetailPage } from "./pages/ProblemDetailPage";
import { ProblemsPage } from "./pages/ProblemsPage";
import type {
  AiAnalyzeResponse,
  Difficulty,
  JudgeStatus,
  Lang,
  LeaderboardEntry,
  Problem,
  Submission,
  TestCase,
  UserProfile,
  View,
} from "./types";

const TOAST_STYLE = {
  background: "#14161f",
  color: "#f4f4f5",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  fontSize: "0.875rem",
};

function App() {
  const [view, setView] = useState<View>("home");
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [connError, setConnError] = useState<string | null>(null);
  const [judgeStatus, setJudgeStatus] = useState<JudgeStatus | null>(null);

  const [user, setUser] = useState<UserProfile | null>(() => loadStoredUser());

  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [subFilter, setSubFilter] = useState<"all" | "my">("all");

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [lbLoading, setLbLoading] = useState(false);

  const [lang, setLang] = useState<Lang>("CPP");
  const [code, setCode] = useState(LANG_META.CPP.default);
  const [submitting, setSubmitting] = useState(false);
  const [judgingSub, setJudgingSub] = useState<Submission | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [detailSub, setDetailSub] = useState<Submission | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiData, setAiData] = useState<AiAnalyzeResponse | null>(null);
  const [aiTargetSub, setAiTargetSub] = useState<Submission | null>(null);

  const isTeacher = user?.role === "TEACHER" || user?.role === "ADMIN";

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Tự động xóa session hết hạn khi Backend trả 401
  useEffect(() => {
    onUnauthorized(() => {
      stopPolling();
      setJudgingSub(null);
      setUser(null);
      saveStoredUser(null);
      setSubmissions([]);
      toast.error("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.");
      setView("login");
    });
  }, [stopPolling]);

  const fetchProblems = useCallback(async () => {
    try {
      setLoading(true);
      setProblems(await problemsApi.list());
      setConnError(null);
    } catch (err) {
      setConnError(err instanceof ApiError ? err.message : "Không kết nối được Backend (port 8080).");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchJudgeStatus = useCallback(async () => {
    try {
      setJudgeStatus(await judgeApi.status());
    } catch {
      setJudgeStatus(null);
    }
  }, []);

  const fetchTestCases = useCallback(async (problemId: number) => {
    try {
      setTestCases(await testCasesApi.byProblem(problemId));
    } catch {
      /* ignore */
    }
  }, []);

  const fetchSubmissions = useCallback(
    async (problemId: number, filter: "all" | "my", currentUser: UserProfile | null) => {
      if (!currentUser) {
        setSubmissions([]);
        return;
      }
      try {
        const list =
          filter === "my"
            ? await submissionsApi.byProblemAndUser(problemId, currentUser.id)
            : await submissionsApi.byProblem(problemId);
        setSubmissions(list);
      } catch {
        /* ignore */
      }
    },
    []
  );

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLbLoading(true);
      setLeaderboard(await leaderboardApi.list());
    } catch {
      /* ignore */
    } finally {
      setLbLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProblems();
    fetchJudgeStatus();
    fetchLeaderboard();
    const timer = setInterval(fetchJudgeStatus, 15000);
    return () => clearInterval(timer);
  }, [fetchProblems, fetchJudgeStatus, fetchLeaderboard]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  // Auth handlers
  const handleLogin = async (username: string, password: string) => {
    try {
      const data = await authApi.login(username, password);
      if (!data.success || !data.token) {
        toast.error(data.message || "Đăng nhập thất bại.");
        return;
      }
      const profile: UserProfile = {
        id: data.id,
        username: data.username,
        email: data.email,
        role: data.role,
        token: data.token,
      };
      setUser(profile);
      saveStoredUser(profile);
      toast.success(`Xin chào ${profile.username}`);
      if (selectedProblem) {
        fetchTestCases(selectedProblem.id);
        fetchSubmissions(selectedProblem.id, subFilter, profile);
      }
      setView("problems");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Đăng nhập thất bại.");
    }
  };

  const handleRegister = async (payload: {
    username: string;
    email: string;
    password: string;
    role: "STUDENT" | "TEACHER";
    inviteCode?: string;
  }) => {
    try {
      const data = await authApi.register(payload);
      if (!data.success || !data.token) {
        toast.error(data.message || "Đăng ký thất bại.");
        return;
      }
      const profile: UserProfile = {
        id: data.id,
        username: data.username,
        email: data.email,
        role: data.role,
        token: data.token,
      };
      setUser(profile);
      saveStoredUser(profile);
      toast.success("Tạo tài khoản thành công.");
      setView("problems");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Đăng ký thất bại.");
    }
  };

  const handleLogout = () => {
    stopPolling();
    setJudgingSub(null);
    setUser(null);
    saveStoredUser(null);
    setSubmissions([]);
    if (selectedProblem) fetchTestCases(selectedProblem.id);
    toast.success("Đã đăng xuất.");
    setView("problems");
  };

  // Problem navigation
  const handleSelectProblem = (prob: Problem) => {
    setSelectedProblem(prob);
    setTestCases([]);
    setSubmissions([]);
    setSubFilter("all");
    setView("submit");
    fetchTestCases(prob.id);
    fetchSubmissions(prob.id, "all", user);
  };

  const handleLangChange = (next: Lang) => {
    setLang(next);
    setCode(LANG_META[next].default);
  };

  // Polling: tiếp tục khi PENDING hoặc RUNNING
  const startPolling = (initial: Submission, problemId: number) => {
    setJudgingSub(initial);
    stopPolling();

    pollingRef.current = setInterval(async () => {
      try {
        const sub = await submissionsApi.detail(initial.id);
        setJudgingSub(sub);
        if (sub.status !== "PENDING" && sub.status !== "RUNNING") {
          stopPolling();
          setJudgingSub(null);
          fetchSubmissions(problemId, subFilter, user);
          fetchJudgeStatus();

          const meta = getVerdictMeta(sub.status);
          const score =
            sub.totalTests && sub.totalTests > 0
              ? ` (${sub.passedTests ?? 0}/${sub.totalTests})`
              : "";
          if (sub.status === "ACCEPTED") {
            toast.success(`${meta.label}${score} — ${sub.executionTime} ms`);
          } else {
            toast.error(`${meta.label}${score}`);
          }
          setDetailSub(sub);
        }
      } catch {
        /* retry next tick */
      }
    }, 1000);
  };

  const handleSubmitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProblem || !code.trim() || submitting) return;
    if (!user) {
      toast.error("Vui lòng đăng nhập để nộp bài.");
      setView("login");
      return;
    }

    setSubmitting(true);
    try {
      const sub = await submissionsApi.submit({
        problemId: selectedProblem.id,
        language: lang,
        sourceCode: code,
      });
      fetchSubmissions(selectedProblem.id, subFilter, user);
      startPolling(sub, selectedProblem.id);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Không thể gửi bài nộp.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenSubDetail = async (id: number) => {
    setDetailLoading(true);
    setDetailSub(null);
    try {
      setDetailSub(await submissionsApi.detail(id));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Không tải được chi tiết bài nộp.");
    } finally {
      setDetailLoading(false);
    }
  };

  // Teacher actions
  const handleCreateProblem = async (payload: {
    title: string;
    description: string;
    difficulty: Difficulty;
    timeLimit: number;
    memoryLimit: number;
  }) => {
    try {
      await problemsApi.create(payload);
      await fetchProblems();
      setView("problems");
      toast.success("Đã tạo bài tập mới.");
      return true;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Lỗi khi tạo bài tập.");
      return false;
    }
  };

  const handleDeleteProblem = async (id: number) => {
    if (!confirm("Bạn có chắc muốn xóa bài tập này?")) return;
    try {
      await problemsApi.remove(id);
      await fetchProblems();
      if (selectedProblem?.id === id) {
        setSelectedProblem(null);
        setView("problems");
      }
      toast.success("Đã xóa bài tập.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Lỗi khi xóa bài tập.");
    }
  };

  const handleCreateTestCase = async (input: string, expectedOutput: string, isSample: boolean) => {
    if (!selectedProblem) return false;
    try {
      await testCasesApi.create({
        problemId: selectedProblem.id,
        input,
        expectedOutput,
        isSample,
      });
      await fetchTestCases(selectedProblem.id);
      toast.success("Đã thêm test case.");
      return true;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Lỗi khi thêm test case.");
      return false;
    }
  };

  const handleDeleteTestCase = async (id: number) => {
    try {
      await testCasesApi.remove(id);
      if (selectedProblem) await fetchTestCases(selectedProblem.id);
      toast.success("Đã xóa test case.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Lỗi khi xóa test case.");
    }
  };

  // AI Assistant
  const handleAskAi = async (sub?: Submission, customQuestion?: string) => {
    if (!selectedProblem) return;
    if (!user) {
      toast.error("Vui lòng đăng nhập để dùng Trợ lý AI.");
      setView("login");
      return;
    }
    const target = sub || submissions[0] || null;
    setAiTargetSub(target);
    setAiModalOpen(true);
    setAiLoading(true);
    try {
      const resp = await aiApi.analyze({
        problemTitle: selectedProblem.title,
        problemDescription: selectedProblem.description,
        language: target ? target.language : lang,
        sourceCode: target?.sourceCode || code,
        verdict: target ? target.status : "PENDING",
        errorMessage: target?.errorMessage || "",
        timeLimit: selectedProblem.timeLimit,
        memoryLimit: selectedProblem.memoryLimit,
        userQuestion: customQuestion || "",
      });
      setAiData(resp);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Không thể kết nối tới Trợ lý AI.");
      setAiModalOpen(false);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <Toaster position="top-right" toastOptions={{ style: TOAST_STYLE }} />

      <Navbar
        view={view}
        setView={setView}
        user={user}
        hasSelectedProblem={Boolean(selectedProblem)}
        judgeStatus={judgeStatus}
        onOpenLeaderboard={() => {
          setView("leaderboard");
          fetchLeaderboard();
        }}
        onLogout={handleLogout}
      />

      <main className="app-main">
        {view === "home" && (
          <HomePage
            user={user}
            problems={problems}
            leaderboard={leaderboard}
            judgeStatus={judgeStatus}
            onStartCoding={() => setView("problems")}
            onSelectProblem={handleSelectProblem}
            onOpenLeaderboard={() => {
              setView("leaderboard");
              fetchLeaderboard();
            }}
            onOpenLogin={() => setView("login")}
          />
        )}

        {view === "problems" && (
          <ProblemsPage
            problems={problems}
            loading={loading}
            connError={connError}
            selectedProblemId={selectedProblem?.id}
            isTeacher={isTeacher}
            onSelect={handleSelectProblem}
            onDelete={handleDeleteProblem}
          />
        )}

        {view === "submit" && selectedProblem && (
          <ProblemDetailPage
            problem={selectedProblem}
            user={user}
            testCases={testCases}
            submissions={submissions}
            subFilter={subFilter}
            lang={lang}
            code={code}
            submitting={submitting}
            judgingSub={judgingSub}
            onBack={() => setView("problems")}
            onLangChange={handleLangChange}
            onCodeChange={setCode}
            onSubmitCode={handleSubmitCode}
            onChangeSubFilter={(f) => {
              setSubFilter(f);
              fetchSubmissions(selectedProblem.id, f, user);
            }}
            onRefreshSubs={() => fetchSubmissions(selectedProblem.id, subFilter, user)}
            onOpenSubDetail={handleOpenSubDetail}
            onAskAi={(sub) => handleAskAi(sub)}
            onCreateTestCase={handleCreateTestCase}
            onDeleteTestCase={handleDeleteTestCase}
            onGoLogin={() => setView("login")}
          />
        )}

        {view === "leaderboard" && (
          <LeaderboardPage
            entries={leaderboard}
            loading={lbLoading}
            currentUserId={user?.id}
            onRefresh={fetchLeaderboard}
          />
        )}

        {view === "add-problem" && isTeacher && (
          <AddProblemPage
            onCreate={handleCreateProblem}
            onCancel={() => setView("problems")}
          />
        )}

        {(view === "login" || view === "register") && (
          <AuthPage
            mode={view}
            onSwitchMode={(m) => setView(m)}
            onLogin={handleLogin}
            onRegister={handleRegister}
          />
        )}
      </main>

      <SubmissionDetailModal
        submission={detailSub}
        loading={detailLoading}
        onClose={() => setDetailSub(null)}
        onAskAi={(sub) => handleAskAi(sub)}
      />

      <AiAssistantModal
        open={aiModalOpen}
        loading={aiLoading}
        data={aiData}
        problem={selectedProblem}
        targetSub={aiTargetSub}
        lang={lang}
        onClose={() => setAiModalOpen(false)}
        onAskQuestion={(q) => handleAskAi(aiTargetSub || undefined, q)}
      />
    </div>
  );
}

export default App;
