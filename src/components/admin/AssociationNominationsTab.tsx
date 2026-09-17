import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  TrackNomination,
  TrackNominationStatus,
  TrackDefinition,
  AssociationNomination,
} from '../../types';
import {
  Award,
  Search,
  Plus,
  CheckCircle,
  RotateCcw,
  Clock,
  Printer,
  X,
  FileText,
  User,
  Sparkles,
  BookOpen,
  MessageCircle,
  Sliders,
  Send,
  UserCheck,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { generateDirectWhatsAppUrl, dispatchWhatsAppMessage } from '../../lib/whatsappCloudApi';

export const AssociationNominationsTab: React.FC = () => {
  const {
    activeTenantId,
    activeTenant,
    tracks,
    trackNominations,
    saveTrackNomination,
    updateTrackNominationStatus,
    associationNominations,
    nominateStudentForAssociation,
    updateNominationStatus,
    students,
    halaqahs,
    teachers,
    users,
    currentUser,
  } = useApp();

  const [selectedTrackId, setSelectedTrackId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TrackNominationStatus | 'all'>('all');

  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isAssignExaminerModalOpen, setIsAssignExaminerModalOpen] = useState(false);
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  const [isSupervisorReviewModalOpen, setIsSupervisorReviewModalOpen] = useState(false);
  const [isAssociationResultModalOpen, setIsAssociationResultModalOpen] = useState(false);
  const [isPrintCardModalOpen, setIsPrintCardModalOpen] = useState(false);

  // Active item for modals
  const [activeNomination, setActiveNomination] = useState<TrackNomination | null>(null);

  // Form State: New Nomination
  const [formTrackId, setFormTrackId] = useState<string>('track_quran');
  const [formStudentId, setFormStudentId] = useState<string>('');
  const [formTargetBranch, setFormTargetBranch] = useState<string>('');
  const [formTeacherNotes, setFormTeacherNotes] = useState<string>('');
  const [formRubricScores, setFormRubricScores] = useState<Record<string, number>>({});

  const visibleTeachers = useMemo(() => {
    return teachers.filter(
      (t) =>
        t.tenantId === activeTenantId ||
        (!t.tenantId && activeTenantId === 'ghazzawi') ||
        halaqahs.some((h) => h.teacherId === t.id && (h.tenantId === activeTenantId || (!h.tenantId && activeTenantId === 'ghazzawi')))
    );
  }, [teachers, activeTenantId, halaqahs]);

  // Structured Candidate Examiners (Teachers, Quran Supervisors, General Supervisors & Admins)
  const candidateExaminers = useMemo(() => {
    const quranSupervisors: { id: string; name: string; title: string; category: 'quran_supervisor'; isStudentTeacher?: boolean }[] = [];
    const generalSupervisors: { id: string; name: string; title: string; category: 'general_supervisor'; isStudentTeacher?: boolean }[] = [];
    const neutralTeachers: { id: string; name: string; title: string; category: 'teacher'; isStudentTeacher?: boolean }[] = [];
    const addedIds = new Set<string>();

    // 1. Quran Supervisors (مشرف قرآني / مسارات)
    (users || [])
      .filter(
        (u) =>
          u.isActive !== false &&
          (!u.tenantId || u.tenantId === activeTenantId || activeTenantId === 'ghazzawi') &&
          (u.role === 'supervisor' || u.staffRole === 'supervisor') &&
          (u.supervisorScope?.type === 'quran_supervisor' ||
            u.supervisorScope?.type === 'spelling_supervisor' ||
            u.name.includes('قرآن') ||
            u.name.includes('القرآن') ||
            u.name.includes('محكم') ||
            u.name.includes('إقراء'))
      )
      .forEach((s) => {
        if (!addedIds.has(s.id)) {
          addedIds.add(s.id);
          quranSupervisors.push({
            id: s.id,
            name: s.name || s.fullName || 'مشرف قرآني',
            title: 'مشرف مسار قرآني ومحكم معتمد',
            category: 'quran_supervisor',
          });
        }
      });

    // 2. General Supervisors & Campus Admins (مشرف عام / إدارة المجمع)
    (users || [])
      .filter(
        (u) =>
          u.isActive !== false &&
          (!u.tenantId || u.tenantId === activeTenantId || activeTenantId === 'ghazzawi') &&
          (u.role === 'admin' ||
            u.role === 'campus_admin' ||
            u.role === 'system_admin' ||
            (u.role === 'supervisor' && (u.supervisorScope?.type === 'general_supervisor' || !u.supervisorScope?.type)))
      )
      .forEach((s) => {
        if (!addedIds.has(s.id)) {
          addedIds.add(s.id);
          generalSupervisors.push({
            id: s.id,
            name: s.name || s.fullName || 'مشرف عام',
            title: s.role === 'admin' || s.role === 'campus_admin' ? 'إدارة المجمع' : 'مشرف تربوي عام',
            category: 'general_supervisor',
          });
        }
      });

    // 3. Teachers from halaqahs (معلمو الحلقات - مختبر محايد)
    visibleTeachers.forEach((t) => {
      if (!addedIds.has(t.id)) {
        addedIds.add(t.id);
        const isStudentTeacher = activeNomination?.teacherId === t.id;
        neutralTeachers.push({
          id: t.id,
          name: t.name,
          title: isStudentTeacher ? 'معلم الطالب الأساسي (غير محايد)' : 'معلم حلقة (مختبر محايد)',
          category: 'teacher',
          isStudentTeacher,
        });
      }
    });

    return {
      quranSupervisors,
      generalSupervisors,
      neutralTeachers,
      all: [...quranSupervisors, ...generalSupervisors, ...neutralTeachers],
    };
  }, [users, visibleTeachers, activeTenantId, activeNomination]);

  // Examiner Assignment State
  const [selectedExaminerId, setSelectedExaminerId] = useState<string>('');
  const [examinerFilterType, setExaminerFilterType] = useState<'all' | 'teacher' | 'quran_supervisor' | 'general_supervisor'>('all');
  const [assignedExamDate, setAssignedExamDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Examiner Scoring State
  const [examRubricScores, setExamRubricScores] = useState<Record<string, number>>({});
  const [examinerNotes, setExaminerNotes] = useState<string>('');

  // Supervisor Review State
  const [supervisorDecision, setSupervisorDecision] = useState<'approved' | 'returned'>('approved');
  const [supervisorFeedback, setSupervisorFeedback] = useState<string>('مستوفٍ للشروط ومعتمد للرفع لاختبارات الجمعية');

  // Association Result State
  const [associationFinalScore, setAssociationFinalScore] = useState<number>(95);
  const [associationCertNumber, setAssociationCertNumber] = useState<string>('');
  const [associationGrade, setAssociationGrade] = useState<string>('ممتاز مرتفع');

  // Unified list of nominations (merging trackNominations + legacy associationNominations safely)
  const unifiedNominations = useMemo<TrackNomination[]>(() => {
    const list: TrackNomination[] = [...(trackNominations || [])];

    // Merge any legacy association nominations if not already in trackNominations
    const existingIds = new Set(list.map((n) => n.id));
    (associationNominations || []).forEach((legacy) => {
      if (!existingIds.has(legacy.id)) {
        let mappedStatus: TrackNominationStatus = 'submitted';
        if (legacy.supervisorStatus === 'approved') mappedStatus = 'approved_for_association';
        if (legacy.supervisorStatus === 'returned') mappedStatus = 'returned_for_revision';

        list.push({
          id: legacy.id,
          tenantId: legacy.tenantId,
          trackId: legacy.nominationType === 'spelling_mastery' ? 'track_spelling' : 'track_quran',
          trackName: legacy.nominationType === 'spelling_mastery' ? 'الهجاء القرآني' : 'القرآن الكريم',
          studentId: legacy.studentId,
          studentName: legacy.studentName,
          halaqahId: legacy.halaqahId,
          halaqahName: legacy.halaqahName,
          teacherId: legacy.teacherId,
          teacherName: legacy.teacherName,
          targetBranchOrLevel: legacy.targetTitle,
          status: mappedStatus,
          createdAt: legacy.createdAt,
          updatedAt: legacy.updatedAt,
          nominationCardNumber: legacy.nominationCardNumber,
          internalExam: {
            examinerId: legacy.teacherId,
            examinerName: legacy.teacherName,
            examDate: legacy.createdAt,
            scores: { general: legacy.internalExamScore },
            totalScore: legacy.internalExamScore,
            passed: legacy.internalExamScore >= 85,
            recommendation: legacy.internalExamScore >= 85 ? 'nominate' : 'reinforce',
            notes: legacy.teacherNotes,
          },
          supervisorApproval: {
            supervisorId: 'legacy_supervisor',
            supervisorName: legacy.supervisorNotes ? 'المشرف' : undefined,
            approvedAt: legacy.updatedAt,
            notes: legacy.supervisorNotes,
          },
        });
      }
    });

    return list.filter((n) => !activeTenantId || n.tenantId === activeTenantId);
  }, [trackNominations, associationNominations, activeTenantId]);

  // Filtered nominations
  const filteredNominations = useMemo(() => {
    return unifiedNominations.filter((n) => {
      const matchesTrack = selectedTrackId === 'all' || n.trackId === selectedTrackId;
      const matchesStatus = statusFilter === 'all' || n.status === statusFilter;
      const matchesSearch =
        n.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.halaqahName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.targetBranchOrLevel.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesTrack && matchesStatus && matchesSearch;
    });
  }, [unifiedNominations, selectedTrackId, statusFilter, searchQuery]);

  // Metrics
  const metrics = useMemo(() => {
    const total = unifiedNominations.length;
    const submitted = unifiedNominations.filter((n) => n.status === 'submitted').length;
    const testing = unifiedNominations.filter(
      (n) => n.status === 'examiner_assigned' || n.status === 'internal_exam_completed'
    ).length;
    const approved = unifiedNominations.filter((n) => n.status === 'approved_for_association').length;
    const completed = unifiedNominations.filter((n) => n.status === 'association_completed').length;
    const returned = unifiedNominations.filter((n) => n.status === 'returned_for_revision').length;

    return { total, submitted, testing, approved, completed, returned };
  }, [unifiedNominations]);

  // Handle open create modal
  const handleOpenNewNomination = () => {
    const activeTrack = tracks.find((t) => t.id === formTrackId) || tracks[0];
    const tenantStudents = students.filter((s) => !activeTenantId || s.tenantId === activeTenantId);

    if (tenantStudents.length > 0) {
      setFormStudentId(tenantStudents[0].id);
    }
    if (activeTrack?.nominationConfig?.branchesOrLevels?.length) {
      setFormTargetBranch(activeTrack.nominationConfig.branchesOrLevels[0]);
    } else {
      setFormTargetBranch('جزء عم كاملاً');
    }

    // Default rubric scores
    const initialRubric: Record<string, number> = {};
    activeTrack?.nominationConfig?.rubricItems?.forEach((item) => {
      initialRubric[item.id] = Math.round(item.maxScore * 0.95);
    });
    setFormRubricScores(initialRubric);
    setFormTeacherNotes('متقن لأحكام التجويد ومخارج الحروف، مرشح للاختبار.');
    setIsNewModalOpen(true);
  };

  // Submit new nomination
  const handleCreateNomination = async (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find((s) => s.id === formStudentId);
    if (!student) return;

    const track = tracks.find((t) => t.id === formTrackId) || tracks[0];
    const halaqah = halaqahs.find((h) => h.id === student.halaqahId);
    const teacher = teachers.find((t) => t.id === student.teacherId);

    // Calculate total score from rubric
    const rubricItems = track.nominationConfig.rubricItems || [];
    let totalScore = 0;
    let maxTotal = 0;
    const rubricScoresArray = rubricItems.map((item) => {
      const score = formRubricScores[item.id] ?? Math.round(item.maxScore * 0.9);
      totalScore += score;
      maxTotal += item.maxScore;
      return {
        rubricItemId: item.id,
        label: item.label,
        maxScore: item.maxScore,
        score,
      };
    });

    const calculatedPercentage = maxTotal > 0 ? Math.round((totalScore / maxTotal) * 100) : 95;
    const isPassed = calculatedPercentage >= track.nominationConfig.passingScore;

    const newNom: Omit<TrackNomination, 'id' | 'createdAt' | 'status'> = {
      tenantId: activeTenantId || student.tenantId || 'ghazzawi',
      trackId: track.id,
      trackName: track.name,
      studentId: student.id,
      studentName: student.name,
      halaqahId: student.halaqahId,
      halaqahName: halaqah?.name || student.halaqahName || 'الحلقة القرآنية',
      teacherId: student.teacherId,
      teacherName: teacher?.name || student.teacherName || 'معلم الحلقة',
      targetBranchOrLevel: formTargetBranch,
      internalExam: {
        examinerId: teacher?.id || 'pending',
        examinerName: teacher?.name || 'معلم الحلقة',
        examDate: new Date().toISOString().split('T')[0],
        scores: formRubricScores,
        totalScore: calculatedPercentage,
        passed: isPassed,
        recommendation: isPassed ? 'nominate' : 'reinforce',
        notes: formTeacherNotes,
        rubricSnapshot: rubricItems,
      },
      updatedAt: new Date().toISOString(),
    };

    await saveTrackNomination(newNom);

    // Also mirror to legacy for backwards compatibility
    await nominateStudentForAssociation({
      tenantId: newNom.tenantId,
      studentId: newNom.studentId,
      studentName: newNom.studentName,
      halaqahId: newNom.halaqahId,
      halaqahName: newNom.halaqahName,
      teacherId: newNom.teacherId,
      teacherName: newNom.teacherName,
      nominationType: track.code === 'SPELLING' ? 'spelling_mastery' : 'juz_completion',
      targetTitle: newNom.targetBranchOrLevel,
      internalExamScore: calculatedPercentage,
      teacherRecommendation: isPassed ? 'recommended' : 'needs_reinforcement',
      teacherNotes: formTeacherNotes,
      updatedAt: new Date().toISOString(),
    });

    setIsNewModalOpen(false);
  };

  // Assign Examiner
  const handleOpenAssignExaminer = (nom: TrackNomination) => {
    setActiveNomination(nom);
    setExaminerFilterType('all');
    // Default to existing examiner or a neutral teacher/supervisor
    if (nom.internalExam?.examinerId) {
      setSelectedExaminerId(nom.internalExam.examinerId);
    } else {
      const neutralTeacher = candidateExaminers.neutralTeachers.find((t) => !t.isStudentTeacher);
      const firstQuranSup = candidateExaminers.quranSupervisors[0];
      setSelectedExaminerId(neutralTeacher?.id || firstQuranSup?.id || candidateExaminers.all[0]?.id || '');
    }
    setAssignedExamDate(nom.internalExam?.examDate || new Date().toISOString().split('T')[0]);
    setIsAssignExaminerModalOpen(true);
  };

  const handleConfirmAssignExaminer = async () => {
    if (!activeNomination) return;
    const examiner =
      candidateExaminers.all.find((e) => e.id === selectedExaminerId) ||
      teachers.find((t) => t.id === selectedExaminerId) ||
      users.find((u) => u.id === selectedExaminerId);

    const examinerName = examiner?.name || 'مختبر المجمع';

    await updateTrackNominationStatus(activeNomination.id, 'examiner_assigned', {
      internalExam: activeNomination.internalExam
        ? {
            ...activeNomination.internalExam,
            examinerId: selectedExaminerId,
            examinerName: examinerName,
            examDate: assignedExamDate,
          }
        : {
            examinerId: selectedExaminerId,
            examinerName: examinerName,
            examDate: assignedExamDate,
            scores: {},
            totalScore: 0,
            passed: false,
            recommendation: 'reinforce',
          },
    });

    setIsAssignExaminerModalOpen(false);
  };

  // Open Score Rubric Modal
  const handleOpenScoreModal = (nom: TrackNomination) => {
    setActiveNomination(nom);
    const track = tracks.find((t) => t.id === nom.trackId) || tracks[0];

    // Load initial rubric scores
    const initialScores: Record<string, number> = {};
    if (nom.internalExam?.scores) {
      Object.assign(initialScores, nom.internalExam.scores);
    } else {
      track.nominationConfig.rubricItems.forEach((r) => {
        initialScores[r.id] = Math.round(r.maxScore * 0.95);
      });
    }
    setExamRubricScores(initialScores);
    setExaminerNotes(nom.internalExam?.notes || 'تم تقييم الطالب داخلياً وهو مؤهل للاختبار');
    setIsScoreModalOpen(true);
  };

  const handleConfirmExamScore = async () => {
    if (!activeNomination) return;
    const track = tracks.find((t) => t.id === activeNomination.trackId) || tracks[0];
    const rubricItems = track.nominationConfig.rubricItems || [];

    let totalScore = 0;
    let maxTotal = 0;
    rubricItems.forEach((item) => {
      const score = examRubricScores[item.id] ?? item.maxScore;
      totalScore += score;
      maxTotal += item.maxScore;
    });

    const calculatedPercentage = maxTotal > 0 ? Math.round((totalScore / maxTotal) * 100) : 95;
    const isPassed = calculatedPercentage >= track.nominationConfig.passingScore;

    await updateTrackNominationStatus(activeNomination.id, 'internal_exam_completed', {
      internalExam: {
        examinerId: activeNomination.internalExam?.examinerId || currentUser?.id || 'examiner',
        examinerName: activeNomination.internalExam?.examinerName || currentUser?.name || 'المختبر الداخلي',
        examDate: new Date().toISOString().split('T')[0],
        scores: examRubricScores,
        totalScore: calculatedPercentage,
        passed: isPassed,
        recommendation: isPassed ? 'nominate' : 'reinforce',
        notes: examinerNotes,
        rubricSnapshot: rubricItems,
      },
    });

    setIsScoreModalOpen(false);
  };

  // Supervisor Review
  const handleOpenSupervisorReview = (nom: TrackNomination) => {
    setActiveNomination(nom);
    setSupervisorDecision('approved');
    setSupervisorFeedback('مستوفٍ للشروط ومعتمد للرفع لاختبارات الجمعية');
    setIsSupervisorReviewModalOpen(true);
  };

  const handleConfirmSupervisorReview = async () => {
    if (!activeNomination) return;

    if (supervisorDecision === 'approved') {
      const cardNumber = `NOM-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      await updateTrackNominationStatus(activeNomination.id, 'approved_for_association', {
        nominationCardNumber: cardNumber,
        supervisorApproval: {
          supervisorId: currentUser?.id || 'supervisor',
          supervisorName: currentUser?.name || 'المشرف التربوي',
          approvedAt: new Date().toISOString(),
          notes: supervisorFeedback,
        },
      });

      // Update legacy if exists
      await updateNominationStatus(activeNomination.id, 'approved', supervisorFeedback);
    } else {
      await updateTrackNominationStatus(activeNomination.id, 'returned_for_revision', {
        supervisorApproval: {
          supervisorId: currentUser?.id || 'supervisor',
          supervisorName: currentUser?.name || 'المشرف التربوي',
          approvedAt: new Date().toISOString(),
          notes: supervisorFeedback,
        },
      });
      await updateNominationStatus(activeNomination.id, 'returned', supervisorFeedback);
    }

    setIsSupervisorReviewModalOpen(false);
  };

  // Record Association Exam Result
  const handleOpenAssociationResult = (nom: TrackNomination) => {
    setActiveNomination(nom);
    setAssociationFinalScore(96);
    setAssociationCertNumber(`CERT-${Math.floor(100000 + Math.random() * 900000)}`);
    setAssociationGrade('ممتاز مرتفع');
    setIsAssociationResultModalOpen(true);
  };

  const handleConfirmAssociationResult = async () => {
    if (!activeNomination) return;

    await updateTrackNominationStatus(activeNomination.id, 'association_completed', {
      associationExam: {
        score: associationFinalScore,
        certificateNumber: associationCertNumber,
        passed: associationFinalScore >= 70,
        examDate: new Date().toISOString(),
        gradeText: associationGrade as any,
      },
    });

    setIsAssociationResultModalOpen(false);
  };

  // WhatsApp Notification Dispatcher
  const handleSendWhatsAppNotification = async (nom: TrackNomination, type: 'nomination' | 'approved' | 'result') => {
    const student = students.find((s) => s.id === nom.studentId);
    const parentPhone = student?.parentPhone || '0500000000';
    const trkName = nom.trackName || tracks.find((t) => t.id === nom.trackId)?.name || 'القرآن الكريم';

    let message = '';
    if (type === 'nomination') {
      message = `السلام عليكم ورحمة الله وبركاته،
ولي أمر الطالب الكريم: ${nom.studentName} حفظه الله،
يطيب لإدارة مجمع ${activeTenant?.name || 'الغزاوي'} إحاطتكم بترشيح ابنكم المبارك لاختبار ${nom.targetBranchOrLevel} ضمن (${trkName}) بدرجة تقييم داخلي ${nom.internalExam?.totalScore || 95}%، سائلين الله له دوام التوفيق والإتقان.`;
    } else if (type === 'approved') {
      message = `بشرى سارة 🌟
ولي أمر الطالب: ${nom.studentName}
يسرنا إبلاغكم باعتماد بطاقة ترشيح ابنكم برقم (${nom.nominationCardNumber || 'NOM-1447'}) لدخول اختبارات جمعية تحفيظ القرآن الكريم الرسمية في (${nom.targetBranchOrLevel}). نسأل الله أن يجعله من أهل القرآن وخاصته.`;
    } else {
      message = `مبارك الاجتياز والتميز 🎉
ولي أمر الطالب: ${nom.studentName}
نبارك لكم اجتياز ابنكم لاختبار جمعية تحفيظ القرآن الكريم في (${nom.targetBranchOrLevel}) بدرجة (${nom.associationExam?.score || 95}%) بتقدير (${nom.associationExam?.gradeText || 'ممتاز مرتفع'}).
رقم الشهادة: ${nom.associationExam?.certificateNumber || 'متاح بالإدارة'}.`;
    }

    await dispatchWhatsAppMessage(parentPhone, message);
  };

  // Status Badge Helper
  const getStatusBadge = (status: TrackNominationStatus) => {
    switch (status) {
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>مرفوع من المعلم</span>
          </span>
        );
      case 'examiner_assigned':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <UserCheck className="w-3.5 h-3.5 text-amber-600" />
            <span>مُسند للمختبر الداخلي</span>
          </span>
        );
      case 'internal_exam_completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
            <span>اكتمل الاختبار الداخلي</span>
          </span>
        );
      case 'approved_for_association':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-700" />
            <span>معتمد للرفع للجمعية</span>
          </span>
        );
      case 'association_completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-xs">
            <Award className="w-3.5 h-3.5" />
            <span>ناجح ومعتمد بالجمعية</span>
          </span>
        );
      case 'returned_for_revision':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
            <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
            <span>معاد للتثبيت والمراجعة</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner - Compact & Mobile-Responsive */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5">
              <span className="bg-emerald-600/70 text-emerald-100 text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full font-bold border border-emerald-400/30">
                منصة الترشيح والاختبارات
              </span>
              {activeTenant?.name && (
                <span className="text-emerald-300 text-[11px] sm:text-xs font-semibold">
                  {activeTenant.name}
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-lg md:text-xl font-black text-white tracking-tight">
              ترشيحات الطلاب والاختبارات الداخلية والرسمية
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-300 mt-1 max-w-xl leading-relaxed hidden sm:block">
              سير عمل متكامل: رفع الترشيح، إسناد المختبر، رصد بنود الاستمارة التقييمية، واعتماد المشرف.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 shrink-0">
            <div className="bg-white/10 backdrop-blur-md px-2.5 py-2 sm:p-3 rounded-xl sm:rounded-2xl border border-white/10 text-center">
              <div className="text-base sm:text-lg md:text-xl font-black text-white">{metrics.total}</div>
              <div className="text-[10px] text-slate-300 font-medium whitespace-nowrap">إجمالي المرشحين</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-2.5 py-2 sm:p-3 rounded-xl sm:rounded-2xl border border-white/10 text-center">
              <div className="text-base sm:text-lg md:text-xl font-black text-amber-300">{metrics.submitted + metrics.testing}</div>
              <div className="text-[10px] text-amber-200 font-medium whitespace-nowrap">قيد التقييم</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-2.5 py-2 sm:p-3 rounded-xl sm:rounded-2xl border border-white/10 text-center">
              <div className="text-base sm:text-lg md:text-xl font-black text-emerald-300">{metrics.approved}</div>
              <div className="text-[10px] text-emerald-200 font-medium whitespace-nowrap">معتمد للجمعية</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-2.5 py-2 sm:p-3 rounded-xl sm:rounded-2xl border border-white/10 text-center">
              <div className="text-base sm:text-lg md:text-xl font-black text-emerald-400">{metrics.completed}</div>
              <div className="text-[10px] text-emerald-200 font-medium whitespace-nowrap">شهادات صادرة</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Track Selector */}
      <div className="bg-white rounded-3xl p-4 md:p-6 border border-slate-200 shadow-xs space-y-4">
        {/* Track Selector Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100">
          <button
            onClick={() => setSelectedTrackId('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              selectedTrackId === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            جميع المسارات ({unifiedNominations.length})
          </button>
          {tracks.map((trk) => {
            const count = unifiedNominations.filter((n) => n.trackId === trk.id).length;
            return (
              <button
                key={trk.id}
                onClick={() => setSelectedTrackId(trk.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                  selectedTrackId === trk.id
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{trk.name}</span>
                <span className="text-[10px] opacity-80">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Search and Status Filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            <input
              type="text"
              placeholder="بحث باسم الطالب أو المقدار..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-emerald-600"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-1 overflow-x-auto">
              {(
                [
                  { id: 'all', label: 'الكل' },
                  { id: 'submitted', label: 'مرفوع' },
                  { id: 'examiner_assigned', label: 'مسند لمختبر' },
                  { id: 'internal_exam_completed', label: 'مختبر داخلياً' },
                  { id: 'approved_for_association', label: 'معتمد' },
                  { id: 'association_completed', label: 'مجتاز بالجمعية' },
                  { id: 'returned_for_revision', label: 'معاد' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    statusFilter === f.id
                      ? 'bg-emerald-800 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleOpenNewNomination}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>ترشيح طالب جديد</span>
            </button>
          </div>
        </div>

        {/* Nominations Cards Grid */}
        {filteredNominations.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
            <Award className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <div className="text-sm font-bold text-slate-700">لا توجد ترشيحات مطابقة</div>
            <p className="text-xs text-slate-400 mt-1">
              يمكنك رفع ترشيح جديد لأي طالب من طلاب المجمع في المسار المختار
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredNominations.map((nom) => (
              <div
                key={nom.id}
                className="p-5 rounded-2xl border border-slate-200 hover:border-emerald-300 bg-white hover:shadow-sm transition-all space-y-3.5"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-sm md:text-base">{nom.studentName}</h4>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        {nom.trackName}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {nom.halaqahName} • المعلم: {nom.teacherName}
                    </div>
                  </div>
                  <div>{getStatusBadge(nom.status)}</div>
                </div>

                {/* Target & Score Box */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="font-bold text-emerald-900">المقدار / الفرع المرشح:</span>
                    <span className="font-bold text-slate-900">{nom.targetBranchOrLevel}</span>
                  </div>

                  {nom.internalExam && (
                    <div className="flex items-center justify-between text-slate-700 pt-1 border-t border-slate-200/60">
                      <span>درجة الاختبار التأهيلي الداخلي:</span>
                      <span className="font-bold text-emerald-700 text-sm">
                        {nom.internalExam.totalScore}%{' '}
                        <span className="text-[10px] font-normal text-slate-500">
                          ({nom.internalExam.passed ? 'مؤهل' : 'بحاجة تثبيت'})
                        </span>
                      </span>
                    </div>
                  )}

                  {nom.internalExam?.examinerName && (
                    <div className="text-[11px] text-slate-500 flex items-center justify-between">
                      <span>المختبر الداخلي: {nom.internalExam.examinerName}</span>
                      {nom.internalExam.examDate && <span>بتاريخ: {nom.internalExam.examDate}</span>}
                    </div>
                  )}

                  {nom.supervisorApproval?.notes && (
                    <div className="text-slate-600 pt-1 border-t border-slate-200/60 text-[11px]">
                      <span className="font-bold text-slate-800">قرار المشرف: </span>
                      {nom.supervisorApproval.notes}
                    </div>
                  )}

                  {nom.associationExam && (
                    <div className="bg-emerald-50 text-emerald-900 p-2 rounded-lg border border-emerald-200 font-semibold text-[11px] flex items-center justify-between">
                      <span>نتيجة الجمعية الرسمية: {nom.associationExam.score}% ({nom.associationExam.gradeText})</span>
                      <span>رقم الشهادة: {nom.associationExam.certificateNumber}</span>
                    </div>
                  )}
                </div>

                {/* Interactive Workflow Actions */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-400">
                    {nom.nominationCardNumber ? `بطاقة: ${nom.nominationCardNumber}` : 'قيد التدقيق'}
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Stage 1: Assign Examiner */}
                    {nom.status === 'submitted' && (
                      <button
                        onClick={() => handleOpenAssignExaminer(nom)}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors"
                      >
                        إسناد مختبر داخلي
                      </button>
                    )}

                    {/* Stage 2: Evaluate Rubric Scores */}
                    {(nom.status === 'examiner_assigned' || nom.status === 'submitted') && (
                      <button
                        onClick={() => handleOpenScoreModal(nom)}
                        className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-colors flex items-center gap-1"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>رصد الاستمارة</span>
                      </button>
                    )}

                    {/* Stage 3: Supervisor Review */}
                    {(nom.status === 'internal_exam_completed' || nom.status === 'submitted') && (
                      <button
                        onClick={() => handleOpenSupervisorReview(nom)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-colors"
                      >
                        اعتماد المشرف
                      </button>
                    )}

                    {/* Stage 4: Association Result */}
                    {nom.status === 'approved_for_association' && (
                      <button
                        onClick={() => handleOpenAssociationResult(nom)}
                        className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition-colors flex items-center gap-1"
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>رصد نتيجة الجمعية</span>
                      </button>
                    )}

                    {/* Print Card */}
                    {(nom.status === 'approved_for_association' || nom.status === 'association_completed') && (
                      <button
                        onClick={() => {
                          setActiveNomination(nom);
                          setIsPrintCardModalOpen(true);
                        }}
                        className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1"
                        title="طباعة بطاقة الترشيح"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* WhatsApp Notification Button */}
                    <button
                      onClick={() =>
                        handleSendWhatsAppNotification(
                          nom,
                          nom.status === 'association_completed'
                            ? 'result'
                            : nom.status === 'approved_for_association'
                            ? 'approved'
                            : 'nomination'
                        )
                      }
                      className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-colors flex items-center gap-1"
                      title="إرسال إشعار واتساب لولي الأمر"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL 1: New Nomination Form */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col p-4 sm:p-6 shadow-2xl border border-slate-200 my-auto overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 sm:p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <Award className="w-4 h-4 sm:w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm sm:text-base">ترشيح طالب لاختبار المسار</h3>
                  <p className="text-[10px] sm:text-xs text-slate-500">{activeTenant?.name || ''}</p>
                </div>
              </div>
              <button onClick={() => setIsNewModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNomination} className="overflow-y-auto pr-1 pl-1 py-2 space-y-3.5 text-xs flex-1">
              {/* Select Track */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">المسار التعليمي</label>
                <select
                  value={formTrackId}
                  onChange={(e) => {
                    const tid = e.target.value;
                    setFormTrackId(tid);
                    const trk = tracks.find((t) => t.id === tid);
                    if (trk?.nominationConfig?.branchesOrLevels?.length) {
                      setFormTargetBranch(trk.nominationConfig.branchesOrLevels[0]);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-emerald-600"
                >
                  {tracks.map((trk) => (
                    <option key={trk.id} value={trk.id}>
                      {trk.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Student */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">الطالب المرشح</label>
                <select
                  value={formStudentId}
                  onChange={(e) => setFormStudentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-emerald-600"
                >
                  {students
                    .filter((s) => !activeTenantId || s.tenantId === activeTenantId)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.halaqahName})
                      </option>
                    ))}
                </select>
              </div>

              {/* Target Branch */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">المقدار أو الفرع المستهدف للترشيح</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    required
                    value={formTargetBranch}
                    onChange={(e) => setFormTargetBranch(e.target.value)}
                    placeholder="مثال: جزء عم، إلى سورة النبأ، المستوى الثاني..."
                    className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-emerald-600"
                  />
                  {tracks.find((t) => t.id === formTrackId)?.nominationConfig?.branchesOrLevels && (
                    <select
                      onChange={(e) => {
                        if (e.target.value) setFormTargetBranch(e.target.value);
                      }}
                      className="w-full sm:w-36 shrink-0 px-2.5 py-2 rounded-xl border border-slate-300 text-slate-600 text-[11px] sm:text-xs truncate bg-slate-50"
                    >
                      <option value="">فروع شائعة...</option>
                      {(tracks.find((t) => t.id === formTrackId)?.nominationConfig?.branchesOrLevels || []).map((b, idx) => (
                        <option key={idx} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Rubric Evaluation Form */}
              <div className="bg-slate-50 p-3 sm:p-3.5 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-800 text-xs">بنود استمارة التقييم التأهيلي الداخلي</h4>
                {tracks
                  .find((t) => t.id === formTrackId)
                  ?.nominationConfig?.rubricItems?.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-2 bg-white p-2 sm:p-2.5 rounded-lg border border-slate-200">
                      <span className="text-slate-700 font-medium text-[11px] sm:text-xs min-w-0 flex-1 leading-snug">{item.label}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="number"
                          min={0}
                          max={item.maxScore}
                          value={formRubricScores[item.id] ?? Math.round(item.maxScore * 0.95)}
                          onChange={(e) =>
                            setFormRubricScores({
                              ...formRubricScores,
                              [item.id]: Number(e.target.value) || 0,
                            })
                          }
                          className="w-14 sm:w-16 px-1.5 sm:px-2 py-1 rounded border border-slate-300 text-center font-bold text-xs"
                        />
                        <span className="text-slate-400 text-[10px] sm:text-[11px]">/ {item.maxScore}</span>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Teacher Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">توصية المعلم وملاحظات الإتقان</label>
                <textarea
                  rows={2}
                  value={formTeacherNotes}
                  onChange={(e) => setFormTeacherNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 resize-none text-xs focus:outline-emerald-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs"
                >
                  رفع طلب الترشيح
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Assign Examiner */}
      {isAssignExaminerModalOpen && activeNomination && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col p-4 sm:p-6 shadow-2xl border border-slate-200 my-auto overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-800 rounded-xl">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">إسناد مختبر داخلي للطالب (الخطوة 2)</h3>
                  <p className="text-[10px] sm:text-xs text-slate-500">معلم محايد أو مشرف قرآني أو مشرف عام</p>
                </div>
              </div>
              <button onClick={() => setIsAssignExaminerModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto pr-1 pl-1 py-2 space-y-3 text-xs flex-1">
              {/* Student & Target Card */}
              <div className="p-3 bg-blue-50/70 rounded-xl text-xs space-y-1 border border-blue-100">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-950 text-sm">{activeNomination.studentName}</span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-200/80 text-blue-900 font-bold text-[10px]">
                    {activeNomination.halaqahName || 'حلقة الطالب'}
                  </span>
                </div>
                <div className="text-blue-800 flex items-center justify-between text-[11px]">
                  <span>المسار: <strong>{activeNomination.trackName}</strong></span>
                  <span>المقدار: <strong>{activeNomination.targetBranchOrLevel}</strong></span>
                </div>
                {activeNomination.teacherName && (
                  <div className="text-[10px] text-blue-700 pt-0.5">
                    معلم الطالب الأساسي: <strong>{activeNomination.teacherName}</strong>
                  </div>
                )}
              </div>

              {/* Category Quick Filter Chips */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">تصفية نوع المختبر المسند إليه:</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setExaminerFilterType('all')}
                    className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all text-center ${
                      examinerFilterType === 'all'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    الكل ({candidateExaminers.all.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setExaminerFilterType('teacher')}
                    className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all text-center ${
                      examinerFilterType === 'teacher'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    معلم محايد ({candidateExaminers.neutralTeachers.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setExaminerFilterType('quran_supervisor')}
                    className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all text-center ${
                      examinerFilterType === 'quran_supervisor'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    مشرف قرآني ({candidateExaminers.quranSupervisors.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setExaminerFilterType('general_supervisor')}
                    className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all text-center ${
                      examinerFilterType === 'general_supervisor'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    مشرف عام ({candidateExaminers.generalSupervisors.length})
                  </button>
                </div>
              </div>

              {/* Examiner Selection */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  اختر المختبر (معلم محايد / مشرف قرآني / مشرف عام)
                </label>
                <select
                  value={selectedExaminerId}
                  onChange={(e) => setSelectedExaminerId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white font-medium"
                >
                  <option value="">-- اختر المختبر من القائمة المعتمدة --</option>

                  {/* Option Group 1: Quran Supervisors */}
                  {(examinerFilterType === 'all' || examinerFilterType === 'quran_supervisor') &&
                    candidateExaminers.quranSupervisors.length > 0 && (
                      <optgroup label="📖 المشرفون القرآنيون والمحكمون">
                        {candidateExaminers.quranSupervisors.map((sup) => (
                          <option key={sup.id} value={sup.id}>
                            📖 {sup.name} ({sup.title})
                          </option>
                        ))}
                      </optgroup>
                    )}

                  {/* Option Group 2: General Supervisors & Management */}
                  {(examinerFilterType === 'all' || examinerFilterType === 'general_supervisor') &&
                    candidateExaminers.generalSupervisors.length > 0 && (
                      <optgroup label="👑 المشرفون العموم وإدارة المجمع">
                        {candidateExaminers.generalSupervisors.map((adm) => (
                          <option key={adm.id} value={adm.id}>
                            👑 {adm.name} ({adm.title})
                          </option>
                        ))}
                      </optgroup>
                    )}

                  {/* Option Group 3: Neutral Teachers */}
                  {(examinerFilterType === 'all' || examinerFilterType === 'teacher') &&
                    candidateExaminers.neutralTeachers.length > 0 && (
                      <optgroup label="👨‍🏫 معلمو الحلقات (مختبر محايد)">
                        {candidateExaminers.neutralTeachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.isStudentTeacher ? '⚠️ ' : '👨‍🏫 '} {t.name} - {t.title}
                          </option>
                        ))}
                      </optgroup>
                    )}
                </select>
              </div>

              {/* Selected Examiner Preview & Policy Alert */}
              {(() => {
                const selected = candidateExaminers.all.find((e) => e.id === selectedExaminerId);
                if (!selected) return null;

                const isNeutral = !selected.isStudentTeacher;

                return (
                  <div className={`p-2.5 rounded-xl border text-[11px] ${
                    isNeutral
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}>
                    <div className="flex items-center gap-1.5 font-bold">
                      {isNeutral ? <CheckCircle2 className="w-4 h-4 text-emerald-700" /> : <Clock className="w-4 h-4 text-amber-700" />}
                      <span>
                        المختبر المسند: <strong>{selected.name}</strong> • {selected.title}
                      </span>
                    </div>
                    <p className="text-[10px] mt-0.5 opacity-90">
                      {isNeutral
                        ? '✓ تم استيفاء شرط المختبر المحايد لضمان أعلى معايير العدالة والموضوعية في التقييم.'
                        : 'تنبيه: تم اختيار معلم الطالب الأساسي. يوصى بإسناد الاختبار لمعلم محايد أو مشرف قرآني.'}
                    </p>
                  </div>
                );
              })()}

              <div>
                <label className="block font-bold text-slate-700 mb-1">موعد جلسة الاختبار الداخلي المحدد</label>
                <input
                  type="date"
                  value={assignedExamDate}
                  onChange={(e) => setAssignedExamDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setIsAssignExaminerModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmAssignExaminer}
                disabled={!selectedExaminerId}
                className="px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-colors"
              >
                تأكيد الإسناد للمختبر
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Examiner Score Rubric */}
      {isScoreModalOpen && activeNomination && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col p-4 sm:p-6 shadow-2xl border border-slate-200 my-auto overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">استمارة رصد درجات الاختبار الداخلي</h3>
              <button onClick={() => setIsScoreModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto pr-1 pl-1 py-2 space-y-3 text-xs flex-1">
              <div className="p-3 bg-purple-50 rounded-xl text-xs space-y-1 border border-purple-100">
                <div className="font-bold text-purple-950">{activeNomination.studentName}</div>
                <div className="text-purple-800">
                  {activeNomination.trackName} • المقدار: {activeNomination.targetBranchOrLevel}
                </div>
              </div>

              {/* Rubric Items Scoring */}
              <div className="bg-slate-50 p-3 sm:p-3.5 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-800 text-xs">بنود التقييم وتوزيع الدرجات</h4>
                {tracks
                  .find((t) => t.id === activeNomination.trackId)
                  ?.nominationConfig?.rubricItems?.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-2 bg-white p-2 sm:p-2.5 rounded-lg border border-slate-200">
                      <span className="text-slate-800 font-semibold text-[11px] sm:text-xs min-w-0 flex-1 leading-snug">{item.label}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="number"
                          min={0}
                          max={item.maxScore}
                          value={examRubricScores[item.id] ?? item.maxScore}
                          onChange={(e) =>
                            setExamRubricScores({
                              ...examRubricScores,
                              [item.id]: Number(e.target.value) || 0,
                            })
                          }
                          className="w-14 sm:w-16 px-1.5 sm:px-2 py-1 rounded border border-slate-300 text-center font-bold text-xs"
                        />
                        <span className="text-slate-400 text-[10px] sm:text-[11px]">/ {item.maxScore}</span>
                      </div>
                    </div>
                  ))}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ملاحظات المختبر الداخلي</label>
                <textarea
                  rows={2}
                  value={examinerNotes}
                  onChange={(e) => setExaminerNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 resize-none text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setIsScoreModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmExamScore}
                className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-xs"
              >
                حفظ نتيجة الاختبار
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Supervisor Approval */}
      {isSupervisorReviewModalOpen && activeNomination && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full max-h-[92vh] flex flex-col p-4 sm:p-6 shadow-2xl border border-slate-200 my-auto overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">اعتماد ترشيح المشرف التربوي</h3>
              <button onClick={() => setIsSupervisorReviewModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto pr-1 pl-1 py-2 space-y-3 text-xs flex-1">
              <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                <div className="font-bold text-slate-900">{activeNomination.studentName}</div>
                <div className="text-slate-600">المسار: {activeNomination.trackName || 'القرآن الكريم'}</div>
                <div className="text-slate-600">المقدار: {activeNomination.targetBranchOrLevel}</div>
                <div className="text-emerald-700 font-bold">الدرجة الداخلية: {activeNomination.internalExam?.totalScore}%</div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">القرار الإشرافي</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSupervisorDecision('approved')}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all text-xs ${
                      supervisorDecision === 'approved'
                        ? 'bg-emerald-100 border-emerald-500 text-emerald-900'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    اعتماد وإصدار بطاقة
                  </button>
                  <button
                    type="button"
                    onClick={() => setSupervisorDecision('returned')}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all text-xs ${
                      supervisorDecision === 'returned'
                        ? 'bg-rose-100 border-rose-500 text-rose-900'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    إعادة للتثبيت
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">توجيهات وملاحظات المشرف</label>
                <input
                  type="text"
                  value={supervisorFeedback}
                  onChange={(e) => setSupervisorFeedback(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setIsSupervisorReviewModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmSupervisorReview}
                className="px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-xs"
              >
                تثبيت القرار
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Association Exam Result */}
      {isAssociationResultModalOpen && activeNomination && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full max-h-[92vh] flex flex-col p-4 sm:p-6 shadow-2xl border border-slate-200 my-auto overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">رصد نتيجة اختبار الجمعية الرسمية</h3>
              <button onClick={() => setIsAssociationResultModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto pr-1 pl-1 py-2 space-y-3 text-xs flex-1">
              <div className="p-3 bg-amber-50 rounded-xl text-xs space-y-1 border border-amber-200">
                <div className="font-bold text-amber-950">{activeNomination.studentName}</div>
                <div className="text-amber-900">
                  {activeNomination.trackName} • {activeNomination.targetBranchOrLevel}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">الدرجة النهائية لاختبار الجمعية (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={associationFinalScore}
                  onChange={(e) => setAssociationFinalScore(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">التقدير</label>
                <select
                  value={associationGrade}
                  onChange={(e) => setAssociationGrade(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                >
                  <option value="ممتاز مرتفع">ممتاز مرتفع</option>
                  <option value="ممتاز">ممتاز</option>
                  <option value="جيد جداً مرتفع">جيد جداً مرتفع</option>
                  <option value="جيد جداً">جيد جداً</option>
                  <option value="جيد">جيد</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">رقم الشهادة الرسمية الصادرة</label>
                <input
                  type="text"
                  value={associationCertNumber}
                  onChange={(e) => setAssociationCertNumber(e.target.value)}
                  placeholder="مثال: CERT-1447-9821"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setIsAssociationResultModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmAssociationResult}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs"
              >
                حفظ النتيجة الرسمية
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: Printable Card */}
      {isPrintCardModalOpen && activeNomination && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col p-4 sm:p-6 shadow-2xl border border-slate-200 my-auto overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">بطاقة ترشيح رسمية لاختبار المسار</h3>
              <button onClick={() => setIsPrintCardModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto pr-1 pl-1 py-2 flex-1">
              <div className="p-4 sm:p-6 border-2 border-emerald-600 rounded-2xl bg-emerald-50/40 text-center space-y-3 sm:space-y-4">
                <div className="text-[10px] sm:text-xs font-bold text-slate-500">المملكة العربية السعودية • وزارة الشؤون الإسلامية</div>
                <div className="text-xs sm:text-sm font-black text-emerald-900">{activeTenant?.name || ''}</div>

                <div className="py-2 border-y border-emerald-300">
                  <div className="text-[11px] sm:text-xs text-slate-600">بطاقة دخول اختبار المسار التعليمي</div>
                  <div className="text-lg sm:text-xl font-black text-slate-900 mt-1">{activeNomination.studentName}</div>
                  <div className="text-[11px] sm:text-xs text-emerald-800 font-bold mt-0.5">
                    {activeNomination.trackName || 'القرآن الكريم'} • {activeNomination.targetBranchOrLevel}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] sm:text-xs text-right bg-white p-2.5 sm:p-3 rounded-xl border border-emerald-200">
                  <div>
                    <span className="text-slate-500">رقم الترشيح: </span>
                    <span className="font-bold text-slate-900">{activeNomination.nominationCardNumber || 'NOM-1447-01'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">درجة التأهيل: </span>
                    <span className="font-bold text-emerald-700">{activeNomination.internalExam?.totalScore}%</span>
                  </div>
                  <div>
                    <span className="text-slate-500">الحلقة: </span>
                    <span className="font-bold text-slate-900">{activeNomination.halaqahName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">المعلم: </span>
                    <span className="font-bold text-slate-900">{activeNomination.teacherName}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 pt-1">
                  <span>ختم إدارة المجمع</span>
                  <span>اعتماد المشرف التربوي</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 shrink-0">
              <button
                onClick={() => window.print()}
                className="w-full py-2.5 px-4 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة بطاقة الترشيح الرسمية</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
