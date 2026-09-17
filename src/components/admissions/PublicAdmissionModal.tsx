import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { RegistrationRequest, StudentGrade, RegistrationPackageType } from '../../types';
import {
  X,
  CheckCircle2,
  UserPlus,
  Phone,
  School,
  AlertCircle,
  IdCard,
  CreditCard,
  FileCheck,
  Info,
  Lock,
} from 'lucide-react';
import {
  DEFAULT_CLOSED_MESSAGE,
  DEFAULT_ADMISSION_FORM_FIELDS,
} from './admissionsFormConfig';

interface PublicAdmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GRADE_OPTIONS: StudentGrade[] = [
  'التمهيدي',
  'الأول ابتدائي',
  'الثاني ابتدائي',
  'الثالث ابتدائي',
  'الرابع ابتدائي',
  'الخامس ابتدائي',
  'السادس ابتدائي',
  'الأول متوسط',
  'الثاني متوسط',
  'الثالث متوسط',
  'الأول ثانوي',
  'الثاني ثانوي',
  'الثالث ثانوي',
];

export const PublicAdmissionModal: React.FC<PublicAdmissionModalProps> = ({ isOpen, onClose }) => {
  const { activeTenant, submitRegistrationRequest } = useApp();

  const cfg = activeTenant?.admissionsConfig;
  const isRegistrationOpen = cfg ? cfg.isOpen : true;
  const closedMessageText =
    cfg?.closedMessage?.trim() || DEFAULT_CLOSED_MESSAGE;

  const fullPrice = cfg?.fullPackagePrice ?? 2000;
  const activitiesPrice = cfg?.activitiesOnlyPrice ?? 1500;
  const quranPrice = cfg?.quranOnlyPrice ?? 1000;
  const phones = cfg?.contactPhones?.length
    ? cfg.contactPhones
    : ['0503049194', '0562018313', '0598145076'];
  const pledgeStr =
    cfg?.pledgeText ||
    'أتعهد أنا ولي أمر الطالب بسداد رسوم اشتراك الابن خلال الأسبوع الاول والثاني من بداية كل فصل دراسي.';

  // Form field visibility, requiredness, and labels configured by admin
  const formFields = {
    ...DEFAULT_ADMISSION_FORM_FIELDS,
    ...(cfg?.formFields || {}),
  };

  const getFieldConfig = (id: string) => {
    return (
      formFields[id] ||
      DEFAULT_ADMISSION_FORM_FIELDS[id] || {
        id,
        label: '',
        visible: true,
        required: false,
      }
    );
  };

  const isFieldVisible = (id: string) => {
    const field = getFieldConfig(id);
    return field.visible ?? true;
  };

  const isFieldRequired = (id: string) => {
    const field = getFieldConfig(id);
    return field.required ?? false;
  };

  const getFieldLabel = (id: string, fallback: string) => {
    const field = getFieldConfig(id);
    return field.customLabel?.trim() || field.label || fallback;
  };

  const currentPackages = [
    {
      id: 'full_package' as RegistrationPackageType,
      title: 'اشتراك كامل (قرآني + أنشطة)',
      price: fullPrice,
      badge: 'الباقة الشاملة',
      schedule: 'الأحد - الأربعاء (بين المغرب والعشاء) + الأنشطة الأسبوعية',
      details:
        'يشمل البرامج القرآنية المكثفة والتربوية (من الأحد إلى الأربعاء بين المغرب والعشاء) + الأنشطة الأسبوعية التفاعلية (يوم الخميس للمرحلة المتوسطة والثانوية، ويوم السبت للمرحلة الابتدائية).',
      isPopular: true,
    },
    {
      id: 'activities_only' as RegistrationPackageType,
      title: 'اشتراك أنشطة أسبوعية فقط',
      price: activitiesPrice,
      badge: 'أنشطة ومهارات',
      schedule: 'يوم الخميس (متوسط/ثانوي) أو السبت (ابتدائي)',
      details:
        'يشمل الأنشطة المهارية والقيمية والرحلات الأسبوعية (يوم الخميس للمرحلة المتوسطة والثانوية، ويوم السبت للمرحلة الابتدائية).',
    },
    {
      id: 'quran_only' as RegistrationPackageType,
      title: 'اشتراك برامج قرآنية فقط',
      price: quranPrice,
      badge: 'حفظ وتلاوة',
      schedule: 'من الأحد إلى الأربعاء (بين المغرب والعشاء)',
      details:
        'يشمل برامج الحفظ والمراجعة والضبط القرآني مع المعلمين المعتمدين (من الأحد إلى الأربعاء بين المغرب والعشاء).',
    },
  ];

  const [formData, setFormData] = useState({
    studentName: '',
    nationalId: '',
    parentName: '',
    parentPhone: '',
    motherPhone: '',
    grade: 'الأول ابتدائي' as StudentGrade,
    registrationType: 'full_package' as RegistrationPackageType,
    feePledgeAccepted: false,
    previouslyRegistered: 'no' as 'yes' | 'no',
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Dynamic validations based on enabled and required fields
    if (isFieldVisible('studentName') && isFieldRequired('studentName') && !formData.studentName.trim()) {
      setError(`يرجى إدخال ${getFieldLabel('studentName', 'اسم الطالب الرباعي')}.`);
      return;
    }

    if (isFieldVisible('nationalId')) {
      if (isFieldRequired('nationalId') && !formData.nationalId.trim()) {
        setError(`يرجى إدخال ${getFieldLabel('nationalId', 'رقم هوية الطالب أو الإقامة')}.`);
        return;
      }
      if (formData.nationalId.trim() && formData.nationalId.trim().length !== 10) {
        setError('رقم هوية الطالب يجب أن يتكون من 10 أرقام.');
        return;
      }
    }

    if (isFieldVisible('parentName') && isFieldRequired('parentName') && !formData.parentName.trim()) {
      setError(`يرجى إدخال ${getFieldLabel('parentName', 'اسم ولي أمر الطالب')}.`);
      return;
    }

    if (isFieldVisible('parentPhone') && isFieldRequired('parentPhone') && !formData.parentPhone.trim()) {
      setError(`يرجى إدخال ${getFieldLabel('parentPhone', 'رقم جوال ولي الأمر (الأب)')}.`);
      return;
    }

    if (isFieldVisible('motherPhone') && isFieldRequired('motherPhone') && !formData.motherPhone.trim()) {
      setError(`يرجى إدخال ${getFieldLabel('motherPhone', 'رقم جوال والدة الطالب')}.`);
      return;
    }

    if (isFieldVisible('feePledge') && isFieldRequired('feePledge') && !formData.feePledgeAccepted) {
      setError('يرجى الموافقة على التعهد بسداد الرسوم لاستكمال التسجيل.');
      return;
    }

    const selectedPkg = currentPackages.find((p) => p.id === formData.registrationType);

    try {
      setIsSubmitting(true);
      setError(null);

      const requestPayload: Omit<RegistrationRequest, 'id' | 'createdAt' | 'status'> = {
        tenantId: activeTenant?.id || 'ghazzawi',
        studentName: formData.studentName.trim(),
        nationalId: formData.nationalId.trim() || undefined,
        grade: formData.grade,
        parentName: formData.parentName.trim() || formData.studentName.trim(),
        parentPhone: formData.parentPhone.trim() || '0500000000',
        motherPhone: formData.motherPhone.trim() || undefined,
        registrationType: formData.registrationType,
        registrationTypeLabel: selectedPkg?.title,
        tuitionFeeAmount: selectedPkg?.price || 2000,
        feePledgeAccepted: isFieldVisible('feePledge') ? formData.feePledgeAccepted : true,
        previouslyRegistered: formData.previouslyRegistered,
        notes: formData.notes.trim() || undefined,
      };

      await submitRegistrationRequest(requestPayload);
      setIsSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء إرسال الاستمارة، يرجى المحاولة لاحقاً');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      studentName: '',
      nationalId: '',
      parentName: '',
      parentPhone: '',
      motherPhone: '',
      grade: 'الأول ابتدائي',
      registrationType: 'full_package',
      feePledgeAccepted: false,
      previouslyRegistered: 'no',
      notes: '',
    });
    setIsSuccess(false);
    setError(null);
    onClose();
  };

  const selectedPkg = currentPackages.find((p) => p.id === formData.registrationType);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-4 sm:p-6 md:p-8 shadow-2xl border border-slate-100 relative my-6 max-h-[92vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={handleReset}
          className="absolute top-4 left-4 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors z-10"
          title="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Closed Registration View */}
        {!isRegistrationOpen ? (
          <div className="text-center py-10 px-3 space-y-6 my-auto">
            <div className="w-20 h-20 bg-rose-100 text-rose-700 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Lock className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <span className="inline-block px-3.5 py-1 bg-rose-50 text-rose-800 text-xs font-black rounded-full border border-rose-200">
                باب التسجيل مغلق حالياً
              </span>
              <h3 className="text-2xl font-black text-slate-900">
                {activeTenant?.name || 'مجمع حلقات القرآن الكريم'}
              </h3>
            </div>

            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-5 max-w-lg mx-auto shadow-2xs">
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line font-medium">
                {closedMessageText}
              </p>
            </div>

            {phones.length > 0 && (
              <div className="pt-2 flex flex-col items-center gap-2">
                <span className="text-xs font-bold text-slate-600">للاستفسارات والتواصل مع إدارة المجمع:</span>
                <div className="flex flex-wrap items-center justify-center gap-2" dir="ltr">
                  {phones.map((phone, idx) => (
                    <a
                      key={idx}
                      href={`https://wa.me/966${phone.replace(/^0+/, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl font-mono text-xs font-bold hover:bg-emerald-100 transition-colors"
                    >
                      {phone} (واتساب)
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 max-w-sm mx-auto">
              <button
                onClick={handleReset}
                className="w-full py-3 px-6 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl transition-all shadow-md cursor-pointer text-sm"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        ) : isSuccess ? (
          <div className="text-center py-8 px-2 space-y-5 my-auto">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <div>
              <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-full border border-emerald-200 mb-2">
                تم التسجيل بنجاح
              </span>
              <h3 className="text-2xl font-black text-slate-900">استمارة التسجيل مستلمة بنجاح!</h3>
            </div>
            <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              نشرف بانضمام ابنكم في{' '}
              <strong className="text-emerald-800">
                {activeTenant?.name || 'مجمع حلقات القرآن الكريم'} (برنامج وثيق المعالي)
              </strong>
              . تم حفظ البيانات وسيقوم فريق التسجيل بالتواصل معكم لتأكيد المقابلة الشخصية وإكمال
              الإجراءات.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-right text-xs space-y-2 max-w-md mx-auto">
              <div className="font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-200 pb-2">
                <Info className="w-4 h-4 text-emerald-700" />
                <span>ملخص بيانات التسجيل:</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-700">
                <div>
                  <span className="text-slate-500">الطالب:</span> {formData.studentName}
                </div>
                {isFieldVisible('grade') && (
                  <div>
                    <span className="text-slate-500">المرحلة:</span> {formData.grade}
                  </div>
                )}
                {isFieldVisible('nationalId') && (
                  <div>
                    <span className="text-slate-500">رقم الهوية:</span>{' '}
                    <span dir="ltr">{formData.nationalId}</span>
                  </div>
                )}
                {isFieldVisible('registrationType') && (
                  <div>
                    <span className="text-slate-500">الباقة:</span> {selectedPkg?.title}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3">
              <button
                onClick={handleReset}
                className="w-full py-3 px-6 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-2xl transition-all shadow-md cursor-pointer"
              >
                تم والعودة للرئيسية
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100 shrink-0">
              <div className="p-3 bg-gradient-to-br from-emerald-700 to-teal-800 text-white rounded-2xl shadow-sm">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg sm:text-xl font-black text-slate-900">
                    استمارة تسجيل طالب جديد
                  </h3>
                  <span className="bg-amber-100 text-amber-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-amber-300">
                    1448هـ
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  {activeTenant?.name || 'مجمع الغزاوي القرآني'} • برنامج وثيق المعالي
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 shrink-0 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span className="font-semibold">{error}</span>
              </div>
            )}

            {/* Scrollable Form Body */}
            <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1 pl-1 flex-1">
              {/* Section 1: Student Information */}
              {(isFieldVisible('studentName') || isFieldVisible('grade') || isFieldVisible('nationalId')) && (
                <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black text-emerald-900">
                    <School className="w-4 h-4 text-emerald-700" />
                    <span>بيانات الطالب الأساسية</span>
                  </div>

                  {isFieldVisible('studentName') && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {getFieldLabel('studentName', 'اسم الطالب الرباعي')}{' '}
                        {isFieldRequired('studentName') && <span className="text-rose-500">*</span>}
                      </label>
                      <input
                        type="text"
                        required={isFieldRequired('studentName')}
                        placeholder="مثال: عبد الله أحمد محمد الغامدي"
                        value={formData.studentName}
                        onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:border-transparent font-medium"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {isFieldVisible('grade') && (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          {getFieldLabel('grade', 'المرحلة الدراسية')}{' '}
                          {isFieldRequired('grade') && <span className="text-rose-500">*</span>}
                        </label>
                        <select
                          value={formData.grade}
                          onChange={(e) =>
                            setFormData({ ...formData, grade: e.target.value as StudentGrade })
                          }
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
                        >
                          {GRADE_OPTIONS.map((g) => (
                            <option key={g} value={g}>
                              {g}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {isFieldVisible('nationalId') && (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          {getFieldLabel('nationalId', 'رقم هوية الطالب / الإقامة')}{' '}
                          {isFieldRequired('nationalId') && <span className="text-rose-500">*</span>}
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            required={isFieldRequired('nationalId')}
                            maxLength={10}
                            placeholder="10 أرقام (مثال: 1XXXXXXXXX)"
                            dir="ltr"
                            value={formData.nationalId}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                              setFormData({ ...formData, nationalId: val });
                            }}
                            className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-left focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:border-transparent font-mono"
                          />
                          <IdCard className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Section 2: Contact & Guardian */}
              {(isFieldVisible('parentName') || isFieldVisible('parentPhone') || isFieldVisible('motherPhone')) && (
                <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black text-emerald-900">
                    <Phone className="w-4 h-4 text-emerald-700" />
                    <span>بيانات التواصل وولي الأمر</span>
                  </div>

                  {isFieldVisible('parentName') && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {getFieldLabel('parentName', 'اسم ولي أمر الطالب (الأب / الكفيل)')}{' '}
                        {isFieldRequired('parentName') && <span className="text-rose-500">*</span>}
                      </label>
                      <input
                        type="text"
                        required={isFieldRequired('parentName')}
                        placeholder="الاسم الكامل لولي الأمر"
                        value={formData.parentName}
                        onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:border-transparent font-medium"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {isFieldVisible('parentPhone') && (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          {getFieldLabel('parentPhone', 'جوال ولي الأمر (الأب)')}{' '}
                          {isFieldRequired('parentPhone') && <span className="text-rose-500">*</span>}
                        </label>
                        <div className="relative">
                          <input
                            type="tel"
                            required={isFieldRequired('parentPhone')}
                            placeholder="05XXXXXXXX"
                            dir="ltr"
                            value={formData.parentPhone}
                            onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                            className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-left focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:border-transparent font-mono"
                          />
                          <Phone className="w-4 h-4 text-emerald-600 absolute left-3 top-3" />
                        </div>
                        <span className="text-[10px] text-slate-500 mt-0.5 block">
                          الرقم المعتمد لإرسال الإشعارات والواتساب
                        </span>
                      </div>
                    )}

                    {isFieldVisible('motherPhone') && (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          {getFieldLabel('motherPhone', 'جوال والدة الطالب')}{' '}
                          {isFieldRequired('motherPhone') && <span className="text-rose-500">*</span>}
                        </label>
                        <div className="relative">
                          <input
                            type="tel"
                            required={isFieldRequired('motherPhone')}
                            placeholder="05XXXXXXXX"
                            dir="ltr"
                            value={formData.motherPhone}
                            onChange={(e) => setFormData({ ...formData, motherPhone: e.target.value })}
                            className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-left focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:border-transparent font-mono"
                          />
                          <Phone className="w-4 h-4 text-purple-600 absolute left-3 top-3" />
                        </div>
                        <span className="text-[10px] text-slate-500 mt-0.5 block">
                          للتواصل والمتابعة الإدارية والأسرية
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Section 3: Registration Package Selection */}
              {isFieldVisible('registrationType') && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-slate-800">
                      {getFieldLabel('registrationType', 'نوع التسجيل وباقة الاشتراك')}{' '}
                      {isFieldRequired('registrationType') && <span className="text-rose-500">*</span>}
                    </label>
                    <span className="text-[11px] text-emerald-800 font-bold">عن الفصل الدراسي الكامل</span>
                  </div>

                  <div className="space-y-2.5">
                    {currentPackages.map((pkg) => {
                      const isSelected = formData.registrationType === pkg.id;
                      return (
                        <label
                          key={pkg.id}
                          onClick={() => setFormData({ ...formData, registrationType: pkg.id })}
                          className={`block p-3.5 rounded-2xl border-2 transition-all cursor-pointer relative ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-50/70 shadow-xs'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2.5">
                              <input
                                type="radio"
                                name="registrationPackage"
                                checked={isSelected}
                                onChange={() => setFormData({ ...formData, registrationType: pkg.id })}
                                className="mt-1 w-4 h-4 text-emerald-700 focus:ring-emerald-600 cursor-pointer"
                              />
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-xs sm:text-sm font-black text-slate-900">
                                    {pkg.title}
                                  </span>
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                      isSelected
                                        ? 'bg-emerald-700 text-white'
                                        : 'bg-slate-100 text-slate-700'
                                    }`}
                                  >
                                    {pkg.badge}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                                  {pkg.details}
                                </p>
                              </div>
                            </div>

                            <div className="text-left shrink-0">
                              <div className="text-base sm:text-lg font-black text-emerald-800">
                                {pkg.price} <span className="text-xs font-semibold text-slate-600">ريال</span>
                              </div>
                              <span className="text-[10px] text-slate-500 block">/ فصل دراسي</span>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Section 4: Previous Registration Question */}
              {isFieldVisible('previouslyRegistered') && (
                <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3.5 space-y-2">
                  <label className="block text-xs font-bold text-slate-800">
                    {getFieldLabel(
                      'previouslyRegistered',
                      'هل تم تعبئة استمارة التسجيل في الحلقات مسبقاً؟'
                    )}{' '}
                    {isFieldRequired('previouslyRegistered') && <span className="text-rose-500">*</span>}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label
                      className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                        formData.previouslyRegistered === 'yes'
                          ? 'bg-emerald-100 border-emerald-600 text-emerald-900'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="radio"
                        name="previouslyRegistered"
                        value="yes"
                        checked={formData.previouslyRegistered === 'yes'}
                        onChange={() => setFormData({ ...formData, previouslyRegistered: 'yes' })}
                        className="sr-only"
                      />
                      <span>نعم (مسجل سابقاً)</span>
                    </label>

                    <label
                      className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                        formData.previouslyRegistered === 'no'
                          ? 'bg-emerald-100 border-emerald-600 text-emerald-900'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="radio"
                        name="previouslyRegistered"
                        value="no"
                        checked={formData.previouslyRegistered === 'no'}
                        onChange={() => setFormData({ ...formData, previouslyRegistered: 'no' })}
                        className="sr-only"
                      />
                      <span>لا (طالب جديد لأول مرة)</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Section 5: Tuition Policy & Guidelines Card */}
              {isFieldVisible('tuitionPolicyCard') && (
                <div className="bg-gradient-to-br from-amber-50/80 via-slate-50 to-emerald-50/50 rounded-2xl p-3.5 sm:p-4 border border-amber-200/80 text-xs space-y-2.5">
                  <div className="flex items-center gap-2 font-black text-amber-950 border-b border-amber-200/60 pb-2">
                    <Info className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>
                      {getFieldLabel(
                        'tuitionPolicyCard',
                        'آلية تسجيل ومتابعة مستحقات البرامج القرآنية والأنشطة (وثيق المعالي)'
                      )}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-slate-700 text-[11px] leading-relaxed">
                    <p className="flex items-start gap-1.5">
                      <span className="text-emerald-700 font-bold shrink-0">📍</span>
                      <span>
                        <strong>الدفع مقدّمًا</strong> عن كل فصل دراسي في الأسبوع الأول والثاني،
                        ويُعد ذلك تأكيدًا نهائيًا للحضور والمقعد.
                      </span>
                    </p>
                    <p className="flex items-start gap-1.5">
                      <span className="text-blue-700 font-bold shrink-0">✉️</span>
                      <span>
                        ترسل رسالة تذكيرية بالسداد في <strong>الأسبوع الثالث</strong> من الفصل
                        الدراسي لولي الأمر.
                      </span>
                    </p>
                    <p className="flex items-start gap-1.5">
                      <span className="text-amber-700 font-bold shrink-0">📍</span>
                      <span>
                        يتم مراجعة مكتب التسجيل لإكمال السداد في <strong>الأسبوع الرابع</strong>.
                      </span>
                    </p>
                    <p className="flex items-start gap-1.5 text-rose-900 bg-rose-50/60 p-2 rounded-lg border border-rose-200/60">
                      <span className="text-rose-600 font-bold shrink-0">❌</span>
                      <span>
                        <strong>ضابط الاسترداد:</strong> لا يستحق المطالبة بمتبقي الرسوم إذا حضر الطالب
                        أكثر من ٤٠٪ من البرامج خلال الفصل الدراسي (قطعاً لأي حرج).
                      </span>
                    </p>
                    <p className="flex items-start gap-1.5">
                      <span className="text-emerald-700 font-bold shrink-0">⏰</span>
                      <span>نؤكد على أهمية تحريص الابن على الالتزام بالحضور والانضباط المستمر.</span>
                    </p>
                    <p className="flex items-start gap-1.5">
                      <span className="text-slate-800 font-bold shrink-0">📍</span>
                      <span>لإتمام إجراءات التسجيل الرسمية، يُرجى زيارة مكتب التسجيل بمبنى المجمع.</span>
                    </p>
                  </div>

                  <div className="pt-2 border-t border-amber-200/60 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <span className="font-bold text-slate-800">أرقام التواصل والاستفسارات:</span>
                    <div className="flex flex-wrap items-center gap-2" dir="ltr">
                      {phones.map((phone, idx) => (
                        <a
                          key={idx}
                          href={`https://wa.me/966${phone.replace(/^0+/, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded-md font-mono font-bold hover:bg-emerald-200 transition-colors"
                        >
                          {phone}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Section 6: Additional Notes */}
              {isFieldVisible('notes') && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {getFieldLabel(
                      'notes',
                      'ملاحظات إضافية أو ما يحفظه الطالب من القرآن سابقًا (اختياري)'
                    )}
                    {isFieldRequired('notes') && <span className="text-rose-500">*</span>}
                  </label>
                  <textarea
                    rows={2}
                    required={isFieldRequired('notes')}
                    placeholder="مثال: يحفظ جزء عمّ، متقن للقاعدة النورانية..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:border-transparent resize-none font-medium"
                  />
                </div>
              )}

              {/* Section 7: Mandatory Guardian Pledge */}
              {isFieldVisible('feePledge') && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border-2 border-emerald-300/80">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      required={isFieldRequired('feePledge')}
                      checked={formData.feePledgeAccepted}
                      onChange={(e) =>
                        setFormData({ ...formData, feePledgeAccepted: e.target.checked })
                      }
                      className="mt-1 w-4 h-4 text-emerald-700 rounded-sm border-slate-300 focus:ring-emerald-600 cursor-pointer shrink-0"
                    />
                    <div className="text-xs text-emerald-950 leading-relaxed font-bold">
                      <span>{getFieldLabel('feePledge', 'تعهد ولي الأمر')}: </span>
                      <span className="text-emerald-900">
                        «{pledgeStr}»{' '}
                        {isFieldRequired('feePledge') && <span className="text-rose-600">*</span>}
                      </span>
                    </div>
                  </label>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    (isFieldVisible('feePledge') &&
                      isFieldRequired('feePledge') &&
                      !formData.feePledgeAccepted)
                  }
                  className="w-full py-3.5 px-6 bg-gradient-to-r from-emerald-800 to-teal-900 hover:from-emerald-900 hover:to-teal-950 disabled:from-slate-300 disabled:to-slate-400 text-white font-black rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer text-sm"
                >
                  {isSubmitting ? (
                    <span>جارٍ إرسال الاستمارة...</span>
                  ) : (
                    <>
                      <FileCheck className="w-5 h-5" />
                      <span>إرسال استمارة التسجيل الرسمية</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
