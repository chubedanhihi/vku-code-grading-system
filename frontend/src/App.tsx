import { useCallback, useEffect, useRef, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import "./App.css";
import {
  aiApi,
  ApiError,
  authApi,
  classroomsApi,
  contestsApi,
  judgeApi,
  leaderboardApi,
  loadStoredUser,
  onUnauthorized,
  problemsApi,
  profileApi,
  saveStoredUser,
  submissionsApi,
  testCasesApi,
} from "./api/client";
import { AiAssistantModal } from "./components/AiAssistantModal";
import { CommandPalette } from "./components/CommandPalette";
import { Navbar } from "./components/Navbar";
import { SubmissionDetailModal } from "./components/SubmissionDetailModal";
import { getVerdictMeta, LANG_META } from "./constants/languages";
import { AddProblemPage } from "./pages/AddProblemPage";
import { AuthPage } from "./pages/AuthPage";
import { ClassroomsPage } from "./pages/ClassroomsPage";
import { ContestsPage } from "./pages/ContestsPage";
import { HomePage } from "./pages/HomePage";
import { LeaderboardPage } from "./pages/LeaderboardPage";
import { ProblemDetailPage } from "./pages/ProblemDetailPage";
import { ProblemsPage } from "./pages/ProblemsPage";
import { ProfilePage } from "./pages/ProfilePage";
import type {
  AiAnalyzeResponse,
  CheckerMode,
  ClassroomView,
  ContestStandingRow,
  ContestView,
  Difficulty,
  GradebookRow,
  JudgeStatus,
  Lang,
  LeaderboardEntry,
  Problem,
  ProblemCommentView,
  ProfileStatsView,
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

const draftKey = (problemId: number, language: Lang) => `vku_draft_${problemId}_${language}`;

function App() {
  const [view, setView] = useState<View>("home");
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [connError, setConnError] = useState<string | null>(null);
  const [judgeStatus, setJudgeStatus] = useState<JudgeStatus | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const [user, setUser] = useState<UserProfile | null>(() => loadStoredUser());

  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [activeContestId, setActiveContestId] = useState<number | null>(null);
  const [activeClassroomId, setActiveClassroomId] = useState<number | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [comments, setComments] = useState<ProblemCommentView[]>([]);
  const [editorialInfo, setEditorialInfo] = useState<{ unlocked: boolean; editorial: string } | null>(null);
  const [subFilter, setSubFilter] = useState<"all" | "my">("all");

  const [classrooms, setClassrooms] = useState<ClassroomView[]>([]);
  const [classroomsLoading, setClassroomsLoading] = useState(false);
  const [selectedClassroom, setSelectedClassroom] = useState<ClassroomView | null>(null);
  const [gradebook, setGradebook] = useState<GradebookRow[]>([]);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [lbLoading, setLbLoading] = useState(false);

  const [contests, setContests] = useState<ContestView[]>([]);
  const [contestsLoading, setContestsLoading] = useState(false);
  const [selectedContest, setSelectedContest] = useState<ContestView | null>(null);
  const [contestStandings, setContestStandings] = useState<ContestStandingRow[]>([]);

  const [profile, setProfile] = useState<ProfileStatsView | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [lang, setLang] = useState<Lang>("CPP");
  const [code, setCode] = useState(LANG_META.CPP.default);
  const [submitting, setSubmitting] = useState(false);
  const [judgingSub, setJudgingSub] = useState<Submission | null>(null);
  const [liveProgress, setLiveProgress] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sseRef = useRef<EventSource | null>(null);

  const [detailSub, setDetailSub] = useState<Submission | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiData, setAiData] = useState<AiAnalyzeResponse | null>(null);
  const [aiTargetSub, setAiTargetSub] = useState<Submission | null>(null);

  const isTeacher = user?.role === "TEACHER" || user?.role === "ADMIN";

  const stopRealtime = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }
    setLiveProgress(null);
  }, []);

  useEffect(() => {
    onUnauthorized(() => {
      stopRealtime();
      setJudgingSub(null);
      setUser(null);
      saveStoredUser(null);
      setSubmissions([]);
      toast.error("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.");
      setView("login");
    });
  }, [stopRealtime]);

  // Global Ctrl+K Command Palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      } else if (e.key === "Escape") {
        setPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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

  const fetchContests = useCallback(async () => {
    try {
      setContestsLoading(true);
      setContests(await contestsApi.list());
    } catch {
      /* ignore */
    } finally {
      setContestsLoading(false);
    }
  }, []);

  const fetchClassrooms = useCallback(async () => {
    try {
      setClassroomsLoading(true);
      setClassrooms(await classroomsApi.list());
    } catch {
      /* ignore */
    } finally {
      setClassroomsLoading(false);
    }
  }, []);

  const fetchComments = useCallback(async (problemId: number) => {
    try {
      setComments(await problemsApi.comments(problemId));
    } catch {
      setComments([]);
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      setProfileLoading(true);
      setProfile(await profileApi.myProfile());
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Không tải được hồ sơ.");
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProblems();
    fetchJudgeStatus();
    fetchLeaderboard();
    const timer = setInterval(fetchJudgeStatus, 15000);
    return () => clearInterval(timer);
  }, [fetchProblems, fetchJudgeStatus, fetchLeaderboard]);

  useEffect(() => () => stopRealtime(), [stopRealtime]);

  // Auth
  const handleLogin = async (username: string, password: string) => {
    try {
      const data = await authApi.login(username, password);
      if (!data.success || !data.token) {
        toast.error(data.message || "Đăng nhập thất bại.");
        return;
      }
      const profileData: UserProfile = {
        id: data.id,
        username: data.username,
        email: data.email,
        role: data.role,
        token: data.token,
      };
      setUser(profileData);
      saveStoredUser(profileData);
      toast.success(`Xin chào ${profileData.username}`);
      fetchProblems();
      if (selectedProblem) {
        fetchTestCases(selectedProblem.id);
        fetchSubmissions(selectedProblem.id, subFilter, profileData);
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
      const profileData: UserProfile = {
        id: data.id,
        username: data.username,
        email: data.email,
        role: data.role,
        token: data.token,
      };
      setUser(profileData);
      saveStoredUser(profileData);
      toast.success("Tạo tài khoản thành công.");
      fetchProblems();
      setView("problems");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Đăng ký thất bại.");
    }
  };

  const handleLogout = () => {
    stopRealtime();
    setJudgingSub(null);
    setUser(null);
    saveStoredUser(null);
    setSubmissions([]);
    setProfile(null);
    fetchProblems();
    if (selectedProblem) fetchTestCases(selectedProblem.id);
    toast.success("Đã đăng xuất.");
    setView("home");
  };

  // Problem Selection + Draft restore
  const handleSelectProblem = (
    prob: Problem,
    contestId: number | null = null,
    classroomId: number | null = null
  ) => {
    setSelectedProblem(prob);
    setActiveContestId(contestId);
    setActiveClassroomId(classroomId);
    setTestCases([]);
    setSubmissions([]);
    setComments([]);
    setEditorialInfo(null);
    setSubFilter("all");
    const saved = localStorage.getItem(draftKey(prob.id, lang));
    setCode(saved ?? LANG_META[lang].default);
    setView("submit");
    fetchTestCases(prob.id);
    fetchSubmissions(prob.id, "all", user);
    fetchComments(prob.id);
  };

  const handleLangChange = (next: Lang) => {
    setLang(next);
    if (selectedProblem) {
      const saved = localStorage.getItem(draftKey(selectedProblem.id, next));
      setCode(saved ?? LANG_META[next].default);
    } else {
      setCode(LANG_META[next].default);
    }
  };

  const handleCodeChange = (nextCode: string) => {
    setCode(nextCode);
    if (selectedProblem) {
      localStorage.setItem(draftKey(selectedProblem.id, lang), nextCode);
    }
  };

  const handleResetCode = () => {
    const def = LANG_META[lang].default;
    setCode(def);
    if (selectedProblem) {
      localStorage.removeItem(draftKey(selectedProblem.id, lang));
    }
    toast("Đã khôi phục code mẫu.");
  };

  const finishJudging = useCallback(
    (sub: Submission, problemId: number) => {
      stopRealtime();
      setJudgingSub(null);
      fetchSubmissions(problemId, subFilter, user);
      fetchProblems();
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
    },
    [fetchJudgeStatus, fetchProblems, fetchSubmissions, stopRealtime, subFilter, user]
  );

  // Realtime SSE + Polling fallback
  const startRealtime = (initial: Submission, problemId: number) => {
    setJudgingSub(initial);
    stopRealtime();

    let settled = false;
    const startPollingFallback = () => {
      if (pollingRef.current || settled) return;
      pollingRef.current = setInterval(async () => {
        try {
          const sub = await submissionsApi.detail(initial.id);
          setJudgingSub(sub);
          if (sub.status !== "PENDING" && sub.status !== "RUNNING") {
            settled = true;
            finishJudging(sub, problemId);
          }
        } catch {
          /* retry */
        }
      }, 1200);
    };

    try {
      const es = new EventSource(submissionsApi.streamUrl(initial.id));
      sseRef.current = es;
      es.addEventListener("status", (e) => {
        try {
          const d = JSON.parse((e as MessageEvent).data) as { status: string };
          setLiveProgress(`Trạng thái: ${d.status}...`);
        } catch {
          /* ignore */
        }
      });
      es.addEventListener("test", (e) => {
        try {
          const d = JSON.parse((e as MessageEvent).data) as {
            testIndex: number;
            totalTests: number;
            verdict: string;
          };
          setLiveProgress(`Đang chấm test ${d.testIndex}/${d.totalTests} (${d.verdict})...`);
        } catch {
          /* ignore */
        }
      });
      es.addEventListener("complete", (e) => {
        if (settled) return;
        settled = true;
        const sub = JSON.parse((e as MessageEvent).data) as Submission;
        finishJudging(sub, problemId);
      });
      es.onerror = () => {
        es.close();
        sseRef.current = null;
        startPollingFallback();
      };
    } catch {
      startPollingFallback();
    }
  };

  const handleSubmitCode = async () => {
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
        contestId: activeContestId,
        classroomId: activeClassroomId,
        language: lang,
        sourceCode: code,
      });
      fetchSubmissions(selectedProblem.id, subFilter, user);
      startRealtime(sub, selectedProblem.id);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Không thể gửi bài nộp.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRunCustom = async (input: string) => {
    if (!selectedProblem) return null;
    try {
      return await submissionsApi.runCustom({
        problemId: selectedProblem.id,
        language: lang,
        sourceCode: code,
        input,
      });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Không thể chạy thử.");
      return null;
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

  // Teacher Problem & TestCase actions
  const handleCreateProblem = async (payload: {
    title: string;
    description: string;
    difficulty: Difficulty;
    timeLimit: number;
    memoryLimit: number;
    checkerMode: CheckerMode;
    tags: string;
    studyPlan: string;
    editorial: string;
  }) => {
    try {
      const created = await problemsApi.create(payload);
      await fetchProblems();
      handleSelectProblem(created);
      toast.success("Đã tạo bài tập! Hãy thêm ít nhất 1 test case để sinh viên nộp bài.");
      return true;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Lỗi khi tạo bài tập.");
      return false;
    }
  };

  const handleUpdateProblem = async (payload: {
    title: string;
    description: string;
    difficulty: Difficulty;
    timeLimit: number;
    memoryLimit: number;
    checkerMode: CheckerMode;
    tags: string;
    studyPlan: string;
    editorial: string;
  }) => {
    if (!selectedProblem) return false;
    try {
      const updated = await problemsApi.update(selectedProblem.id, payload);
      setSelectedProblem({ ...selectedProblem, ...updated });
      await fetchProblems();
      toast.success("Đã cập nhật đề bài.");
      return true;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Lỗi khi cập nhật bài tập.");
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

  const handleCreateTestCase = async (
    input: string,
    expectedOutput: string,
    isSample: boolean,
    points: number,
    subtask: number
  ) => {
    if (!selectedProblem) return false;
    try {
      await testCasesApi.create({
        problemId: selectedProblem.id,
        input,
        expectedOutput,
        isSample,
        points,
        subtask,
      });
      await fetchTestCases(selectedProblem.id);
      toast.success("Đã thêm test case.");
      return true;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Lỗi khi thêm test case.");
      return false;
    }
  };

  const handleUpdateTestCase = async (
    id: number,
    input: string,
    expectedOutput: string,
    isSample: boolean,
    points: number,
    subtask: number
  ) => {
    if (!selectedProblem) return false;
    try {
      await testCasesApi.update(id, { input, expectedOutput, isSample, points, subtask });
      await fetchTestCases(selectedProblem.id);
      toast.success("Đã cập nhật test case.");
      return true;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Lỗi khi sửa test case.");
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

  const handleImportZip = async (file: File) => {
    if (!selectedProblem) return;
    try {
      const res = await testCasesApi.importZip(selectedProblem.id, file);
      await fetchTestCases(selectedProblem.id);
      toast.success(`Đã import ${res.imported} test case từ file .zip.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Import zip thất bại.");
    }
  };

  // Classroom actions
  const handleSelectClassroom = async (id: number) => {
    try {
      const detail = await classroomsApi.detail(id);
      setSelectedClassroom(detail);
      if (isTeacher) {
        setGradebook(await classroomsApi.gradebook(id));
      } else {
        setGradebook([]);
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Không tải được thông tin lớp học.");
    }
  };

  // Contest actions
  const handleSelectContest = async (id: number) => {
    try {
      const [c, st] = await Promise.all([contestsApi.detail(id), contestsApi.standings(id)]);
      setSelectedContest(c);
      setContestStandings(st);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Không tải được thông tin kỳ thi.");
    }
  };

  // AI
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
      <Toaster position="bottom-right" toastOptions={{ style: TOAST_STYLE }} />

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
        onOpenClassrooms={() => {
          setSelectedClassroom(null);
          setView("classrooms");
          fetchClassrooms();
        }}
        onOpenContests={() => {
          setSelectedContest(null);
          setView("contests");
          fetchContests();
        }}
        onOpenProfile={() => {
          setView("profile");
          fetchProfile();
        }}
        onOpenPalette={() => setPaletteOpen(true)}
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
            onSelectProblem={(p) => handleSelectProblem(p)}
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
            user={user}
            onSelect={(p) => handleSelectProblem(p)}
            onDelete={handleDeleteProblem}
          />
        )}

        {view === "submit" && selectedProblem && (
          <ProblemDetailPage
            problem={selectedProblem}
            contestId={activeContestId}
            classroomId={activeClassroomId}
            user={user}
            testCases={testCases}
            submissions={submissions}
            comments={comments}
            editorialInfo={editorialInfo}
            subFilter={subFilter}
            lang={lang}
            code={code}
            submitting={submitting}
            judgingSub={judgingSub}
            liveProgress={liveProgress}
            onBack={() =>
              setView(activeContestId ? "contests" : activeClassroomId ? "classrooms" : "problems")
            }
            onLangChange={handleLangChange}
            onCodeChange={handleCodeChange}
            onResetCode={handleResetCode}
            onSubmitCode={handleSubmitCode}
            onRunCustom={handleRunCustom}
            onChangeSubFilter={(f) => {
              setSubFilter(f);
              fetchSubmissions(selectedProblem.id, f, user);
            }}
            onRefreshSubs={() => fetchSubmissions(selectedProblem.id, subFilter, user)}
            onOpenSubDetail={handleOpenSubDetail}
            onAskAi={(sub) => handleAskAi(sub)}
            onLoadEditorial={async () => {
              try {
                setEditorialInfo(await problemsApi.editorial(selectedProblem.id));
              } catch {
                setEditorialInfo({ unlocked: false, editorial: "" });
              }
            }}
            onAddComment={async (content) => {
              try {
                await problemsApi.addComment(selectedProblem.id, content);
                await fetchComments(selectedProblem.id);
                return true;
              } catch (err) {
                toast.error(err instanceof ApiError ? err.message : "Không thể gửi bình luận.");
                return false;
              }
            }}
            onDeleteComment={async (cid) => {
              try {
                await problemsApi.deleteComment(cid);
                await fetchComments(selectedProblem.id);
              } catch (err) {
                toast.error(err instanceof ApiError ? err.message : "Không thể xóa bình luận.");
              }
            }}
            onUpdateProblem={handleUpdateProblem}
            onCreateTestCase={handleCreateTestCase}
            onUpdateTestCase={handleUpdateTestCase}
            onDeleteTestCase={handleDeleteTestCase}
            onImportZip={handleImportZip}
            onExportZip={() => testCasesApi.exportZip(selectedProblem.id)}
            onGenerateTests={async (payload) => {
              try {
                const res = await testCasesApi.generate(selectedProblem.id, payload);
                await fetchTestCases(selectedProblem.id);
                toast.success(`Đã sinh tự động ${res.generated} test case.`);
                return true;
              } catch (err) {
                toast.error(err instanceof ApiError ? err.message : "Lỗi sinh test case.");
                return false;
              }
            }}
            onCheckPlagiarism={() => problemsApi.plagiarism(selectedProblem.id)}
            onGoLogin={() => setView("login")}
          />
        )}

        {view === "classrooms" && user && (
          <ClassroomsPage
            classrooms={classrooms}
            selectedClassroom={selectedClassroom}
            gradebook={gradebook}
            problems={problems}
            user={user}
            loading={classroomsLoading}
            onSelectClassroom={handleSelectClassroom}
            onBackToList={() => setSelectedClassroom(null)}
            onJoinByCode={async (joinCode) => {
              try {
                const joined = await classroomsApi.join(joinCode);
                toast.success(`Đã tham gia lớp "${joined.name}"`);
                fetchClassrooms();
                handleSelectClassroom(joined.id);
              } catch (err) {
                toast.error(err instanceof ApiError ? err.message : "Không thể tham gia lớp.");
              }
            }}
            onCreateClassroom={async (name, description) => {
              try {
                const c = await classroomsApi.create({ name, description });
                toast.success(`Đã tạo lớp "${c.name}" (Mã: ${c.joinCode})`);
                fetchClassrooms();
                return true;
              } catch (err) {
                toast.error(err instanceof ApiError ? err.message : "Tạo lớp thất bại.");
                return false;
              }
            }}
            onDeleteClassroom={async (id) => {
              if (!confirm("Xóa lớp học này?")) return;
              try {
                await classroomsApi.remove(id);
                toast.success("Đã xóa lớp học.");
                fetchClassrooms();
              } catch (err) {
                toast.error(err instanceof ApiError ? err.message : "Xóa thất bại.");
              }
            }}
            onAddAssignment={async (cid, payload) => {
              try {
                await classroomsApi.addAssignment(cid, payload);
                toast.success("Đã giao bài tập cho lớp.");
                handleSelectClassroom(cid);
                return true;
              } catch (err) {
                toast.error(err instanceof ApiError ? err.message : "Giao bài thất bại.");
                return false;
              }
            }}
            onRemoveAssignment={async (aid) => {
              try {
                await classroomsApi.removeAssignment(aid);
                toast.success("Đã gỡ bài tập khỏi lớp.");
                if (selectedClassroom) handleSelectClassroom(selectedClassroom.id);
              } catch (err) {
                toast.error(err instanceof ApiError ? err.message : "Xóa thất bại.");
              }
            }}
            onExportCsv={(cid) => classroomsApi.exportCsv(cid)}
            onOpenProblemInClass={(pid, cid) => {
              const p = problems.find((x) => x.id === pid);
              if (p) handleSelectProblem(p, null, cid);
            }}
          />
        )}

        {view === "contests" && (
          <ContestsPage
            contests={contests}
            selectedContest={selectedContest}
            standings={contestStandings}
            problems={problems}
            user={user}
            loading={contestsLoading}
            onSelectContest={handleSelectContest}
            onBackToList={() => setSelectedContest(null)}
            onRegister={async (id) => {
              try {
                await contestsApi.register(id);
                toast.success("Đăng ký kỳ thi thành công.");
                handleSelectContest(id);
              } catch (err) {
                toast.error(err instanceof ApiError ? err.message : "Đăng ký thất bại.");
              }
            }}
            onCreateContest={async (payload) => {
              try {
                await contestsApi.create(payload);
                toast.success("Đã tạo kỳ thi.");
                fetchContests();
                return true;
              } catch (err) {
                toast.error(err instanceof ApiError ? err.message : "Tạo kỳ thi thất bại.");
                return false;
              }
            }}
            onDeleteContest={async (id) => {
              if (!confirm("Xóa kỳ thi này?")) return;
              try {
                await contestsApi.remove(id);
                toast.success("Đã xóa kỳ thi.");
                fetchContests();
              } catch (err) {
                toast.error(err instanceof ApiError ? err.message : "Xóa thất bại.");
              }
            }}
            onOpenProblemInContest={(pid, cid) => {
              const p = problems.find((x) => x.id === pid);
              if (p) handleSelectProblem(p, cid);
            }}
          />
        )}

        {view === "profile" && user && (
          <ProfilePage
            profile={profile}
            loading={profileLoading}
            problems={problems}
            onSelectProblem={(p) => handleSelectProblem(p)}
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

      <CommandPalette
        open={paletteOpen}
        problems={problems}
        user={user}
        onClose={() => setPaletteOpen(false)}
        onNavigate={(v) => {
          if (v === "leaderboard") fetchLeaderboard();
          if (v === "contests") fetchContests();
          if (v === "classrooms") fetchClassrooms();
          if (v === "profile") fetchProfile();
          setView(v);
        }}
        onSelectProblem={(p) => handleSelectProblem(p)}
      />

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
