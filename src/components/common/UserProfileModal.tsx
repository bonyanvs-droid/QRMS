import React, { useState } from "react";
import {
  X,
  User,
  Phone,
  KeyRound,
  Shield,
  Building,
  GraduationCap,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Save,
  Lock,
  Eye,
  EyeOff,
  Users,
} from "lucide-react";
import { useApp } from "../../context/AppContext";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const {
    currentUser,
    updateUser,
    changePassword,
    activeTenant,
    halaqahs,
    students,
    stages,
  } = useApp();

  const [activeTab, setActiveTab] = useState<"info" | "security">("info");
  const [name, setName] = useState(currentUser?.name || "");
  const [phone, setPhone] = useState(currentUser?.phone || "");
  const [email, setEmail] = useState(currentUser?.email || "");

  // Password state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Status message
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen || !currentUser) return null;

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "system_admin":
        return { label: "مدير المنصة العام", cls: "bg-purple-100 text-purple-900 border-purple-200" };
      case "campus_admin":
      case "admin":
        return { label: "مدير المجمع", cls: "bg-emerald-100 text-emerald-900 border-emerald-200" };
      case "supervisor":
        return { label: "مشرف تربوي", cls: "bg-blue-100 text-blue-900 border-blue-200" };
      case "teacher":
        return { label: "معلم حلقة", cls: "bg-amber-100 text-amber-900 border-amber-200" };
      case "parent":
        return { label: "ولي أمر", cls: "bg-teal-100 text-teal-900 border-teal-200" };
      case "student":
        return { label: "طالب", cls: "bg-indigo-100 text-indigo-900 border-indigo-200" };
      default:
        return { label: role, cls: "bg-slate-100 text-slate-800 border-slate-200" };
    }
  };

  const roleMeta = getRoleBadge(currentUser.role);

  // Linked items for context
  const userHalaqah = halaqahs.find((h) => h.id === currentUser.halaqahId || h.teacherId === currentUser.id);
  const assistantHalaqahs = halaqahs.filter((h) =>
    h.assistantTeachers?.some((a) => a.id === currentUser.id)
  );

  const linkedStudents = currentUser.role === "parent"
    ? students.filter(
        (s) =>
          (currentUser.studentIds && currentUser.studentIds.includes(s.id)) ||
          (currentUser.phone && (s.parentPhone === currentUser.phone || s.motherPhone === currentUser.phone))
      )
    : [];

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setStatus({ type: "error", text: "يرجى كتابة الاسم كاملاً." });
      return;
    }

    setIsSaving(true);
    setStatus(null);

    try {
      await updateUser(currentUser.id, {
        name: name.trim(),
        fullName: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      });

      setStatus({ type: "success", text: "تم تحديث بيانات الملف الشخصي بنجاح ✓" });
    } catch (err: any) {
      setStatus({ type: "error", text: err?.message || "حدث خطأ أثناء حفظ التعديلات." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setStatus({ type: "error", text: "يجب ألا تقل كلمة المرور الجديدة عن 6 خانات." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatus({ type: "error", text: "كلمة المرور وتأكيدها غير متطابقين." });
      return;
    }

    setIsSaving(true);
    setStatus(null);

    try {
      const ok = await changePassword(newPassword);
      if (ok) {
        setStatus({ type: "success", text: "تم تغيير كلمة المرور بنجاح ✓" });
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setStatus({ type: "error", text: "تعذر تغيير كلمة المرور، يرجى المحاولة لاحقاً." });
      }
    } catch (err: any) {
      setStatus({ type: "error", text: err?.message || "حدث خطأ أثناء تحديث كلمة المرور." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/15 border border-white/20 flex items-center justify-center text-white font-black text-lg shadow-inner shrink-0">
              {currentUser.name ? currentUser.name.charAt(0) : <User className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg leading-tight flex items-center gap-2">
                <span>{currentUser.name}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleMeta.cls}`}>
                  {roleMeta.label}
                </span>
              </h3>
              <p className="text-xs text-emerald-100/80 mt-0.5 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5" />
                <span>{activeTenant?.name || "المجمع القرآني"}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 px-4 pt-2 gap-2 text-xs font-bold">
          <button
            onClick={() => {
              setActiveTab("info");
              setStatus(null);
            }}
            className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "info"
                ? "border-emerald-600 text-emerald-800"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <User className="w-4 h-4" />
            <span>بيانات الحساب</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("security");
              setStatus(null);
            }}
            className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "security"
                ? "border-emerald-600 text-emerald-800"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>الأمان وكلمة المرور</span>
          </button>
        </div>

        {/* Status Notification */}
        {status && (
          <div
            className={`p-3 text-xs font-bold flex items-center gap-2 border-b ${
              status.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-rose-50 text-rose-800 border-rose-200"
            }`}
          >
            {status.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{status.text}</span>
          </div>
        )}

        <div className="p-4 sm:p-5 max-h-[70vh] overflow-y-auto space-y-4">
          {activeTab === "info" ? (
            <form onSubmit={handleSaveInfo} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الكامل:</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pr-9 pl-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Phone & Login Identifier */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  رقم الجوال (اسم المستخدم للدخول):
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                  <input
                    type="tel"
                    dir="ltr"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="05xxxxxxxx"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pr-9 pl-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-right"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  💡 تغيير رقم الجوال سيحدث معرف الدخول تلقائياً، ويحافظ على ربط الحساب دون أي فقدان للبيانات.
                </p>
              </div>

              {/* National ID / Read-only if present */}
              {currentUser.nationalId && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهوية الوطنية:</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={currentUser.nationalId}
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 cursor-not-allowed text-right"
                  />
                </div>
              )}

              {/* Context Summary Box */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                <span className="font-black text-slate-700 block">ارتباطات الحساب والصلاحيات:</span>
                {currentUser.role === "teacher" && (
                  <div className="space-y-1 text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>الحلقة الأساسية: <strong>{userHalaqah?.name || "غير محدد"}</strong></span>
                    </div>
                    {assistantHalaqahs.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>معلم مساعد في: <strong>{assistantHalaqahs.map((h) => h.name).join("، ")}</strong></span>
                      </div>
                    )}
                  </div>
                )}

                {currentUser.role === "parent" && (
                  <div className="space-y-1 text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span>الأبناء المرتبطون: <strong>{linkedStudents.length} طالب</strong></span>
                    </div>
                    {linkedStudents.length > 0 && (
                      <div className="text-[11px] text-slate-500 pr-5 space-y-0.5">
                        {linkedStudents.map((s) => (
                          <div key={s.id}>• {s.name} ({s.halaqahName || "حلقة غير محددة"})</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {currentUser.role === "supervisor" && (
                  <div className="text-slate-600 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>نطاق الإشراف التربوي المعتمد مفعل على حلقات المجمع.</span>
                  </div>
                )}
              </div>

              {/* Save Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? "جاري الحفظ..." : "حفظ التعديلات"}</span>
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              {/* New Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">كلمة المرور الجديدة:</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                  <input
                    type={showPassword ? "text" : "password"}
                    dir="ltr"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pr-9 pl-10 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-left"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">تأكيد كلمة المرور الجديدة:</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                  <input
                    type={showPassword ? "text" : "password"}
                    dir="ltr"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pr-9 pl-10 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-left"
                    required
                  />
                </div>
              </div>

              {/* Submit Password Change */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{isSaving ? "جاري التحديث..." : "تحديث كلمة المرور"}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
