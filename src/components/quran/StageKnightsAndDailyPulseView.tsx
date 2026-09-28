import React, { useState, useMemo, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import {
  Trophy,
  Award,
  Crown,
  Sparkles,
  Zap,
  Activity,
  Users,
  BookOpen,
  Calendar,
  CheckCircle2,
  TrendingUp,
  Clock,
  Tv,
  Maximize2,
  Minimize2,
  Filter,
  Flame,
  Star,
  Layers,
  ChevronLeft,
  ChevronRight,
  Shield,
  Printer,
  Share2,
} from "lucide-react";
import { Student, DailySessionRecord, Halaqah } from "../../types";

export const StageKnightsAndDailyPulseView: React.FC = () => {
  const {
    students,
    halaqahs,
    teachers,
    stages,
    sessionRecords,
    activeTenant,
    currentUser,
  } = useApp();

  const todayIso = useMemo(() => new Promise<string>((r) => r(new Date().toISOString().split("T")[0])), []);
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [selectedStageId, setSelectedStageId] = useState<string>("all");
  const [selectedHalaqahId, setSelectedHalaqahId] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"knights" | "pulse" | "live_feed">("knights");
  const [knightCategory, setKnightCategory] = useState<"all" | "memorization" | "revision" | "points" | "spelling">("all");
  const [isTvMode, setIsTvMode] = useState<boolean>(false);

  // TV auto-cycle tab every 12 seconds in TV Mode
  useEffect(() => {
    if (!isTvMode) return;
    const timer = setInterval(() => {
      setActiveTab((prev) => (prev === "knights" ? "pulse" : prev === "pulse" ? "live_feed" : "knights"));
    }, 12000);
    return () => clearInterval(timer);
  }, [isTvMode]);

  // Accessible students based on tenant and stage/halaqah filters
  const filteredStudents = useMemo(() => {
    let list = students.filter((s) => !s.isArchived && s.isActive !== false);
    if (activeTenant?.id) {
      list = list.filter((s) => !s.tenantId || s.tenantId === activeTenant.id);
    }
    if (selectedStageId !== "all") {
      list = list.filter((s) => s.stageId === selectedStageId || s.grade === selectedStageId);
    }
    if (selectedHalaqahId !== "all") {
      list = list.filter((s) => s.halaqahId === selectedHalaqahId);
    }
    return list;
  }, [students, activeTenant, selectedStageId, selectedHalaqahId]);

  // Today's records for pulse calculations
  const todayRecords = useMemo(() => {
    return sessionRecords.filter((r) => r.date === selectedDate);
  }, [sessionRecords, selectedDate]);

  // Compute daily pulse KPIs
  const pulseMetrics = useMemo(() => {
    const totalStudents = filteredStudents.length;
    const studentIds = new Set(filteredStudents.map((s) => s.id));
    const recordsInScope = todayRecords.filter((r) => studentIds.has(r.studentId));

    const attendedCount = recordsInScope.filter(
      (r) => r.attendance === "present" || r.attendance === "late" || (r.memorization && !r.memorization.unachieved)
    ).length;
    const absentCount = recordsInScope.filter((r) => r.attendance === "absent").length;
    const excusedCount = recordsInScope.filter((r) => r.attendance === "excused").length;

    let memorizedAyahsToday = 0;
    let revisedAyahsToday = 0;
    let excellentCount = 0;

    recordsInScope.forEach((r) => {
      if (r.memorization && !r.memorization.unachieved) {
        const c = Math.max(1, (r.memorization.ayahTo || 1) - (r.memorization.ayahFrom || 1) + 1);
        memorizedAyahsToday += c;
      }
      if (r.revision && !r.revision.unachieved) {
        revisedAyahsToday += 10;
      }
      if (r.memorization?.evaluation === "excellent" || r.memorization?.evaluation === "متقن") excellentCount++;
    });

    const attendanceRate = totalStudents > 0 ? Math.round((attendedCount / totalStudents) * 100) : 0;

    return {
      totalStudents,
      attendedCount,
      absentCount,
      excusedCount,
      attendanceRate,
      memorizedAyahsToday,
      revisedAyahsToday,
      totalAyahsToday: memorizedAyahsToday + revisedAyahsToday,
      recordedSessionsCount: recordsInScope.length,
      excellentCount,
    };
  }, [filteredStudents, todayRecords]);

  // Compute Stage Knights Rankings
  const stageKnights = useMemo(() => {
    const studentIds = new Set(filteredStudents.map((s) => s.id));
    const relevantRecords = sessionRecords.filter((r) => studentIds.has(r.studentId));

    // Aggregate stats per student
    const statsByStudent = new Map<
      string,
      {
        totalAyahs: number;
        memorizedAyahs: number;
        revisedAyahs: number;
        excellentCount: number;
        totalSessions: number;
        streak: number;
        points: number;
        spellingMastery: number;
      }
    >();

    filteredStudents.forEach((s) => {
      statsByStudent.set(s.id, {
        totalAyahs: 0,
        memorizedAyahs: 0,
        revisedAyahs: 0,
        excellentCount: 0,
        totalSessions: 0,
        streak: 0,
        points: (s as any).totalPoints || 0,
        spellingMastery: (s as any).spellingScore || 0,
      });
    });

    // Sort records chronologically to compute streak
    const sortedRecords = [...relevantRecords].sort((a, b) => (a.date > b.date ? 1 : -1));

    sortedRecords.forEach((r) => {
      const stats = statsByStudent.get(r.studentId);
      if (!stats) return;

      const mem = (r.memorization && !r.memorization.unachieved) ? Math.max(1, (r.memorization.ayahTo || 1) - (r.memorization.ayahFrom || 1) + 1) : 0;
      const rev = (r.revision && !r.revision.unachieved) ? 10 : 0;

      stats.memorizedAyahs += mem;
      stats.revisedAyahs += rev;
      stats.totalAyahs += mem + rev;
      stats.totalSessions++;

      if (r.memorization?.evaluation === "excellent" || r.memorization?.evaluation === "متقن") {
        stats.excellentCount++;
        stats.streak++;
      } else if (r.attendance === "absent") {
        stats.streak = 0;
      }
    });

    const ranked = filteredStudents.map((s) => {
      const stats = statsByStudent.get(s.id) || {
        totalAyahs: 0,
        memorizedAyahs: 0,
        revisedAyahs: 0,
        excellentCount: 0,
        totalSessions: 0,
        streak: 0,
        points: 0,
        spellingMastery: 0,
      };

      const masteryRate =
        stats.totalSessions > 0 ? Math.round((stats.excellentCount / stats.totalSessions) * 100) : 100;

      // Composite Knight Score
      const knightScore =
        stats.memorizedAyahs * 3 +
        stats.revisedAyahs * 1.5 +
        stats.excellentCount * 10 +
        stats.streak * 5 +
        ((s as any).totalPoints || 0);

      return {
        student: s,
        stats,
        masteryRate,
        knightScore,
      };
    });

    // Apply category filter
    let sorted = [...ranked];
    if (knightCategory === "memorization") {
      sorted.sort((a, b) => b.stats.memorizedAyahs - a.stats.memorizedAyahs);
    } else if (knightCategory === "revision") {
      sorted.sort((a, b) => b.stats.revisedAyahs - a.stats.revisedAyahs);
    } else if (knightCategory === "points") {
      sorted.sort((a, b) => ((b.student as any).totalPoints || 0) - ((a.student as any).totalPoints || 0));
    } else if (knightCategory === "spelling") {
      sorted.sort((a, b) => ((b.student as any).spellingScore || 0) - ((a.student as any).spellingScore || 0));
    } else {
      sorted.sort((a, b) => b.knightScore - a.knightScore);
    }

    return sorted;
  }, [filteredStudents, sessionRecords, knightCategory]);

  // Podium top 3
  const top1 = stageKnights[0];
  const top2 = stageKnights[1];
  const top3 = stageKnights[2];
  const restKnights = stageKnights.slice(3, 25);

  // Halaqah live pulse list
  const halaqahsPulse = useMemo(() => {
    let list = halaqahs;
    if (activeTenant?.id) {
      list = list.filter((h) => !h.tenantId || h.tenantId === activeTenant.id);
    }
    if (selectedStageId !== "all") {
      list = list.filter((h) => h.stageId === selectedStageId);
    }

    return list.map((h) => {
      const hStudents = students.filter((s) => s.halaqahId === h.id && !s.isArchived);
      const studentIds = new Set(hStudents.map((s) => s.id));
      const hRecords = todayRecords.filter((r) => studentIds.has(r.studentId));

      const attended = hRecords.filter(
        (r) => r.attendance === "present" || r.attendance === "late" || (r.memorization && !r.memorization.unachieved)
      ).length;

      let totalAyahs = 0;
      hRecords.forEach((r) => {
        const mem = (r.memorization && !r.memorization.unachieved) ? Math.max(1, (r.memorization.ayahTo || 1) - (r.memorization.ayahFrom || 1) + 1) : 0;
        const rev = (r.revision && !r.revision.unachieved) ? 10 : 0;
        totalAyahs += mem + rev;
      });

      const teacher = teachers.find((t) => t.id === h.teacherId);
      const completionRate = hStudents.length > 0 ? Math.round((hRecords.length / hStudents.length) * 100) : 0;

      return {
        halaqah: h,
        teacherName: teacher?.name || h.teacherName || "معلم الحلقة",
        studentsCount: hStudents.length,
        attendedCount: attended,
        recordedCount: hRecords.length,
        totalAyahsToday: totalAyahs,
        completionRate,
      };
    });
  }, [halaqahs, activeTenant, selectedStageId, students, todayRecords, teachers]);

  // Live feed records
  const liveFeed = useMemo(() => {
    return [...todayRecords]
      .sort((a, b) => ((b as any).createdAt || b.date || "").localeCompare((a as any).createdAt || a.date || ""))
      .slice(0, 30);
  }, [todayRecords]);

  return (
    <div
      className={`min-h-screen bg-slate-900 text-slate-100 p-3 sm:p-6 space-y-6 ${
        isTvMode ? "fixed inset-0 z-50 overflow-y-auto bg-slate-950 p-6" : ""
      }`}
      dir="rtl"
    >
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-teal-950 border border-emerald-500/30 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 shadow-lg flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                <Trophy className="w-8 h-8 text-amber-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  منصة الصدارة والتميز القرآني
                </span>
                <span className="bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  بث لحظي مباشر
                </span>
              </div>
              <h1 className="text-xl sm:text-3xl font-black text-white mt-1 tracking-tight">
                شاشة فرسان المرحلة والنبض اليومي 🏆⚡
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 font-bold mt-0.5">
                {activeTenant?.name || "المجمع القرآني"} — لوحة الشرف والإنجاز اليومي المتزامن للحلقات
              </p>
            </div>
          </div>

          {/* Controls & Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Stage Selector */}
            <select
              value={selectedStageId}
              onChange={(e) => setSelectedStageId(e.target.value)}
              className="bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">كافة المراحل الدراسية</option>
              {stages.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </select>

            {/* Date Selector */}
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
            />

            {/* TV Mode Toggle */}
            <button
              onClick={() => setIsTvMode(!isTvMode)}
              className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                isTvMode
                  ? "bg-amber-500 text-slate-950 shadow-lg"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
              }`}
              title="تفعيل وضع العرض التلفزيوني لشاشات المساجد والصالات"
            >
              <Tv className="w-4 h-4" />
              <span>{isTvMode ? "إنهاء وضع الشاشة" : "وضع شاشة المسجد 📺"}</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="relative z-10 flex items-center gap-2 mt-6 border-b border-slate-800 pb-1 text-xs font-black">
          <button
            onClick={() => setActiveTab("knights")}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "knights"
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md font-black"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Crown className="w-4 h-4" />
            <span>لوحة فرسان المرحلة 🥇</span>
          </button>

          <button
            onClick={() => setActiveTab("pulse")}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "pulse"
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md font-black"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Zap className="w-4 h-4 text-amber-300" />
            <span>النبض اليومي للحلقات ⚡</span>
          </button>

          <button
            onClick={() => setActiveTab("live_feed")}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "live_feed"
                ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md font-black"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>سجل الرصد اللحظي 📡</span>
          </button>
        </div>
      </div>

      {/* Main KPI Counters Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3 sm:p-4 text-right">
          <span className="text-[11px] font-bold text-slate-400 block">إجمالي الطلاب بالمرحلة</span>
          <span className="text-xl sm:text-2xl font-black text-white mt-1 block">
            {pulseMetrics.totalStudents} <span className="text-xs text-slate-400 font-normal">طالب</span>
          </span>
        </div>

        <div className="bg-slate-800/80 border border-emerald-500/30 rounded-2xl p-3 sm:p-4 text-right">
          <span className="text-[11px] font-bold text-emerald-400 block">حضور اليوم</span>
          <span className="text-xl sm:text-2xl font-black text-emerald-300 mt-1 block">
            {pulseMetrics.attendedCount}{" "}
            <span className="text-xs font-bold text-emerald-400/80">({pulseMetrics.attendanceRate}%)</span>
          </span>
        </div>

        <div className="bg-slate-800/80 border border-amber-500/30 rounded-2xl p-3 sm:p-4 text-right">
          <span className="text-[11px] font-bold text-amber-400 block">آيات الحفظ المنجزة اليوم</span>
          <span className="text-xl sm:text-2xl font-black text-amber-300 mt-1 block">
            {pulseMetrics.memorizedAyahsToday} <span className="text-xs text-amber-400/80 font-normal">آية</span>
          </span>
        </div>

        <div className="bg-slate-800/80 border border-teal-500/30 rounded-2xl p-3 sm:p-4 text-right">
          <span className="text-[11px] font-bold text-teal-400 block">آيات المراجعة اليومية</span>
          <span className="text-xl sm:text-2xl font-black text-teal-300 mt-1 block">
            {pulseMetrics.revisedAyahsToday} <span className="text-xs text-teal-400/80 font-normal">آية</span>
          </span>
        </div>

        <div className="bg-slate-800/80 border border-purple-500/30 rounded-2xl p-3 sm:p-4 text-right">
          <span className="text-[11px] font-bold text-purple-400 block">جلسات التسميع المرصودة</span>
          <span className="text-xl sm:text-2xl font-black text-purple-300 mt-1 block">
            {pulseMetrics.recordedSessionsCount} <span className="text-xs text-purple-400/80 font-normal">جلسة</span>
          </span>
        </div>

        <div className="bg-slate-800/80 border border-indigo-500/30 rounded-2xl p-3 sm:p-4 text-right">
          <span className="text-[11px] font-bold text-indigo-400 block">تقييمات «متقن وممتاز»</span>
          <span className="text-xl sm:text-2xl font-black text-indigo-300 mt-1 block">
            {pulseMetrics.excellentCount} <span className="text-xs text-indigo-400/80 font-normal">طالب</span>
          </span>
        </div>
      </div>

      {/* TAB 1: KNIGHTS & PODIUM */}
      {activeTab === "knights" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Subfilter categories */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
              <span className="text-slate-400 ml-2">تصنيف الفرسان:</span>
              {[
                { id: "all", label: "🌟 فرسان الصدارة الشاملة" },
                { id: "memorization", label: "📖 فرسان الحفظ الجديد" },
                { id: "revision", label: "🔄 فرسان المراجعة والإتقان" },
                { id: "points", label: "🏆 فرسان النقاط والأوسمة" },
                { id: "spelling", label: "✍️ فرسان الهجاء القرآني" },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setKnightCategory(c.id as any)}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    knightCategory === c.id
                      ? "bg-amber-500 text-slate-950 font-black shadow-xs"
                      : "bg-slate-700/60 hover:bg-slate-700 text-slate-300"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div className="text-xs font-bold text-slate-400">
              المرحلة: <strong className="text-amber-300">{stages.find((s) => s.id === selectedStageId)?.name || "كافة المراحل"}</strong>
            </div>
          </div>

          {/* Golden Podium Top 3 */}
          {stageKnights.length >= 3 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-end pt-4 pb-2">
              {/* 2nd Place: Silver */}
              <div className="order-2 md:order-1 bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-slate-400/40 rounded-3xl p-5 text-center shadow-xl relative transform md:-translate-y-2">
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-slate-300 text-slate-900 font-black flex items-center justify-center text-base shadow-lg border-2 border-slate-100">
                  🥈 2
                </div>
                <div className="w-16 h-16 mx-auto mt-2 rounded-full bg-slate-700 border-2 border-slate-400 flex items-center justify-center font-black text-xl text-slate-200 shadow-inner">
                  {top2?.student.fullName.charAt(0)}
                </div>
                <h3 className="font-black text-base sm:text-lg text-white mt-3 truncate">{top2?.student.fullName}</h3>
                <p className="text-xs text-slate-400 font-bold mt-0.5">{top2?.student.halaqahName || "حلقة غير محددة"}</p>
                <div className="mt-4 pt-3 border-t border-slate-700/80 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">مجموع الآيات</span>
                    <span className="font-black text-slate-200">{top2?.stats.totalAyahs} آية</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">نسبة الإتقان</span>
                    <span className="font-black text-emerald-400">{top2?.masteryRate}%</span>
                  </div>
                </div>
              </div>

              {/* 1st Place: Gold Crown */}
              <div className="order-1 md:order-2 bg-gradient-to-b from-amber-950/40 via-slate-800 to-slate-900 border-2 border-amber-400 rounded-3xl p-6 text-center shadow-2xl relative transform md:-translate-y-6">
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-slate-950 font-black flex items-center justify-center text-xl shadow-2xl border-2 border-amber-200 animate-bounce">
                  👑 1
                </div>
                <div className="w-20 h-20 mx-auto mt-3 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 p-1 shadow-xl">
                  <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center font-black text-2xl text-amber-300">
                    {top1?.student.fullName.charAt(0)}
                  </div>
                </div>
                <div className="inline-block bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-black px-3 py-0.5 rounded-full mt-2">
                  فارس الصدارة الذهبي 🥇
                </div>
                <h3 className="font-black text-lg sm:text-xl text-white mt-2 truncate">{top1?.student.fullName}</h3>
                <p className="text-xs text-amber-200/80 font-bold mt-0.5">{top1?.student.halaqahName || "حلقة غير محددة"}</p>
                <div className="mt-4 pt-4 border-t border-amber-400/30 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">مجموع الآيات</span>
                    <span className="font-black text-amber-300 text-sm">{top1?.stats.totalAyahs}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">سلسلة التميز</span>
                    <span className="font-black text-orange-400 text-sm flex items-center justify-center gap-0.5">
                      <Flame className="w-3.5 h-3.5" />
                      <span>{top1?.stats.streak}</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">النقاط</span>
                    <span className="font-black text-emerald-400 text-sm">{(top1?.student as any)?.totalPoints || 0}</span>
                  </div>
                </div>
              </div>

              {/* 3rd Place: Bronze */}
              <div className="order-3 bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-amber-700/40 rounded-3xl p-5 text-center shadow-xl relative transform md:-translate-y-2">
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-amber-700 text-white font-black flex items-center justify-center text-base shadow-lg border-2 border-amber-500">
                  🥉 3
                </div>
                <div className="w-16 h-16 mx-auto mt-2 rounded-full bg-slate-700 border-2 border-amber-700 flex items-center justify-center font-black text-xl text-amber-200 shadow-inner">
                  {top3?.student.fullName.charAt(0)}
                </div>
                <h3 className="font-black text-base sm:text-lg text-white mt-3 truncate">{top3?.student.fullName}</h3>
                <p className="text-xs text-slate-400 font-bold mt-0.5">{top3?.student.halaqahName || "حلقة غير محددة"}</p>
                <div className="mt-4 pt-3 border-t border-slate-700/80 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">مجموع الآيات</span>
                    <span className="font-black text-slate-200">{top3?.stats.totalAyahs} آية</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">نسبة الإتقان</span>
                    <span className="font-black text-emerald-400">{top3?.masteryRate}%</span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* Full Knights Table */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-4 sm:p-6 shadow-xl">
            <h3 className="font-black text-sm sm:text-base text-white mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>قائمة فرسان المرحلة المتميزين ({stageKnights.length})</span>
              </span>
              <span className="text-xs text-slate-400 font-normal">يتم التحديث تلقائياً مع رصد كل جلسة</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 font-bold text-[11px]">
                    <th className="py-2.5 px-3">الترتيب</th>
                    <th className="py-2.5 px-3">اسم الطالب</th>
                    <th className="py-2.5 px-3">الحلقة</th>
                    <th className="py-2.5 px-3 text-center">آيات الحفظ</th>
                    <th className="py-2.5 px-3 text-center">آيات المراجعة</th>
                    <th className="py-2.5 px-3 text-center">سلسلة التميز</th>
                    <th className="py-2.5 px-3 text-center">نسبة الإتقان</th>
                    <th className="py-2.5 px-3 text-center">النقاط</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {stageKnights.map((k, idx) => (
                    <tr
                      key={k.student.id}
                      className={`hover:bg-slate-700/40 transition-colors ${
                        idx < 3 ? "bg-amber-500/5 font-bold" : ""
                      }`}
                    >
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-black text-xs ${
                            idx === 0
                              ? "bg-amber-400 text-slate-950"
                              : idx === 1
                              ? "bg-slate-300 text-slate-900"
                              : idx === 2
                              ? "bg-amber-700 text-white"
                              : "bg-slate-700 text-slate-300"
                          }`}
                        >
                          {idx + 1}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-bold text-white block">{k.student.fullName}</span>
                        <span className="text-[10px] text-slate-400">السورة الحالية: {k.student.currentSurah || "—"}</span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-slate-300 font-medium">
                        {k.student.halaqahName || "حلقة غير محددة"}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-center font-bold text-amber-300">
                        {k.stats.memorizedAyahs}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-center font-bold text-teal-300">
                        {k.stats.revisedAyahs}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-center">
                        <span className="inline-flex items-center gap-1 font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
                          <Flame className="w-3 h-3" />
                          <span>{k.stats.streak} أيام</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-center">
                        <span className="font-black text-emerald-400">{k.masteryRate}%</span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-center font-black text-amber-400">
                        {(k.student as any).totalPoints || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DAILY PULSE GRID */}
      {activeTab === "pulse" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-base sm:text-lg text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              <span>نبض الحلقات القرآنية اليوم ({halaqahsPulse.length} حلقة)</span>
            </h3>
            <span className="text-xs text-slate-400 font-bold">التاريخ: {selectedDate}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {halaqahsPulse.map((hp) => (
              <div
                key={hp.halaqah.id}
                className="bg-slate-800/80 border border-slate-700/80 hover:border-emerald-500/50 rounded-2xl p-4 transition-all shadow-lg space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-black text-sm text-white">{hp.halaqah.name}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">المعلم: {hp.teacherName}</p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      hp.completionRate === 100
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                        : hp.completionRate > 0
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                        : "bg-slate-700 text-slate-400 border-slate-600"
                    }`}
                  >
                    {hp.completionRate}% إنجاز
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${hp.completionRate}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-slate-700/60">
                  <div className="bg-slate-900/60 p-2 rounded-xl">
                    <span className="text-[10px] text-slate-400 block">حضور</span>
                    <span className="font-black text-white">{hp.attendedCount}/{hp.studentsCount}</span>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded-xl">
                    <span className="text-[10px] text-slate-400 block">تسميع</span>
                    <span className="font-black text-emerald-400">{hp.recordedCount} جلسة</span>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded-xl">
                    <span className="text-[10px] text-slate-400 block">آيات اليوم</span>
                    <span className="font-black text-amber-300">{hp.totalAyahsToday} آية</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: LIVE FEED */}
      {activeTab === "live_feed" && (
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-700 pb-3">
            <h3 className="font-black text-base text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-400" />
              <span>سجل التسميع والرصد اللحظي المباشر لليوم ({liveFeed.length})</span>
            </h3>
            <span className="text-xs text-emerald-400 flex items-center gap-1 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              متزامن لحظياً
            </span>
          </div>

          {liveFeed.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              لم يتم رصد أي جلسات تسميع لهذا التاريخ حتى الآن.
            </div>
          ) : (
            <div className="space-y-2">
              {liveFeed.map((rec) => {
                const stu = students.find((s) => s.id === rec.studentId);
                const isExcellent =
                  rec.memorization?.evaluation === "excellent" || rec.memorization?.evaluation === "متقن";

                return (
                  <div
                    key={rec.id}
                    className="p-3 bg-slate-900/70 border border-slate-700/70 hover:border-slate-600 rounded-2xl flex items-center justify-between text-xs transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                          isExcellent ? "bg-amber-500/20 text-amber-300" : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        {isExcellent ? "🌟" : "📖"}
                      </div>
                      <div>
                        <span className="font-bold text-white block">{stu?.fullName || "طالب"}</span>
                        <span className="text-[10px] text-slate-400">
                          {stu?.halaqahName || "الحلقة"} — الحفظ: {rec.memorization?.surahTo || "—"} ({rec.memorization?.ayahTo || "—"})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-right">
                      {rec.memorization?.evaluation && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                            isExcellent
                              ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                              : "bg-slate-800 text-slate-300 border-slate-700"
                          }`}
                        >
                          {rec.memorization.evaluation}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-500 font-mono">{rec.date}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
