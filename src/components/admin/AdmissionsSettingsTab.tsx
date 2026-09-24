import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Settings,
  Save,
  FileText,
  CreditCard,
  Phone,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  Asterisk,
  Edit3,
  HelpCircle,
  RotateCcw,
  Loader2,
  AlertCircle,
  X,
} from 'lucide-react';
import {
  ADMISSION_FIELDS_META,
  DEFAULT_ADMISSION_FORM_FIELDS,
  DEFAULT_CLOSED_MESSAGE,
} from '../admissions/admissionsFormConfig';
import { AdmissionFormFieldConfig, TenantAdmissionsConfig } from '../../types';

export const AdmissionsSettingsTab: React.FC = () => {
  const { activeTenant, updateAdmissionsConfig } = useApp();

  const [isOpen, setIsOpen] = useState(true);
  const [maxOpenApplications, setMaxOpenApplications] = useState(50);
  const [terms, setTerms] = useState('');
  const [closedMessage, setClosedMessage] = useState(DEFAULT_CLOSED_MESSAGE);

  // Form fields configuration
  const [formFields, setFormFields] = useState<Record<string, AdmissionFormFieldConfig>>(
    DEFAULT_ADMISSION_FORM_FIELDS
  );

  // Form package pricing & contact customization
  const [fullPackagePrice, setFullPackagePrice] = useState(2000);
  const [activitiesOnlyPrice, setActivitiesOnlyPrice] = useState(1500);
  const [quranOnlyPrice, setQuranOnlyPrice] = useState(1000);
  const [contactPhones, setContactPhones] = useState('0503049194, 0562018313, 0598145076');
  const [pledgeText, setPledgeText] = useState(
    'أتعهد أنا ولي أمر الطالب بسداد رسوم اشتراك الابن خلال الأسبوع الاول والثاني من بداية كل فصل دراسي.'
  );
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (activeTenant) {
      const cfg = activeTenant.admissionsConfig;
      setIsOpen(cfg ? cfg.isOpen : true);
      setMaxOpenApplications(cfg?.maxOpenApplications ?? 50);
      setTerms(cfg?.termsAndConditions || 'الالتزام بأنظمة المجمع ولوائحه والحضور في الأوقات المحددة.');
      setClosedMessage(cfg?.closedMessage || DEFAULT_CLOSED_MESSAGE);

      if (cfg?.formFields && Object.keys(cfg.formFields).length > 0) {
        setFormFields({
          ...DEFAULT_ADMISSION_FORM_FIELDS,
          ...cfg.formFields,
        });
      } else {
        setFormFields(DEFAULT_ADMISSION_FORM_FIELDS);
      }

      setFullPackagePrice(cfg?.fullPackagePrice ?? 2000);
      setActivitiesOnlyPrice(cfg?.activitiesOnlyPrice ?? 1500);
      setQuranOnlyPrice(cfg?.quranOnlyPrice ?? 1000);
      if (cfg?.contactPhones && cfg.contactPhones.length > 0) {
        setContactPhones(cfg.contactPhones.join(', '));
      } else if (activeTenant.contactPhone) {
        setContactPhones(activeTenant.contactPhone);
      } else {
        setContactPhones('0503049194, 0562018313, 0598145076');
      }
      if (cfg?.pledgeText) {
        setPledgeText(cfg.pledgeText);
      } else {
        setPledgeText(
          'أتعهد أنا ولي أمر الطالب بسداد رسوم اشتراك الابن خلال الأسبوع الاول والثاني من بداية كل فصل دراسي.'
        );
      }
    }
  }, [activeTenant]);

  const handleToggleFieldVisibility = (fieldId: string) => {
    setFormFields((prev) => {
      const current = prev[fieldId] || {
        id: fieldId,
        label: '',
        visible: true,
        required: false,
      };
      return {
        ...prev,
        [fieldId]: {
          ...current,
          visible: !current.visible,
        },
      };
    });
  };

  const handleToggleFieldRequired = (fieldId: string) => {
    setFormFields((prev) => {
      const current = prev[fieldId] || {
        id: fieldId,
        label: '',
        visible: true,
        required: false,
      };
      return {
        ...prev,
        [fieldId]: {
          ...current,
          required: !current.required,
        },
      };
    });
  };

  const handleUpdateFieldCustomLabel = (fieldId: string, customLabel: string) => {
    setFormFields((prev) => {
      const current = prev[fieldId] || {
        id: fieldId,
        label: '',
        visible: true,
        required: false,
      };
      return {
        ...prev,
        [fieldId]: {
          ...current,
          customLabel: customLabel.trim() ? customLabel : undefined,
        },
      };
    });
  };

  const handleResetFieldsToDefault = () => {
    setFormFields(DEFAULT_ADMISSION_FORM_FIELDS);
  };

  const handleSave = async () => {
    if (isSaving) return;

    try {
      setIsSaving(true);
      setErrorMessage('');

      const phonesList = contactPhones.split(',').map((p) => p.trim()).filter(Boolean);

      const completeConfig: TenantAdmissionsConfig = {
        ...(activeTenant?.admissionsConfig || {}),
        isOpen,
        maxOpenApplications: Number(maxOpenApplications) || 50,
        openTracks: activeTenant?.admissionsConfig?.openTracks || [],
        termsAndConditions: terms,
        closedMessage: closedMessage.trim() || DEFAULT_CLOSED_MESSAGE,
        formFields: { ...formFields },
        fullPackagePrice: Number(fullPackagePrice) || 2000,
        activitiesOnlyPrice: Number(activitiesOnlyPrice) || 1500,
        quranOnlyPrice: Number(quranOnlyPrice) || 1000,
        contactPhones:
          phonesList.length > 0
            ? phonesList
            : ['0503049194', '0562018313', '0598145076'],
        pledgeText: pledgeText.trim(),
      };

      await updateAdmissionsConfig(completeConfig);
      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 3500);
    } catch (err: unknown) {
      console.error('Failed to save admissions config:', err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'تعذر حفظ الإعدادات، يرجى المحاولة مرة أخرى أو مراجعة الاتصال.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Centered Modal / Popup Notification across the entire viewport */}
      {showSuccessModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
          onClick={() => setShowSuccessModal(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full text-center shadow-2xl border border-slate-100 flex flex-col items-center animate-in zoom-in-95 duration-200 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowSuccessModal(false)}
              className="absolute top-4 left-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="إغلاق النافذة"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mb-3 shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <h4 className="text-lg font-black text-slate-900 mb-1.5">
              تم حفظ الإعدادات بنجاح
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed mb-5">
              تم حفظ وتطبيق كافة إعدادات القبول، ونموذج التقديم، والأسعار بنجاح في النظام.
            </p>

            <button
              type="button"
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-sm transition-all active:scale-[0.98] cursor-pointer"
            >
              حسناً
            </button>
          </div>
        </div>
      )}

      {/* Section 1: Admissions Settings & Period */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">إعدادات القبول والتسجيل</h3>
            <p className="text-xs text-slate-500">إدارة فترات التسجيل وشروط القبول</p>
          </div>
        </div>

        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
        >
          {/* Main Toggle: Registration Status */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <label className="block text-xs font-bold text-slate-700">حالة التسجيل</label>
            <div className="grid grid-cols-2 gap-3 max-w-md">
              <button
                type="button"
                onClick={() => setIsOpen(true)}
                className={`py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  isOpen
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-current"></span>
                <span>مفتوح</span>
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className={`py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  !isOpen
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>مغلق</span>
              </button>
            </div>
          </div>

          {/* Conditional View: If OPEN */}
          {isOpen ? (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    الحد الأقصى للطلبات المفتوحة
                  </label>
                  <input
                    type="number"
                    value={maxOpenApplications}
                    onChange={(e) => setMaxOpenApplications(parseInt(e.target.value) || 50)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">الحد الأقصى للطلبات المستلمة قبل إغلاق الاستمارة تلقائياً</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  الشروط والأحكام الخاصة بالقبول
                </label>
                <textarea
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  rows={3}
                  placeholder="اكتب الشروط والأحكام التي يجب على ولي الأمر الموافقة عليها..."
                />
              </div>

              {/* Section 2: Form Management (Only shown when Registration is OPEN) */}
              <div className="pt-6 border-t border-slate-200 mt-6 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">إدارة نموذج التقديم</h4>
                      <p className="text-xs text-slate-500">
                        التحكم بجميع أسئلة وحقول الاستمارة: إظهار، إخفاء، وتعديل المسميات بلا حذف
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetFieldsToDefault}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold transition-colors cursor-pointer"
                    title="استعادة الأسئلة الافتراضية"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                    <span>استعادة الافتراضي</span>
                  </button>
                </div>

                {/* Question & Fields Controller Table / Cards */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50">
                  <div className="p-3.5 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>قائمة أسئلة وحقول نموذج التسجيل</span>
                    <span className="text-[11px] text-slate-500 font-normal">
                      يمكنك إخفاء أو إظهار الحقل، وتحديد الإلزامية، وتعديل نص السؤال
                    </span>
                  </div>

                  <div className="divide-y divide-slate-200">
                    {ADMISSION_FIELDS_META.map((meta) => {
                      const cfg = formFields[meta.id] || {
                        id: meta.id,
                        label: meta.defaultLabel,
                        visible: true,
                        required: meta.canBeRequired,
                      };

                      const isVisible = cfg.visible ?? true;
                      const isRequired = cfg.required ?? false;
                      const customLabel = cfg.customLabel || '';

                      return (
                        <div
                          key={meta.id}
                          className={`p-3.5 sm:p-4 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isVisible ? 'bg-white' : 'bg-slate-100/60 opacity-75'
                          }`}
                        >
                          <div className="space-y-1 sm:max-w-[48%]">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-900">
                                {meta.defaultLabel}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold">
                                {meta.sectionTitle}
                              </span>
                              {!isVisible && (
                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-bold border border-rose-200">
                                  مخفي
                                </span>
                              )}
                              {isVisible && isRequired && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 font-bold border border-amber-200">
                                  إلزامي
                                </span>
                              )}
                            </div>
                            {meta.defaultHelpText && (
                              <p className="text-[11px] text-slate-500">{meta.defaultHelpText}</p>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            {/* Custom Label Input */}
                            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                              <input
                                type="text"
                                placeholder={`تعديل مسمى السؤال...`}
                                value={customLabel}
                                onChange={(e) =>
                                  handleUpdateFieldCustomLabel(meta.id, e.target.value)
                                }
                                disabled={!isVisible}
                                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400"
                              />
                              <Edit3 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                            </div>

                            {/* Toggle Required Button */}
                            {meta.canBeRequired && (
                              <button
                                type="button"
                                onClick={() => handleToggleFieldRequired(meta.id)}
                                disabled={!isVisible}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer border ${
                                  isRequired
                                    ? 'bg-amber-100 border-amber-300 text-amber-900 hover:bg-amber-200'
                                    : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                                title={isRequired ? 'حقل إلزامي (مطلوب)' : 'حقل اختياري'}
                              >
                                <Asterisk className="w-3.5 h-3.5" />
                                <span>{isRequired ? 'إلزامي' : 'اختياري'}</span>
                              </button>
                            )}

                            {/* Toggle Visibility Button */}
                            {meta.canBeHidden ? (
                              <button
                                type="button"
                                onClick={() => handleToggleFieldVisibility(meta.id)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer border ${
                                  isVisible
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                                    : 'bg-slate-200 border-slate-300 text-slate-700 hover:bg-slate-300'
                                }`}
                                title={isVisible ? 'إخفاء هذا السؤال من النموذج' : 'إظهار السؤال في النموذج'}
                              >
                                {isVisible ? (
                                  <>
                                    <Eye className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>ظاهر</span>
                                  </>
                                ) : (
                                  <>
                                    <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                                    <span>مخفي</span>
                                  </>
                                )}
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400 px-2 py-1 bg-slate-100 rounded-lg">
                                أساسي
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Sub-section: Packages Pricing */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                    <h5 className="text-xs font-bold text-slate-900">تخصيص رسوم باقات التسجيل الافتراضية</h5>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        رسوم الباقة الشاملة (ريال)
                      </label>
                      <input
                        type="number"
                        value={fullPackagePrice}
                        onChange={(e) => setFullPackagePrice(parseInt(e.target.value) || 2000)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        رسوم الأنشطة فقط (ريال)
                      </label>
                      <input
                        type="number"
                        value={activitiesOnlyPrice}
                        onChange={(e) => setActivitiesOnlyPrice(parseInt(e.target.value) || 1500)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        رسوم القرآن فقط (ريال)
                      </label>
                      <input
                        type="number"
                        value={quranOnlyPrice}
                        onChange={(e) => setQuranOnlyPrice(parseInt(e.target.value) || 1000)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Sub-section: Contact Phones & Custom Pledge */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                    <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-600" />
                      <span>أرقام جوال التواصل والاستفسار (مفصولة بفواصل)</span>
                    </label>
                    <input
                      type="text"
                      value={contactPhones}
                      onChange={(e) => setContactPhones(e.target.value)}
                      placeholder="0503049194, 0562018313, 0598145076"
                      dir="ltr"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono text-left"
                    />
                    <p className="text-[11px] text-slate-500">تظهر لأولياء الأمور في بطاقة الاستفسارات أسفل النموذج</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                    <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-emerald-600" />
                      <span>نص تعهد ولي الأمر بالرسوم الافتراضي</span>
                    </label>
                    <textarea
                      value={pledgeText}
                      onChange={(e) => setPledgeText(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Conditional View: If CLOSED */
            <div className="space-y-4 animate-in fade-in duration-200 p-5 rounded-2xl bg-rose-50/70 border border-rose-200">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
                <Lock className="w-4 h-4 text-rose-600" />
                <span>رسالة إغلاق باب القبول والتسجيل</span>
              </div>
              <p className="text-xs text-rose-800 leading-relaxed">
                التسجيل مغلق حالياً. تظهر هذه الرسالة لولي الأمر فور فتح رابط أو نافذة التسجيل بدلاً من نموذج التقديم.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  نص رسالة الإغلاق المخصصة:
                </label>
                <textarea
                  value={closedMessage}
                  onChange={(e) => setClosedMessage(e.target.value)}
                  rows={4}
                  className="w-full p-3 rounded-xl border border-rose-200 bg-white text-sm text-slate-800 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  placeholder="اكتب رسالة الإغلاق الموجهة لأولياء الأمور..."
                />
              </div>

              <div className="flex items-center justify-between text-xs text-rose-700 pt-1">
                <span>تم إخفاء إعدادات نموذج التقديم أثناء الإغلاق لضمان التركيز.</span>
                <button
                  type="button"
                  onClick={() => setClosedMessage(DEFAULT_CLOSED_MESSAGE)}
                  className="text-rose-800 hover:text-rose-900 font-bold underline cursor-pointer"
                >
                  استعادة الرسالة الافتراضية
                </button>
              </div>
            </div>
          )}

          {/* Submit Button Centered for Desktop & Mobile */}
          <div className="pt-8 pb-3 border-t border-slate-200 flex flex-col items-center justify-center text-center w-full">
            {errorMessage && (
              <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-bold flex items-center justify-center gap-2 max-w-md w-full shadow-xs animate-in fade-in">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className={`w-full sm:w-auto min-w-[280px] sm:min-w-[340px] max-w-md py-3.5 px-8 rounded-2xl text-white text-sm sm:text-base font-black shadow-md flex items-center justify-center gap-2.5 transition-all duration-200 select-none ${
                isSaving
                  ? 'bg-indigo-400 cursor-not-allowed opacity-80 pointer-events-none shadow-none'
                  : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] hover:shadow-lg cursor-pointer'
              }`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin shrink-0 text-white" />
                  <span>جارٍ حفظ كافة الإعدادات...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 shrink-0" />
                  <span>حفظ كافة الإعدادات ونموذج التقديم</span>
                </>
              )}
            </button>
            <p className="text-xs text-slate-500 font-medium mt-2.5 text-center">
              يتم تطبيق وحفظ كافة الإعدادات والأسعار والحقول مباشرة في النظام
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

