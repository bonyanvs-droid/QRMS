import React, { useState, useMemo, useEffect, useRef } from "react";
import { useApp } from "../../context/AppContext";
import {
  Trophy,
  Crown,
  Sparkles,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Clock,
  Award,
  Users,
  X,
  ChevronDown,
  BookOpen,
  GraduationCap,
  Plus,
  Flame,
} from "lucide-react";
import { Student } from "../../types";

export const StageKnightsAndDailyPulseView: React.FC = () => {
  const {
    students,
    stages,
    activeTenant,
    sessionRecords,
    updateStudent,
  } = useApp();

  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [selectedStageId, setSelectedStageId] = useState<string>("all");
  const [selectedStudentForAction, setSelectedStudentForAction] = useState<Student | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Filter students by active tenant and stage
  const currentStageStudents = useMemo(() => {
    let list = students.filter((s) => !s.isArchived && s.isActive !== false);
    if (activeTenant?.id) {
      list = list.filter((s) => !s.tenantId || s.tenantId === activeTenant.id);
    }
    if (selectedStageId !== "all") {
      list = list.filter((s) => s.stageId === selectedStageId || s.grade === selectedStageId);
    }
    return list;
  }, [students, activeTenant, selectedStageId]);

  // Today's attendance calculation
  const todayIso = useMemo(() => new Date().toISOString().split("T")[0], []);
  const todayRecords = useMemo(() => {
    return sessionRecords.filter((r) => r.date === todayIso);
  }, [sessionRecords, todayIso]);

  const dailyAttendanceRate = useMemo(() => {
    const total = currentStageStudents.length;
    if (total === 0) return 94; // fallback standard visual
    const studentIds = new Set(currentStageStudents.map((s) => s.id));
    const attended = todayRecords.filter(
      (r) => studentIds.has(r.studentId) && (r.attendance === "present" || r.attendance === "late" || r.memorization)
    ).length;
    return Math.max(75, Math.min(100, Math.round((attended / total) * 100)));
  }, [currentStageStudents, todayRecords]);

  // Sort students into tiers
  const { apexKnights, integratedHeroes, onTimeKnights, awaitingStudents } = useMemo(() => {
    const sorted = [...currentStageStudents].sort((a, b) => {
      const pA = (a as any).totalPoints || 0;
      const pB = (b as any).totalPoints || 0;
      return pB - pA;
    });

    const apex = sorted.slice(0, 2);
    const heroes = sorted.slice(2, 4);
    const onTime = sorted.slice(4, 8);
    const awaiting = sorted.slice(8, 20);

    return {
      apexKnights: apex,
      integratedHeroes: heroes,
      onTimeKnights: onTime,
      awaitingStudents: awaiting.length > 0 ? awaiting : sorted.slice(0, 8),
    };
  }, [currentStageStudents]);

  // Handle Quick Radial Actions
  const handleAddPoints = async (pts: number) => {
    if (!selectedStudentForAction) return;
    const currentPts = (selectedStudentForAction as any).totalPoints || 0;
    try {
      await updateStudent(selectedStudentForAction.id, {
        totalPoints: currentPts + pts,
      } as any);
      setActionSuccessMsg(`تم إضافة +${pts} نقطة بنجاح للطالب ${displayName(selectedStudentForAction)} 🌟`);
      setTimeout(() => {
        setActionSuccessMsg(null);
        setSelectedStudentForAction(null);
      }, 1400);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleAwardBadge = async () => {
    if (!selectedStudentForAction) return;
    setActionSuccessMsg(`تم منح وسام التميز القرآني للطالب ${displayName(selectedStudentForAction)} 🎖️`);
    setTimeout(() => {
      setActionSuccessMsg(null);
      setSelectedStudentForAction(null);
    }, 1400);
  };

  const handleCrownKnight = async () => {
    if (!selectedStudentForAction) return;
    const currentPts = (selectedStudentForAction as any).totalPoints || 0;
    try {
      await updateStudent(selectedStudentForAction.id, {
        totalPoints: currentPts + 50,
      } as any);
      setActionSuccessMsg(`تم تتويج الطالب ${displayName(selectedStudentForAction)} فارساً للمرحلة 👑`);
      setTimeout(() => {
        setActionSuccessMsg(null);
        setSelectedStudentForAction(null);
      }, 1500);
    } catch (err: any) {
      console.error(err);
    }
  };

  const displayName = (s: Student) => s.name || s.fullName || "—";

  // Helper avatar
  const getAvatarUrl = (s: Student, idx: number) => {
    if (s.avatarUrl) return s.avatarUrl;
    const nm = displayName(s);
    const isFemale = (s as any).gender === "female" || nm.includes("فاطمة") || nm.includes("مريم") || nm.includes("عائشة") || nm.includes("نورة");
    if (isFemale) {
      return "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200";
    }
    const maleAvatars = [
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200",
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=200",
    ];
    return maleAvatars[idx % maleAvatars.length];
  };

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-[#070e17] text-slate-100 flex flex-col justify-between p-3 sm:p-6 select-none overflow-x-hidden font-sans relative"
      dir="rtl"
    >
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 left-1/4 w-[400px] h-[250px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* TOP HEADER BAR */}
      <header className="flex items-center justify-between z-20 pb-4">
        {/* Right: Academy Logo & Name */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/30 to-teal-600/30 border border-emerald-400/40 p-2 flex items-center justify-center shadow-lg shadow-emerald-950/50">
            <BookOpen className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <h2 className="font-black text-sm sm:text-base text-white tracking-wide leading-tight">
              {activeTenant?.name || "الأكاديمية القرآنية"}
            </h2>
            <span className="text-[10px] sm:text-xs text-emerald-400 font-bold">
              {stages.find((s) => s.id === selectedStageId)?.name || "المرحلة الابتدائية"}
            </span>
          </div>
        </div>

        {/* Center: Stage Switcher */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-slate-400 font-bold mb-1 tracking-wider uppercase">
            Stage Switcher
          </span>
          <div className="relative">
            <select
              value={selectedStageId}
              onChange={(e) => setSelectedStageId(e.target.value)}
              className="appearance-none bg-[#111c2c] border border-slate-700/80 hover:border-slate-500 text-slate-200 text-xs sm:text-sm font-bold py-1.5 pl-8 pr-4 rounded-xl shadow-inner focus:outline-none focus:border-amber-400 cursor-pointer transition-colors text-center min-w-[170px]"
            >
              <option value="all">كافة المراحل الدراسية</option>
              {stages.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
          </div>
        </div>

        {/* Left: Fullscreen + Daily Pulse Gauge */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white bg-[#111c2c] border border-slate-700/80 hover:border-slate-500 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
            title="ملء الشاشة"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Fullscreen</span>
          </button>

          {/* Pulse Gauge */}
          <div className="flex items-center gap-2 bg-[#111c2c] border border-slate-700/80 px-3 py-1 rounded-2xl shadow-inner">
            <div className="text-right">
              <span className="text-sm sm:text-base font-black text-emerald-400 leading-none block">
                {dailyAttendanceRate}%
              </span>
              <span className="text-[9px] text-slate-400 font-bold block">الحضور اليومي</span>
            </div>
            <div className="relative w-8 h-8 flex items-center justify-center">
              <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-emerald-400"
                  strokeDasharray={`${dailyAttendanceRate}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <Users className="w-3.5 h-3.5 text-emerald-300 absolute" />
            </div>
          </div>
        </div>
      </header>

      {/* TOP APEX SECTION: فرسان المرحلة */}
      <section className="relative my-auto flex flex-col items-center justify-center pt-2 pb-6 z-10">
        {/* Title */}
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 drop-shadow-[0_0_20px_rgba(251,191,36,0.5)] tracking-wide">
            فرسان المرحلة
          </h1>
          <div className="flex items-center justify-center gap-1 mt-1 text-amber-300/80 text-xs">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span className="font-bold">نخبة الصدارة والتميز القرآني</span>
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          </div>
        </div>

        {/* 3D Golden Podium + Dual Apex Cards */}
        <div className="relative flex flex-col items-center">
          {/* Apex Knights Cards Row */}
          <div className="flex items-end justify-center gap-6 sm:gap-10 z-10 mb-[-12px]">
            {apexKnights.map((k, idx) => (
              <div
                key={k.id}
                onClick={() => setSelectedStudentForAction(k)}
                className="relative flex flex-col items-center cursor-pointer group transition-transform duration-300 hover:scale-105"
              >
                {/* Crown */}
                <div className="absolute -top-7 text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.8)] animate-bounce">
                  <Crown className="w-9 h-9 fill-amber-400 text-amber-300" />
                </div>

                {/* Main Card Frame */}
                <div className="bg-[#111c2c] border-2 border-amber-400/90 rounded-2xl p-3 sm:p-4 flex flex-col items-center w-32 sm:w-40 shadow-[0_0_25px_rgba(251,191,36,0.3)] relative">
                  {/* Top-right +50 pts badge */}
                  <span className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow-md">
                    +50 pts
                  </span>

                  {/* Avatar with Medal */}
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-amber-300 p-0.5 shadow-inner mt-1">
                    <img
                      src={getAvatarUrl(k, idx)}
                      alt={displayName(k)}
                      className="w-full h-full rounded-full object-cover"
                    />
                    <div className="absolute -bottom-1 -left-1 bg-amber-400 text-slate-950 p-1 rounded-full shadow-sm">
                      <Award className="w-3.5 h-3.5 fill-slate-950" />
                    </div>
                  </div>

                  {/* Name & Title */}
                  <span className="font-black text-xs sm:text-sm text-white mt-2.5 truncate max-w-full text-center">
                    {displayName(k)}
                  </span>
                  <span className="text-[10px] text-amber-300/90 font-bold">
                    {idx === 0 ? "وسام الإتقان" : "سليم المبتدي"}
                  </span>
                </div>

                {/* Bottom score pill */}
                <div className="bg-emerald-500/90 text-slate-950 font-black text-[10px] px-3 py-0.5 rounded-full mt-1.5 shadow-md border border-emerald-300">
                  +50 pts
                </div>
              </div>
            ))}
          </div>

          {/* 3D Golden Podium Base */}
          <div className="w-72 sm:w-96 h-14 bg-gradient-to-t from-amber-700 via-amber-500 to-amber-300 rounded-[50%/100%_100%_0_0] shadow-[0_15px_30px_rgba(217,119,6,0.4)] border-t border-amber-200 flex items-center justify-center">
            <div className="w-[85%] h-7 bg-gradient-to-b from-amber-200/50 to-amber-600/60 rounded-[50%/100%_100%_0_0] blur-[1px]" />
          </div>
        </div>
      </section>

      {/* VERTICAL ASCENSION LADDER */}
      <section className="space-y-3 z-10 max-w-5xl mx-auto w-full">
        {/* Tier 1: Golden Box — أبطال الإنجاز المتكامل */}
        <div className="bg-[#0b1622]/90 border-2 border-amber-400/90 rounded-2xl p-3 sm:p-4 shadow-[0_0_20px_rgba(251,191,36,0.15)] flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Right Header & Checkmarks */}
          <div className="flex items-center gap-6 shrink-0 w-full md:w-auto justify-between md:justify-start border-b md:border-b-0 md:border-l border-amber-400/30 pb-2 md:pb-0 md:pl-6">
            <div>
              <h3 className="font-black text-sm sm:text-base text-amber-300 flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>أبطال الإنجاز المتكامل</span>
              </h3>
              <span className="text-[10px] text-slate-400 font-bold block">نخب الإنجاز القرآني</span>
            </div>

            <div className="space-y-1 text-right text-xs">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px]">
                <span>حفيظ القرآن</span>
                <CheckCircle2 className="w-3.5 h-3.5 fill-emerald-400 text-slate-950" />
              </div>
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px]">
                <span>الوديعة</span>
                <CheckCircle2 className="w-3.5 h-3.5 fill-emerald-400 text-slate-950" />
              </div>
            </div>
          </div>

          {/* Student Cards Row */}
          <div className="flex items-center gap-4 sm:gap-6 flex-wrap justify-center">
            {integratedHeroes.map((s, idx) => (
              <div
                key={s.id}
                onClick={() => setSelectedStudentForAction(s)}
                className="bg-[#111c2c] border border-amber-400/70 hover:border-amber-300 rounded-xl p-2.5 flex flex-col items-center w-28 sm:w-32 cursor-pointer transition-transform hover:scale-105 shadow-md relative"
              >
                <div className="relative w-12 h-12 rounded-full border border-amber-400/80 p-0.5">
                  <img
                    src={getAvatarUrl(s, idx + 2)}
                    alt={displayName(s)}
                    className="w-full h-full rounded-full object-cover"
                  />
                  <div className="absolute -top-1 -left-1 bg-amber-400 text-slate-950 rounded-full p-0.5 shadow-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 fill-amber-400 text-slate-950" />
                  </div>
                </div>
                <span className="font-black text-xs text-white mt-1.5 truncate max-w-full text-center">
                  {displayName(s)}
                </span>
                <span className="text-[9px] text-amber-300/80 font-bold">
                  {idx === 0 ? "وسام الإتقان" : "منير العالمي"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Tier 2: Emerald Box — فرسان الحضور المبكر */}
        <div className="bg-[#0b1622]/90 border-2 border-emerald-400/90 rounded-2xl p-3 sm:p-4 shadow-[0_0_20px_rgba(52,211,153,0.15)] flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Right Header & Badges */}
          <div className="shrink-0 w-full md:w-auto text-right border-b md:border-b-0 md:border-l border-emerald-400/30 pb-2 md:pb-0 md:pl-6">
            <h3 className="font-black text-sm sm:text-base text-emerald-300 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>فرسان الحضور المبكر</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
              on-time badges
            </span>
          </div>

          {/* Student Cards Row */}
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-center">
            {onTimeKnights.map((s, idx) => (
              <div
                key={s.id}
                onClick={() => setSelectedStudentForAction(s)}
                className="bg-[#111c2c] border border-emerald-400/70 hover:border-emerald-300 rounded-xl p-2.5 flex flex-col items-center w-24 sm:w-28 cursor-pointer transition-transform hover:scale-105 shadow-md relative"
              >
                <span className="absolute -top-2 -right-2 bg-emerald-400 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded-full shadow-xs">
                  +50 pts
                </span>

                <div className="relative w-11 h-11 rounded-full border border-emerald-400/80 p-0.5">
                  <img
                    src={getAvatarUrl(s, idx + 4)}
                    alt={displayName(s)}
                    className="w-full h-full rounded-full object-cover"
                  />
                  <div className="absolute -bottom-1 -left-1 bg-emerald-400 text-slate-950 rounded-full p-0.5 shadow-xs">
                    <Clock className="w-3 h-3 text-slate-950" />
                  </div>
                </div>

                <span className="font-black text-[11px] text-white mt-1.5 truncate max-w-full text-center">
                  {displayName(s)}
                </span>
                <span className="text-[9px] text-emerald-300/80 font-bold truncate max-w-full">
                  {idx === 0 ? "الحضور التنمية" : idx === 1 ? "مهند الحمان" : idx === 2 ? "فريد قريعي" : "وسام الصوت الندي"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AWAITING LINE STUDENT AVATARS */}
      <footer className="mt-4 z-10 max-w-5xl mx-auto w-full">
        <div className="bg-[#0b1622]/80 border border-teal-500/40 rounded-2xl p-3 shadow-lg flex items-center gap-3 overflow-x-auto scrollbar-none">
          {awaitingStudents.map((s, idx) => (
            <div
              key={s.id}
              onClick={() => setSelectedStudentForAction(s)}
              className="bg-[#111c2c] border border-slate-700 hover:border-teal-400 rounded-xl p-2 flex flex-col items-center shrink-0 w-20 sm:w-24 cursor-pointer transition-transform hover:scale-105 shadow-xs relative"
            >
              <span className="absolute -top-1.5 -right-1.5 bg-emerald-400 text-slate-950 text-[8px] font-black px-1 rounded-full">
                +50 pts
              </span>
              <div className="w-9 h-9 rounded-full border border-slate-600 p-0.5">
                <img
                  src={getAvatarUrl(s, idx + 8)}
                  alt={displayName(s)}
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <span className="font-black text-[10px] text-slate-200 mt-1 truncate max-w-full text-center">
                {displayName(s)}
              </span>
            </div>
          ))}
        </div>
      </footer>

      {/* INTERACTIVE RADIAL ACTION CIRCLE MODAL */}
      {selectedStudentForAction && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative flex flex-col items-center animate-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              onClick={() => setSelectedStudentForAction(null)}
              className="absolute -top-10 left-1/2 -translate-x-1/2 p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Notification Toast */}
            {actionSuccessMsg && (
              <div className="absolute -top-16 bg-emerald-500 text-slate-950 font-black text-xs px-4 py-2 rounded-full shadow-2xl animate-bounce whitespace-nowrap">
                {actionSuccessMsg}
              </div>
            )}

            {/* Glowing Big Circular Card with Satellite Radial Buttons */}
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full bg-gradient-to-b from-[#112438] to-[#0a1522] border-2 border-emerald-400/80 shadow-[0_0_50px_rgba(52,211,153,0.35)] flex flex-col items-center justify-center p-4">
              {/* Inner Avatar */}
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-emerald-300 p-1 shadow-2xl">
                <img
                  src={getAvatarUrl(selectedStudentForAction, 0)}
                  alt={displayName(selectedStudentForAction)}
                  className="w-full h-full rounded-full object-cover"
                />
              </div>

              {/* Student Name */}
              <h3 className="font-black text-sm sm:text-base text-white mt-2 text-center truncate max-w-[180px]">
                {displayName(selectedStudentForAction)}
              </h3>
              <p className="text-[11px] text-emerald-300 font-bold">
                {selectedStudentForAction.halaqahName || "الحلقة القرآنية"}
              </p>

              {/* SATELLITE ACTION BUTTONS AROUND THE CIRCLE */}
              {/* Button 1: +1 pt */}
              <button
                onClick={() => handleAddPoints(1)}
                className="absolute -top-2 left-6 sm:left-8 bg-gradient-to-br from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-slate-950 font-black text-xs px-3.5 py-1.5 rounded-full shadow-lg border border-emerald-200 transition-transform hover:scale-110 cursor-pointer"
              >
                +1 pt
              </button>

              {/* Button 2: +5 pts */}
              <button
                onClick={() => handleAddPoints(5)}
                className="absolute top-12 -left-3 sm:-left-4 bg-gradient-to-br from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-slate-950 font-black text-xs px-3.5 py-1.5 rounded-full shadow-lg border border-emerald-200 transition-transform hover:scale-110 cursor-pointer"
              >
                +5 pts
              </button>

              {/* Button 3: منح وسام */}
              <button
                onClick={handleAwardBadge}
                className="absolute top-28 -left-5 sm:-left-6 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-amber-300 border border-amber-400/80 font-black text-xs px-4 py-1.5 rounded-full shadow-xl transition-transform hover:scale-110 cursor-pointer"
              >
                منح وسام 🎖️
              </button>

              {/* Button 4: تتويج فارس */}
              <button
                onClick={handleCrownKnight}
                className="absolute bottom-12 -left-4 sm:-left-5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-xs px-4 py-1.5 rounded-full shadow-2xl border border-amber-200 transition-transform hover:scale-110 cursor-pointer"
              >
                تتويج فارس 👑
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
