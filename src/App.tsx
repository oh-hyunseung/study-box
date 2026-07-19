import React, { useState, useEffect } from "react";
import { 
  BookOpen, Compass, Search, Sparkles, Brain, PenTool, CheckCircle2, 
  HelpCircle, Award, History, Clock, ArrowRight, ExternalLink, 
  BookMarked, RotateCcw, FileText, AlertCircle, Trash2, Star,
  GraduationCap, Check, HelpCircle as QuizIcon, Download, Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import { StudySession, Citation, Presets } from "./types";

const CURATED_PRESETS: Presets[] = [
  {
    id: "preset-1",
    subject: "수학",
    difficulty: "초등학교",
    unit: "분수의 곱셈과 나눗셈",
    unclearPart: "분수끼리 곱하거나 나눌 때 왜 분모는 분모끼리, 분자는 분자끼리 곱하고, 나눗셈은 뒤집어서 곱하는지 원리가 헷갈려요.",
    icon: "🧮"
  },
  {
    id: "preset-2",
    subject: "과학",
    difficulty: "중학교",
    unit: "세포의 구조와 기능",
    unclearPart: "식물세포와 동물세포의 결정적인 차이점이 무엇이고, 미토콘드리아와 엽록체는 각각 어떤 역할을 담당하나요?",
    icon: "🔬"
  },
  {
    id: "preset-3",
    subject: "사회",
    difficulty: "중학교",
    unit: "민주 정치의 원리와 삼권 분립",
    unclearPart: "입법부, 사법부, 행정부가 서로를 견제하는 구체적인 수단(거부권, 탄핵소추권 등)과 삼권 분립을 하는 궁극적인 이유가 궁금해요.",
    icon: "⚖️"
  },
  {
    id: "preset-4",
    subject: "영어",
    difficulty: "고등학교",
    unit: "가정법 과거와 과거완료",
    unclearPart: "가정법 과거와 가정법 과거완료의 시제 표현 형태가 헷갈리고, 실제 직설법 문장으로 전환할 때 시제를 어떻게 맞춰야 하나요?",
    icon: "🔤"
  },
  {
    id: "preset-5",
    subject: "과학",
    difficulty: "고등학교",
    unit: "뉴턴의 운동 법칙",
    unclearPart: "관성의 법칙, 가속도의 법칙, 작용 반작용의 법칙이 실생활에서 어떻게 각각 적용되는지 예시를 들어 이해하고 싶어요.",
    icon: "🌌"
  }
];

const splitResponse = (text: string) => {
  const regex = /(###\s*(?:💡\s*)?5(?:\.|\b))/;
  const parts = text.split(regex);
  if (parts.length >= 3) {
    const mainContent = parts[0];
    const explanationContent = parts.slice(1).join("");
    return { mainContent, explanationContent };
  }
  
  const altRegex = /(###\s*(?:💡\s*)?(?:단계별\s*)?상세\s*해설)/;
  const altParts = text.split(altRegex);
  if (altParts.length >= 3) {
    const mainContent = altParts[0];
    const explanationContent = altParts.slice(1).join("");
    return { mainContent, explanationContent };
  }

  return { mainContent: text, explanationContent: "" };
};

export default function App() {
  // Input fields
  const [subject, setSubject] = useState("");
  const [unit, setUnit] = useState("");
  const [difficulty, setDifficulty] = useState("중학교");
  const [unclearPart, setUnclearPart] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [currentSession, setCurrentSession] = useState<StudySession | null>(null);
  const [historyList, setHistoryList] = useState<StudySession[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Active learning summary state
  const [studentSummary, setStudentSummary] = useState("");
  const [checkingSummary, setCheckingSummary] = useState(false);
  const [summaryFeedback, setSummaryFeedback] = useState<{
    score: number;
    feedbackText: string;
    keyPointsMissed: string[];
  } | null>(null);

  // Interactive quiz state
  const [q1Answer, setQ1Answer] = useState("");
  const [q2Answer, setQ2Answer] = useState("");
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Load history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("education_box_history");
    if (saved) {
      try {
        setHistoryList(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Save history helper
  const saveToHistory = (newSession: StudySession) => {
    const updated = [newSession, ...historyList.filter(s => s.id !== newSession.id)].slice(0, 50);
    setHistoryList(updated);
    localStorage.setItem("education_box_history", JSON.stringify(updated));
  };

  // Delete from history helper
  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = historyList.filter(s => s.id !== id);
    setHistoryList(updated);
    localStorage.setItem("education_box_history", JSON.stringify(updated));
    if (currentSession?.id === id) {
      setCurrentSession(null);
      setStudentSummary("");
      setSummaryFeedback(null);
      setQ1Answer("");
      setQ2Answer("");
      setQuizSubmitted(false);
    }
  };

  // Apply curated preset
  const applyPreset = (preset: Presets) => {
    setSubject(preset.subject);
    setUnit(preset.unit);
    setDifficulty(preset.difficulty);
    setUnclearPart(preset.unclearPart);
    
    // Auto scroll to input
    const inputSection = document.getElementById("search-input-section");
    if (inputSection) {
      inputSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Primary Explore Action
  const handleExplore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !unit.trim()) {
      alert("과목과 단원명(또는 핵심 단어)을 입력해 주세요!");
      return;
    }

    setLoading(true);
    setStudentSummary("");
    setSummaryFeedback(null);
    setQ1Answer("");
    setQ2Answer("");
    setQuizSubmitted(false);

    try {
      const response = await fetch("/api/education/explore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          unit,
          difficulty,
          unclearPart
        })
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || "학습자료 생성 중 오류가 발생했습니다.");
      }

      const newSession: StudySession = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleDateString("ko-KR", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        }),
        subject,
        unit,
        difficulty,
        unclearPart,
        responseText: data.text,
        citations: data.citations || []
      };

      setCurrentSession(newSession);
      saveToHistory(newSession);
      
      // Auto-scroll to response section
      setTimeout(() => {
        const responseElement = document.getElementById("study-response-section");
        if (responseElement) {
          responseElement.scrollIntoView({ behavior: "smooth" });
        }
      }, 300);

    } catch (error: any) {
      console.error(error);
      alert(error.message || "서버와 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  // Evaluate Student Summary Action (Active Recall)
  const handleCheckSummary = async () => {
    if (!studentSummary.trim()) {
      alert("요약 내용을 적어주세요!");
      return;
    }
    if (!currentSession) return;

    setCheckingSummary(true);
    try {
      const response = await fetch("/api/education/check-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: currentSession.subject,
          unit: currentSession.unit,
          studentSummary: studentSummary,
          teacherExplanation: currentSession.responseText
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "요약 점검 중 오류가 발생했습니다.");
      }

      setSummaryFeedback(data.feedback);
      
      // Save this summary inside the active session in history
      const updatedSession = {
        ...currentSession,
        studentSummary: studentSummary,
        summaryFeedback: JSON.stringify(data.feedback)
      };
      setCurrentSession(updatedSession);
      saveToHistory(updatedSession);

    } catch (error: any) {
      console.error(error);
      alert(error.message || "서버 연결에 실패하여 요약을 검토하지 못했습니다.");
    } finally {
      setCheckingSummary(false);
    }
  };

  // Export Study Guide to File (Offline-friendly)
  const handleExportFile = () => {
    if (!currentSession) return;
    
    const fileContent = `
========================================
[ 보급 교육 상자 - 나만의 맞춤형 학습장 ]
========================================
일시: ${currentSession.timestamp}
과목: ${currentSession.subject}
단원/개념: ${currentSession.unit}
학습 수준: ${currentSession.difficulty}
내가 한 질문: ${currentSession.unclearPart || "전반적인 개념 이해"}

----------------------------------------
■ 핵심 개념 및 기출 문제 자료
----------------------------------------
${currentSession.responseText}

----------------------------------------
■ 실시간 탐색 추천 링크 (구글 검색 결과)
----------------------------------------
${currentSession.citations.map((c, i) => `[${i+1}] ${c.title} : ${c.url}`).join('\n') || "연계 검색 링크 없음"}

----------------------------------------
■ 내가 작성한 3줄 요약 도전기
----------------------------------------
내 요약: ${currentSession.studentSummary || "작성하지 않음"}
${summaryFeedback ? `\n[선생님의 다정한 요약 점수: ${'★'.repeat(summaryFeedback.score)}${'☆'.repeat(5-summaryFeedback.score)}]\n피드백: ${summaryFeedback.feedbackText}\n보완할 키워드: ${summaryFeedback.keyPointsMissed.join(', ')}` : ""}

========================================
배움은 아무도 빼앗아 갈 수 없는 보물입니다. 항상 힘내세요!
[보급 교육 상자] 제작자 드림
`;

    const blob = new Blob([fileContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `[보급교육상자]_${currentSession.subject}_${currentSession.unit}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Interactive Quiz Submit Action
  const handleQuizSubmit = () => {
    if (!q1Answer.trim() || !q2Answer.trim()) {
      alert("두 문제 모두 답안을 작성해 주세요!");
      return;
    }
    if (!currentSession) return;

    setQuizSubmitted(true);

    const updatedSession: StudySession = {
      ...currentSession,
      solvedQuizzes: {
        q1: { studentAnswer: q1Answer },
        q2: { studentAnswer: q2Answer }
      }
    };

    setCurrentSession(updatedSession);
    saveToHistory(updatedSession);
  };

  const handleResetQuiz = () => {
    if (!currentSession) return;
    if (confirm("답안을 지우고 다시 푸시겠습니까?")) {
      setQ1Answer("");
      setQ2Answer("");
      setQuizSubmitted(false);

      const { solvedQuizzes, ...rest } = currentSession;
      setCurrentSession(rest);
      saveToHistory(rest);
    }
  };

  return (
    <div id="app-root" className="min-h-screen bg-blue-50/50 font-sans text-slate-800 antialiased selection:bg-blue-200">
      
      {/* Top Navigation / Branding */}
      <header className="sticky top-0 z-40 border-b border-blue-100 bg-white/95 backdrop-blur-md px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-200 text-2xl">
              🎁
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-blue-900 flex items-center gap-2">
                보급 교육 상자
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-blue-600 mt-0.5">세상을 바꾸는 지식의 보관함 • 대한민국 교육과정 최적화</p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <div className="hidden md:flex gap-2 mr-2">
              <span className="px-3 py-1 bg-white rounded-full text-xs font-bold text-blue-700 shadow-sm border border-blue-100">초등</span>
              <span className="px-3 py-1 bg-blue-600 rounded-full text-xs font-bold text-white shadow-sm">중고등</span>
              <span className="px-3 py-1 bg-white rounded-full text-xs font-bold text-blue-700 shadow-sm border border-blue-100">검정고시</span>
            </div>
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="flex items-center space-x-1 rounded-xl border-2 border-blue-200 bg-white px-4 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-50 focus:outline-none shadow-sm"
            >
              <History className="h-4 w-4 text-blue-600" />
              <span>학습 기록 ({historyList.length})</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
        
        {/* Intro Message Card with neat visual illustration */}
        <section className="mb-10 overflow-hidden rounded-3xl border-2 border-blue-100 bg-white shadow-xl shadow-blue-100/30">
          <div className="grid grid-cols-1 md:grid-cols-5">
            <div className="p-6 sm:p-10 md:col-span-3 flex flex-col justify-center">
              <span className="inline-flex max-w-fit items-center rounded-full bg-blue-100/70 px-3 py-1 text-xs font-bold text-blue-800 mb-4">
                ✨ 공부가 하고 싶은 모든 학생들을 위해
              </span>
              <h2 className="text-2xl font-black tracking-tight text-blue-950 sm:text-3xl">
                비싼 책과 학교가 없어도, <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">누구나 최고의 배움</span>을 얻을 수 있도록.
              </h2>
              <p className="mt-4 text-slate-600 leading-relaxed text-sm">
                돈이 없어 참고서를 사지 못하거나 학교에 가기 어려운 환경에서도 배움을 놓치지 마세요.
                '보급 교육 상자'는 대한민국 표준 교육과정에 근거한 개념 정리, 실시간 최신 정보, 직접 엄선하고 자체 검토한 연습 문제를 무료로 나누어 줍니다.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-xs font-bold text-slate-600">
                <span className="flex items-center gap-1.5 rounded-xl bg-blue-50/50 px-3 py-2 border border-blue-100/50">
                  <Check className="h-4 w-4 text-green-500" /> 교과과정 맞춤
                </span>
                <span className="flex items-center gap-1.5 rounded-xl bg-blue-50/50 px-3 py-2 border border-blue-100/50">
                  <Check className="h-4 w-4 text-green-500" /> 실시간 구글 연계 Grounding
                </span>
                <span className="flex items-center gap-1.5 rounded-xl bg-blue-50/50 px-3 py-2 border border-blue-100/50">
                  <Check className="h-4 w-4 text-green-500" /> 철저한 오류 자동 검증 문항
                </span>
              </div>
            </div>
            
            {/* Visual Deco section */}
            <div className="relative hidden md:flex md:col-span-2 bg-gradient-to-br from-blue-500 to-indigo-600 items-center justify-center p-10 overflow-hidden">
              <div className="absolute inset-0 bg-grid-white/10" />
              <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-blue-300/30 blur-2xl" />
              <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-indigo-300/30 blur-2xl" />
              
              <div className="relative text-center text-white flex flex-col items-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm border border-white/20">
                  <BookMarked className="h-8 w-8 text-blue-100" />
                </div>
                <div className="font-mono text-xs text-blue-100 tracking-wider">UNIVERSAL EDUCATION BOX</div>
                <div className="mt-1 text-lg font-bold">배움은 내일을 밝히는 빛입니다</div>
                <div className="mt-4 max-w-xs text-xs text-blue-100/90 leading-relaxed">
                  "교육은 인간이 가진 최고의 무기이자, 아무도 당신에게서 가져갈 수 없는 평생의 보물입니다."
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Core Study Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Inputs Panel (lg:col-span-5) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Presets Subsection (퀵 개념 가이드) */}
            <div className="rounded-3xl border border-blue-100 bg-white p-6 shadow-md shadow-blue-100/20">
              <div className="flex items-center space-x-2 mb-3">
                <Compass className="h-5 w-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">💡 추천 기초 학습 주제 (교과서가 없어도 바로 클릭!)</h3>
              </div>
              <p className="text-xs text-slate-500 mb-4">학습 주제 선택이 어렵다면 아래 예시 중 하나를 클릭해 공부를 시작해 보세요.</p>
              
              <div className="space-y-2.5">
                {CURATED_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset)}
                    className="w-full text-left flex items-start space-x-3 p-3 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-blue-50/70 hover:border-blue-200 transition text-xs"
                  >
                    <span className="text-base leading-none pt-0.5">{preset.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="font-bold text-slate-700">{preset.subject} · {preset.unit}</span>
                        <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-bold">{preset.difficulty}</span>
                      </div>
                      <p className="text-slate-500 truncate">{preset.unclearPart}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Main Interactive Form with big inputs */}
            <div id="search-input-section" className="rounded-3xl border-4 border-blue-200 bg-white p-6 shadow-lg relative">
              
              <div className="flex items-center space-x-2 mb-6">
                <BookOpen className="h-5 w-5 text-blue-600" />
                <h3 className="font-bold text-blue-900 text-lg">개념 탐색 상자 채우기</h3>
              </div>

              <form onSubmit={handleExplore} className="space-y-5">
                
                {/* School Grade Level */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">학습 대상 및 수준</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["초등학교", "중학교", "고등학교"].map((lvl) => (
                      <button
                        type="button"
                        key={lvl}
                        onClick={() => setDifficulty(lvl)}
                        className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                          difficulty === lvl 
                            ? "border-blue-500 bg-blue-50 text-blue-800 shadow-sm" 
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subject & Unit row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">공부할 과목</label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full rounded-xl bg-blue-50 border-2 border-blue-100 text-blue-900 px-3.5 py-2.5 text-xs font-bold focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">-- 과목 선택 --</option>
                      <option value="수학">수학 🧮</option>
                      <option value="과학">과학 🔬</option>
                      <option value="사회">사회 ⚖️</option>
                      <option value="영어">영어 🔤</option>
                      <option value="국어">국어 📖</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">단원 또는 핵심어 직접 입력</label>
                    <input
                      type="text"
                      placeholder="예: 삼각비, 세포 분열"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full rounded-xl border-b-2 border-blue-100 bg-gray-50 px-3.5 py-2.5 text-xs focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                {/* Big Question / Unclear Part Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    질문 또는 막히는 부분 <span className="text-slate-400 font-normal">(자세히 적을수록 친절하게 설명해 줘요)</span>
                  </label>
                  <textarea
                    rows={4}
                    placeholder="예: 삼각함수의 주기와 그래프를 그리는 법이 헷갈려요. 기출 유형도 같이 알려주세요!"
                    value={unclearPart}
                    onChange={(e) => setUnclearPart(e.target.value)}
                    className="w-full h-24 bg-blue-50 rounded-2xl p-4 text-sm text-blue-900 placeholder-blue-300 resize-none outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>

                {/* Ethics Indicator callout in the box */}
                <div className="rounded-2xl bg-blue-50/50 border border-blue-100 p-4 flex items-start space-x-2.5">
                  <Info className="h-4.5 w-4.5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-blue-800 leading-relaxed">
                    <strong>공정 교육 상자 약속:</strong> 연습 문제는 교육 전문가 기준 교차 검토를 AI 내부에서 우선 마친 후 출력됩니다. AI가 자체 창작한 고유 문항에는 <strong>(AI 자체 개발)</strong> 마크가 표시됩니다.
                  </div>
                </div>

                {/* Action button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center space-x-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 text-sm tracking-wider transition-all shadow-md disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>대한민국 교육과정 최신 자료 탐색 중...</span>
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4" />
                      <span>학습 상자 열기 🔍</span>
                    </>
                  )}
                </button>

              </form>
            </div>

          </div>

          {/* Right Output Panel (lg:col-span-7) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Show landing placeholder if no session */}
            <AnimatePresence mode="wait">
              {!currentSession && !loading && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="rounded-3xl border-2 border-dashed border-blue-200 bg-white p-8 sm:p-12 text-center"
                >
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-500 mb-4">
                    <Compass className="h-8 w-8 animate-pulse text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">배움의 문을 열 준비가 되었습니다!</h3>
                  <p className="mt-2 text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                    왼쪽 입력창에서 원하는 과목과 공부하고 싶은 단원을 선택하거나, '추천 기초 학습 주제'를 눌러보세요.
                    구글 검색이 가동되어 훌륭한 맞춤 공부방을 즉시 꾸려 드립니다.
                  </p>
                </motion.div>
              )}

              {/* Loader view */}
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="rounded-3xl border border-blue-100 bg-white p-12 text-center shadow-lg shadow-blue-100"
                >
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-50 mb-6">
                    <Sparkles className="h-10 w-10 text-blue-500 animate-spin" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">배움을 조립하는 중...</h3>
                  
                  <div className="mt-4 max-w-md mx-auto space-y-2">
                    <p className="text-xs text-slate-600 font-medium">1단계: 대한민국 표준 교육과정 및 교과 성취기준 분석 중 🎯</p>
                    <p className="text-xs text-blue-600 animate-pulse font-medium">2단계: 구글 검색(Search Grounding)을 통해 검증된 자료와 수능/기출 유사 유형 탐색 중 🔍</p>
                    <p className="text-xs text-slate-500">3단계: AI 자체 창작 문항 수학적/과학적 오류 검수 및 피드백 마련 중 📝</p>
                  </div>
                  
                  <div className="mt-8 mx-auto w-48 h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 animate-infinite-loading rounded-full" style={{ width: "60%" }} />
                  </div>
                </motion.div>
              )}

              {/* Main Response content area */}
              {currentSession && !loading && (
                <motion.div
                  id="study-response-section"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-6"
                >
                  {/* Outer Frame Wrapper */}
                  <div className="rounded-3xl border border-blue-100 bg-white shadow-xl shadow-blue-100/20 overflow-hidden">
                    
                    {/* Panel Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-white flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="bg-white/20 p-2 rounded-xl text-white">
                          <BookOpen className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-sm sm:text-base">{currentSession.subject} · {currentSession.unit}</span>
                            <span className="text-[10px] bg-white/30 px-2 py-0.5 rounded-full font-bold">{currentSession.difficulty}</span>
                          </div>
                          <span className="text-[10px] text-blue-100 block mt-0.5">최적의 교과 탐색이 안전하게 완료되었습니다.</span>
                        </div>
                      </div>
                      
                      {/* Export action */}
                      <button
                        onClick={handleExportFile}
                        className="flex items-center space-x-1 rounded-xl bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 text-xs font-semibold tracking-wide transition focus:outline-none"
                        title="텍스트 파일로 저장하여 오프라인에서 읽으세요!"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">공부장 다운로드</span>
                      </button>
                    </div>

                    {/* Grounding Web Citations Panel */}
                    {currentSession.citations && currentSession.citations.length > 0 && (
                      <div className="bg-blue-50/50 border-b border-blue-100 px-6 py-3.5">
                        <div className="flex items-center space-x-2 mb-2">
                          <Compass className="h-4 w-4 text-blue-700" />
                          <span className="text-xs font-bold text-blue-800">🌐 구글 검색 연계 탐색된 공식 교육 자료</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {currentSession.citations.map((citation, idx) => (
                            <a
                              key={idx}
                              href={citation.url}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="inline-flex items-center space-x-1 text-[10px] text-blue-700 bg-white border border-blue-200/60 px-2.5 py-1 rounded-full hover:bg-blue-50 hover:border-blue-300 transition"
                            >
                              <span className="font-bold shrink-0">{idx+1}.</span>
                              <span className="truncate max-w-[150px]">{citation.title}</span>
                              <ExternalLink className="h-2.5 w-2.5 shrink-0 text-blue-400" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Big Markdown Body Area */}
                    {(() => {
                      const { mainContent, explanationContent } = splitResponse(currentSession.responseText);
                      return (
                        <div className="p-6 sm:p-8 space-y-6">
                          <div className="markdown-body">
                            <ReactMarkdown>{mainContent}</ReactMarkdown>
                          </div>

                          {/* Quiz Input Form Section */}
                          {explanationContent && (
                            <div className="mt-8 border-t-2 border-dashed border-blue-100 pt-6">
                              <div className="rounded-2xl border bg-blue-50/20 p-5 sm:p-6 space-y-4">
                                <div className="flex items-center space-x-2">
                                  <HelpCircle className="h-5 w-5 text-blue-600 animate-bounce" />
                                  <h4 className="font-bold text-blue-950 text-sm sm:text-base">✏️ 연습 문제 답안지 작성</h4>
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                                  위의 '4. 개념 다지기 연습 문제'를 꼼꼼하게 읽어보고, 아래에 나만의 생각이나 답안을 직접 입력해 주세요. 
                                  답안을 입력하고 제출하시면 <span className="text-blue-700 underline font-bold">정답과 단계별 상세 해설(5. 단계별 상세 해설 및 스스로 깨닫는 힌트)</span>이 즉시 잠금 해제됩니다!
                                </p>

                                <div className="space-y-4">
                                  <div>
                                    <label className="block text-xs font-bold text-blue-900 mb-1.5 bg-blue-100/60 px-2.5 py-1 rounded w-fit">
                                      문제 1 답안 작성
                                    </label>
                                    <textarea
                                      rows={2}
                                      placeholder="문제 1에 대해 내가 생각한 정답이나 풀이를 적어보세요."
                                      value={q1Answer}
                                      onChange={(e) => setQ1Answer(e.target.value)}
                                      disabled={quizSubmitted}
                                      className="w-full rounded-xl border border-blue-200 bg-white px-3.5 py-2.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-500 font-medium"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-xs font-bold text-blue-900 mb-1.5 bg-blue-100/60 px-2.5 py-1 rounded w-fit">
                                      문제 2 답안 작성
                                    </label>
                                    <textarea
                                      rows={2}
                                      placeholder="문제 2에 대해 내가 생각한 정답이나 풀이를 적어보세요."
                                      value={q2Answer}
                                      onChange={(e) => setQ2Answer(e.target.value)}
                                      disabled={quizSubmitted}
                                      className="w-full rounded-xl border border-blue-200 bg-white px-3.5 py-2.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-500 font-medium"
                                    />
                                  </div>
                                </div>

                                {!quizSubmitted ? (
                                  <button
                                    type="button"
                                    onClick={handleQuizSubmit}
                                    disabled={!q1Answer.trim() || !q2Answer.trim()}
                                    className="w-full flex items-center justify-center space-x-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold py-2.5 px-4 text-xs transition shadow-md disabled:shadow-none"
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                    <span>답안 제출하고 해설 보기 💡</span>
                                  </button>
                                ) : (
                                  <div className="space-y-4">
                                    <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-start space-x-2.5">
                                      <Check className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                                      <div className="text-[11px] text-emerald-800 leading-relaxed font-semibold">
                                        <strong>답안이 성공적으로 제출되어 해설이 잠금 해제되었습니다! 🎉</strong> <br />
                                        아래에 새로 나타난 '5. 단계별 상세 해설 및 스스로 깨닫는 힌트'를 읽고 내가 작성한 답변과 비교하며 나의 부족한 틈을 예쁘게 채워보세요.
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={handleResetQuiz}
                                      className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 focus:outline-none"
                                    >
                                      <RotateCcw className="h-3.5 w-3.5" />
                                      <span>지우고 다시 풀어보기</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Explanation Section (Hidden until quiz is submitted or no explanation exists) */}
                          {explanationContent && quizSubmitted && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="mt-6 pt-6 border-t border-blue-100 markdown-body"
                            >
                              <ReactMarkdown>{explanationContent}</ReactMarkdown>
                            </motion.div>
                          )}
                        </div>
                      );
                    })()}

                  </div>

                  {/* ACTIVE LEARNING WORKSPACE (Combating Over-dependence) */}
                  <div className="rounded-3xl border-2 border-blue-200 bg-gradient-to-br from-white to-blue-50/30 p-6 shadow-xl shadow-blue-100/20 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-2.5 h-full bg-blue-500" />
                    
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2.5">
                        <div className="bg-blue-100 text-blue-700 p-2 rounded-xl">
                          <Brain className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-blue-900 text-base">🧠 자기주도 성취 점검방 (수동적인 학습 탈출!)</h3>
                          <p className="text-xs text-slate-500">읽기만 하면 금방 잊어버려요. 나만의 언어로 요약하고 선생님의 즉시 평가를 받아보세요.</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-blue-800 mb-1.5 bg-blue-100/50 px-2.5 py-1 rounded w-fit">
                          ✍️ 도전: 오늘 배운 개념 3줄 요약 쓰기
                        </label>
                        <textarea
                          rows={3}
                          placeholder="위 설명을 읽고 가장 핵심이라고 생각하는 내용을 자신의 말투로 딱 3줄 요약해 적어보세요!"
                          value={studentSummary}
                          onChange={(e) => setStudentSummary(e.target.value)}
                          className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400"
                        />
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleCheckSummary}
                          disabled={checkingSummary || !studentSummary.trim()}
                          className="flex items-center space-x-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-2 px-5 text-xs transition"
                        >
                          {checkingSummary ? (
                            <>
                              <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                              <span>꼼꼼히 요약 분석 중...</span>
                            </>
                          ) : (
                            <>
                              <PenTool className="h-4 w-4" />
                              <span>내 요약 점검 및 피드백 받기</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Display feedback in an encouraging card */}
                      <AnimatePresence>
                        {summaryFeedback && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="rounded-xl border border-blue-250 bg-blue-50/50 p-4 space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-1 text-amber-500">
                                {[...Array(5)].map((_, i) => (
                                  <Star 
                                    key={i} 
                                    className={`h-4.5 w-4.5 ${i < summaryFeedback.score ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} 
                                  />
                                ))}
                                <span className="text-xs font-bold ml-1 text-slate-700">({summaryFeedback.score}/5 점)</span>
                              </div>
                              <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">선생님의 다정한 격려</span>
                            </div>

                            <p className="text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">
                              {summaryFeedback.feedbackText}
                            </p>

                            {summaryFeedback.keyPointsMissed && summaryFeedback.keyPointsMissed.length > 0 && (
                              <div className="text-[11px] border-t border-blue-100 pt-2.5">
                                <span className="font-bold text-blue-800">💡 더 훌륭한 요약을 위해 채워 넣으면 좋을 열쇠말:</span>
                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                  {summaryFeedback.keyPointsMissed.map((kw, i) => (
                                    <span key={i} className="bg-white border border-blue-100 text-blue-800 px-2 py-0.5 rounded text-[10px] font-medium">
                                      + {kw}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>

                    </div>
                  </div>

                </motion.div>
              )}
            </AnimatePresence>

          </div>

        </div>

      </main>

      {/* Slide-out Sidebar for History Records */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 z-50 bg-black"
            />

            {/* Sidebar drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.3 }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white p-6 shadow-2xl flex flex-col h-full border-l border-blue-100"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center space-x-2 text-blue-800">
                  <History className="h-5 w-5" />
                  <h3 className="font-bold text-slate-950">학습 보관함</h3>
                </div>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none"
                >
                  <span className="sr-only">닫기</span>
                  <RotateCcw className="h-5 w-5" />
                </button>
              </div>

              <p className="text-xs text-slate-500 my-4">
                과거에 탐색했던 단원과 요약 점검 기록입니다. 오프라인에서도 읽을 수 있게 로컬 브라우저에 소중히 보관됩니다.
              </p>

              {/* Records list */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {historyList.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <BookMarked className="h-10 w-10 mx-auto opacity-30 mb-2" />
                    <p className="text-xs">아직 저장된 학습 기록이 없습니다.</p>
                  </div>
                ) : (
                  historyList.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => {
                        setCurrentSession(session);
                        setStudentSummary(session.studentSummary || "");
                        if (session.summaryFeedback) {
                          try {
                            setSummaryFeedback(JSON.parse(session.summaryFeedback));
                          } catch (e) {
                            setSummaryFeedback(null);
                          }
                        } else {
                          setSummaryFeedback(null);
                        }

                        if (session.solvedQuizzes) {
                          setQ1Answer(session.solvedQuizzes.q1?.studentAnswer || "");
                          setQ2Answer(session.solvedQuizzes.q2?.studentAnswer || "");
                          setQuizSubmitted(true);
                        } else {
                          setQ1Answer("");
                          setQ2Answer("");
                          setQuizSubmitted(false);
                        }
                        setIsSidebarOpen(false);
                        
                        // Scroll response into view
                        setTimeout(() => {
                          const responseElement = document.getElementById("study-response-section");
                          if (responseElement) {
                            responseElement.scrollIntoView({ behavior: "smooth" });
                          }
                        }, 100);
                      }}
                      className={`group relative text-left p-3.5 rounded-xl border transition cursor-pointer ${
                        currentSession?.id === session.id
                          ? "border-blue-400 bg-blue-50/50"
                          : "border-slate-150 hover:bg-slate-50 bg-white"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1.5">
                        <span className="font-bold text-slate-800 text-xs truncate max-w-[150px]">
                          {session.subject} · {session.unit}
                        </span>
                        <div className="flex items-center space-x-1">
                          <span className="text-[9px] text-slate-400 shrink-0">{session.timestamp}</span>
                          <button
                            onClick={(e) => deleteSession(session.id, e)}
                            className="p-1 rounded text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition focus:outline-none"
                            title="삭제"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-blue-700 font-bold bg-blue-50 px-1.5 py-0.2 rounded">
                          {session.difficulty}
                        </span>
                        {session.studentSummary ? (
                          <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                            <Check className="h-3 w-3" /> 요약완료
                          </span>
                        ) : (
                          <span className="text-slate-400">요약 미도전</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Clear all */}
              {historyList.length > 0 && (
                <div className="border-t border-slate-100 pt-4 mt-4">
                  <button
                    onClick={() => {
                      if (confirm("모든 학습 기록을 비우시겠습니까?")) {
                        localStorage.removeItem("education_box_history");
                        setHistoryList([]);
                        setCurrentSession(null);
                        setStudentSummary("");
                        setSummaryFeedback(null);
                      }
                    }}
                    className="w-full flex items-center justify-center space-x-1.5 rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 py-2 text-xs font-semibold tracking-wide transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>보관함 전체 비우기</span>
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Footer / Ethics Statement */}
      <footer className="mt-20 border-t border-blue-100 bg-white py-10 text-xs text-blue-500">
        <div className="mx-auto max-w-7xl px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="space-y-1 text-center md:text-left">
            <p className="font-bold text-slate-800">© 2026 보급 교육 상자 - 모든 학생에게 평등한 기회를 제공합니다.</p>
            <p className="text-slate-400 max-w-md leading-relaxed text-[11px]">
              배움이 필요한 누구에게나 평등한 기회를 제공하기 위해 구글 제미나이(Gemini 3.5 Flash) 기술과 
              구글 검색 그라운딩(Google Search Grounding) 기술을 융합하여 기획되었습니다.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 text-[11px] text-blue-600 font-semibold bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 bg-green-400 rounded-full animate-ping" />
              <span>AI 자체 검토 시스템 가동 중</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 bg-blue-400 rounded-full" />
              <span>대한민국 2022 개정 교육과정 반영</span>
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}
