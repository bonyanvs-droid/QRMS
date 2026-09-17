import React, { useState, useEffect } from 'react';
import {
  Save,
  Sliders,
  Plus,
  Trash2,
  Image as ImageIcon,
  ArrowUp,
  ArrowDown,
  Video,
  Copy,
  Loader2,
  Sparkles,
  AlertCircle,
  Upload,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  Play,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { FrontendConfig, BannerItem, AdItem, SectionVisibility } from '../../types';
import { isModuleEnabled } from '../../lib/moduleChecker';
import {
  uploadTenantMedia,
  extractYouTubeId,
  getYouTubeThumbnail,
} from '../../lib/storageService';

const DEFAULT_SECTIONS: SectionVisibility[] = [
  { id: 'banners', label: 'البانرات الرئيسية العريضة (Banners)', isVisible: true, order: 1 },
  { id: 'prayer', label: 'بطاقة ومواقيت الصلاة اليومية', isVisible: true, order: 2 },
  { id: 'about', label: 'نبذة عن المجمع والرؤية', isVisible: true, order: 3 },
  { id: 'outcome', label: 'المخرج القرآني المعتمد', isVisible: true, order: 4 },
  { id: 'stats', label: 'إحصائيات المجمع الحية', isVisible: true, order: 5 },
  { id: 'programs', label: 'البرامج والمسارات القرآنية', isVisible: true, order: 6 },
  { id: 'educational', label: 'الخطة التربوية والقيمية الأسبوعية', isVisible: true, order: 7 },
  { id: 'ads', label: 'شريط الإعلانات والأنشطة', isVisible: true, order: 8 },
  { id: 'admissions', label: 'بوابة القبول والتسجيل', isVisible: true, order: 9 },
  { id: 'contact', label: 'معلومات التواصل والموقع الجغرافي', isVisible: true, order: 10 },
];

export default function FrontendManagementTab() {
  const { activeTenant, currentUser, tenants } = useApp();
  const isSystemAdmin = currentUser?.role === 'system_admin';
  const isCampusAdmin = currentUser?.role === 'campus_admin' || currentUser?.role === 'admin';

  // Role constraint: campus_admin can ONLY manage their tenant
    const [searchParams, setSearchParams] = useSearchParams();
  const rawSubtab = searchParams.get('subtab');
  const activeSubTab: 'all' | 'banners' | 'ads' | 'videos' = 
    rawSubtab === 'banners' ? 'banners' :
    rawSubtab === 'ads' ? 'ads' :
    rawSubtab === 'videos' ? 'videos' : 'all';

  const handleSubTabChange = (tab: 'all' | 'banners' | 'ads' | 'videos') => {
    const nextParams = new URLSearchParams(searchParams);
    if (tab === 'all') {
      nextParams.delete('subtab');
    } else {
      nextParams.set('subtab', tab);
    }
    setSearchParams(nextParams);
  };

  const [configType, setConfigType] = useState<'platform' | 'tenant'>(
    isSystemAdmin ? 'platform' : 'tenant'
  );

  const tenant = activeTenant || (currentUser?.tenantId ? tenants.find(t => t.id === currentUser.tenantId) : null) || tenants[0];
  const configId = configType === 'platform' ? 'platform' : (tenant?.id || 'ghazzawi');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [config, setConfig] = useState<FrontendConfig | null>(null);

  // Uploading state tracking
  const [uploadingBannerId, setUploadingBannerId] = useState<string | null>(null);
  const [uploadingAdId, setUploadingAdId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Prompt Generator State
  const [promptSubject, setPromptSubject] = useState('');
  const [selectedPromptCategory, setSelectedPromptCategory] = useState('registration');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Module check for this tenant
  const isAdmissionsModuleActive = isModuleEnabled(tenant, 'admissions');
  const isEducationalModuleActive = isModuleEnabled(tenant, 'educational');

  const promptPresets: Record<string, { label: string; text: string }> = {
    registration: {
      label: 'فتح باب التسجيل والقبول',
      text: 'تصميم بانر إعلاني إسلامي فخم وراقي لبدء التسجيل في مجمع قرآني. إضاءة دافئة ناعمة، مصحف شريف مفتوح على طاولة خشبية محفورة، نافذة إسلامية مقوسة بإطلالة مشرقة. ترك مساحة فارغة واسعة ومرتبة في النصف العلوي لإضافة الشعار الرسمي، بدون نصوص إنجليزية أو رموز عشوائية، بنسبة 16:9.',
    },
    honoring: {
      label: 'تكريم حفظة جزء عم والمتفوقين',
      text: 'بانر احتفالي تكريمي فاخر لحفظة القرآن الكريم. دروع تكريمية ذهبية أنيقة، زخارف إسلامية ذهبية هادئة على خلفية زمردية كحلية داكنة، أجواء روحانية مبهجة بنور طبيعي دافئ، مساحة سلبية كافية لاسم الطالب والشعار الرسمي للمجمع.',
    },
    competition: {
      label: 'المسابقة القرآنية السنوية',
      text: 'بوستر إعلاني رسمي لمسابقة قرآنية رمضانية سنوية. محراب مسجد تاريخي أنيق، صفحات مصحف بخط عثماني دقيق، إشعاع نوري من الأعلى، ألوان خضراء وذهبية وبيضاء متناسقة، مساحة فارغة في المنتصف لكتابة تفاصيل المسابقة والشعار.',
    },
    spelling: {
      label: 'برنامج الهجاء القرآني للبراعم',
      text: 'بانر تعليمي مبهج للأطفال والبراعم، يبرز الحروف الهجائية القرآنية برسم جميل، جو تعليمي قرآني مشرق ومحبب للأطفال الصغار، ألوان هادئة ونقية مع مساحة مخصصة لشعار المجمع القرآني.',
    },
  };

  const handleSelectPreset = (key: string) => {
    setSelectedPromptCategory(key);
    setGeneratedPrompt(promptPresets[key].text);
    setCopiedPrompt(false);
  };

  const generateCustomPrompt = () => {
    if (!promptSubject.trim()) return;
    const prompt = `تصميم بانر إعلاني إسلامي احترافي لمجمع قرآني عن: ${promptSubject.trim()}. خلفية أنيقة بألوان هادئة (أخضر زمردي، كحلي، ذهبي أو أبيض رخامي)، إضاءة روحانية ناعمة وزخارف هندسية إسلامية أصيلة. مساحة سلبية كافية في الأعلى والمنتصف لوضع الشعار الرسمي للمجمع لاحقاً، بدون وجوه بشرية واضحة وبدون كتابة أي نصوص عشوائية مشوهة.`;
    setGeneratedPrompt(prompt);
    setCopiedPrompt(false);
  };

  useEffect(() => {
    if (!configId) {
      setLoading(false);
      return;
    }
    const fetchConfig = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, 'frontendConfigs', configId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data() as FrontendConfig;
          // Merge sections with defaults to ensure all sections exist with updated labels
          const defaultMap = new Map(DEFAULT_SECTIONS.map((s) => [s.id, s]));
          const existingSections = data.sections || [];
          
          // Map existing ones and update label if necessary
          const merged: SectionVisibility[] = existingSections.map((s) => {
            const def = defaultMap.get(s.id);
            return {
              ...s,
              label: def ? def.label : s.label,
            };
          });

          // Add any missing default sections
          DEFAULT_SECTIONS.forEach((def) => {
            if (!merged.some((s) => s.id === def.id)) {
              merged.push({ ...def, order: merged.length + 1 });
            }
          });

          // Normalize orders to 1..N
          merged.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          const normalizedSections = merged.map((s, idx) => ({ ...s, order: idx + 1 }));

          setConfig({
            ...data,
            banners: data.banners || [],
            announcements: data.announcements || data.ads || [],
            sections: normalizedSections,
          });
        } else {
          if (configType === 'platform') {
            setConfig({
              id: 'platform',
              type: 'platform',
              name: 'منصة إدارة المجمعات القرآنية',
              description: 'المنصة الرقمية الموحدة لإدارة المجمعات والحلقات القرآنية والمقارئ النموذجية.',
              contactPhone: '0500000000',
              contactEmail: 'info@quran-platform.sa',
              contactWhatsapp: '0500000000',
              address: 'المملكة العربية السعودية',
              banners: [],
              announcements: [],
              sections: DEFAULT_SECTIONS,
            });
          } else {
            setConfig({
              id: configId,
              type: 'tenant',
              name: tenant?.name || 'المجمع القرآني',
              description: tenant?.notes || 'صرح قرآني رائد يُعنى بتعليم كتاب الله الكريم وغرس قيمه في نفوس الناشئة.',
              contactPhone: tenant?.contactPhone || '',
              contactEmail: tenant?.email || '',
              contactWhatsapp: tenant?.whatsappNumber || tenant?.contactPhone || '',
              address: tenant?.city ? `${tenant.city}${tenant.district ? ` - ${tenant.district}` : ''}` : '',
              banners: [],
              announcements: [],
              sections: DEFAULT_SECTIONS,
            });
          }
        }
      } catch (e) {
        console.error('Error loading frontend config:', e);
      }
      setLoading(false);
    };
    fetchConfig();
  }, [configId, tenant, configType]);

  const handleSave = async () => {
    if (!config || !configId) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      await setDoc(doc(db, 'frontendConfigs', configId), config, { merge: true });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (e) {
      console.error('Error saving config:', e);
      alert('حدث خطأ أثناء حفظ التغييرات. يرجى التحقق من اتصال الشبكة.');
    }
    setSaving(false);
  };

  // Upload handler for Banners
  const handleBannerFileUpload = async (bannerId: string, file: File) => {
    setUploadingBannerId(bannerId);
    setUploadError(null);
    try {
      const url = await uploadTenantMedia(file, configId, 'banners');
      if (config) {
        const updated = config.banners.map((b) => (b.id === bannerId ? { ...b, imageUrl: url } : b));
        setConfig({ ...config, banners: updated });
        try {
          await setDoc(doc(db, 'frontendConfigs', configId), { ...config, banners: updated }, { merge: true });
        } catch (saveErr) {
          console.error('Auto save error:', saveErr);
        }
      }
    } catch (err: any) {
      console.error('Banner upload error:', err);
      setUploadError(err?.message || 'فشل رفع الصورة');
    } finally {
      setUploadingBannerId(null);
    }
  };

  // Upload handler for Ads
  const handleAdFileUpload = async (adId: string, file: File) => {
    setUploadingAdId(adId);
    setUploadError(null);
    try {
      const url = await uploadTenantMedia(file, configId, 'ads');
      if (config) {
        const updated = config.announcements.map((a) => (a.id === adId ? { ...a, mediaUrl: url } : a));
        setConfig({ ...config, announcements: updated });
        try {
          await setDoc(doc(db, 'frontendConfigs', configId), { ...config, announcements: updated }, { merge: true });
        } catch (saveErr) {
          console.error('Auto save error:', saveErr);
        }
      }
    } catch (err: any) {
      console.error('Ad upload error:', err);
      setUploadError(err?.message || 'فشل رفع الصورة');
    } finally {
      setUploadingAdId(null);
    }
  };

  if (!isSystemAdmin && !isCampusAdmin) {
    return (
      <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-slate-700">
        <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto mb-2" />
        <h3 className="font-bold text-base">صلاحية محظورة</h3>
        <p className="text-xs text-slate-500 mt-1">
          إدارة الواجهة العامة متاحة فقط لمدير المجمع المعتمد ومدير المنصة.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-700" />
        <span className="text-xs font-bold text-slate-600">جارٍ تحميل إعدادات الواجهة العامة...</span>
      </div>
    );
  }

  if (!config) return null;

  const activeBannersCount = config.banners.filter((b) => b.isActive && b.imageUrl && b.title).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900 font-serif">
              {configType === 'platform' ? 'إدارة الواجهة العامة للمنصة الأم' : `إدارة الواجهة العامة: ${tenant?.name || 'المجمع القرآني'}`}
            </h2>
            {isSystemAdmin && (
              <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200">
                <button
                  onClick={() => setConfigType('platform')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    configType === 'platform'
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  المنصة الأم
                </button>
                <button
                  onClick={() => setConfigType('tenant')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    configType === 'tenant'
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  المجمع القرآني ({tenant?.name?.slice(0, 18) || 'المجمع'}...)
                </button>
              </div>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {configType === 'platform'
              ? 'التحكم بالبيانات والهوية للواجهة الرئيسية للمنصة الأم، البانرات، والإعلانات المركزية.'
              : 'التحكم الكامل ببيانات وهوية الواجهة العامة للمجمع، البانرات، الإعلانات، والأقسام المعروضة للزوار.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>تم حفظ التعديلات بنجاح!</span>
            </span>
          )}

          <a
            href={configType === 'platform' ? '#/' : `#/t/${tenant?.slug || tenant?.id || 'demo'}`}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-4 h-4 text-slate-500" />
            <span>معاينة الواجهة العامة</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 rounded-2xl shadow-xs font-bold text-xs flex items-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}</span>
          </button>
        </div>
      </div>

      {/* Frontend Subtabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto scrollbar-none">
        <button
          onClick={() => handleSubTabChange('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'all'
              ? 'bg-emerald-800 text-white shadow-xs font-black'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>كل الأقسام والإعدادات</span>
        </button>
        <button
          onClick={() => handleSubTabChange('banners')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'banners'
              ? 'bg-emerald-800 text-white shadow-xs font-black'
              : 'bg-white text-slate-600 hover:text-slate-100 border border-slate-200'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>البانرات الترويجية ({config?.banners?.length || 0})</span>
        </button>
        <button
          onClick={() => handleSubTabChange('ads')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'ads'
              ? 'bg-emerald-800 text-white shadow-xs font-black'
              : 'bg-white text-slate-600 hover:text-slate-100 border border-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>شريط الإعلانات والأنشطة</span>
        </button>
        <button
          onClick={() => handleSubTabChange('videos')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'videos'
              ? 'bg-emerald-800 text-white shadow-xs font-black'
              : 'bg-white text-slate-600 hover:text-slate-100 border border-slate-200'
          }`}
        >
          <Video className="w-4 h-4" />
          <span>الفيديوهات والمحتوى المرئي</span>
        </button>
      </div>

      {uploadError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Grid: Basic Info & Sections Visibility */}
      {(activeSubTab === 'all') && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Basic Info */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm">المعلومات الأساسية والهوية</h3>
            <span className="text-[11px] text-slate-400 font-medium">تظهر في الترويسة والبطاقة الرئيسية</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {configType === 'platform' ? 'اسم المنصة في الواجهة الرئيسية' : 'اسم المجمع في الواجهة'}
            </label>
            <input
              type="text"
              value={config.name}
              onChange={(e) => setConfig({ ...config, name: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              placeholder={configType === 'platform' ? 'مثال: منصة إدارة المجمعات القرآنية' : 'مثال: مجمع الفرقان القرآني'}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {configType === 'platform' ? 'نبذة تعريفية عن المنصة الأم' : 'نبذة تعريفية ورسالة المجمع'}
            </label>
            <textarea
              value={config.description || ''}
              onChange={(e) => setConfig({ ...config, description: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl h-20 focus:ring-2 focus:ring-emerald-500 focus:outline-none leading-relaxed"
              placeholder={configType === 'platform' ? 'وصف مختصر للمنصة وأهدافها لخدمة المجمعات القرآنية...' : 'وصف مختصر يوضح رسالة وأهداف المجمع القرآني...'}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">رقم هاتف التواصل</label>
              <input
                type="tel"
                value={config.contactPhone || ''}
                onChange={(e) => setConfig({ ...config, contactPhone: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl text-left font-mono"
                dir="ltr"
                placeholder="05XXXXXXXX"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">رقم الواتساب</label>
              <input
                type="tel"
                value={config.contactWhatsapp || ''}
                onChange={(e) => setConfig({ ...config, contactWhatsapp: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl text-left font-mono"
                dir="ltr"
                placeholder="05XXXXXXXX"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني</label>
              <input
                type="email"
                value={config.contactEmail || ''}
                onChange={(e) => setConfig({ ...config, contactEmail: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl text-left"
                dir="ltr"
                placeholder="info@quran-complex.org"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">العنوان والحي</label>
              <input
                type="text"
                value={config.address || ''}
                onChange={(e) => setConfig({ ...config, address: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                placeholder="مثال: جدة - حي السلامة"
              />
            </div>
          </div>

          {/* Additional Public Display Controls */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <label className="block text-xs font-bold text-slate-700 mb-2">خيارات العرض والهوية العامة</label>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-bold text-slate-700">إظهار اسم المشرف العام في الترويسة وبطاقة التواصل</span>
              <input
                type="checkbox"
                checked={config.showSupervisor !== false}
                onChange={(e) => setConfig({ ...config, showSupervisor: e.target.checked })}
                className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-500 cursor-pointer"
              />
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-bold text-slate-700">إظهار بطاقة ومواقيت الصلاة في الواجهة العامة</span>
              <input
                type="checkbox"
                checked={config.showPrayerTimes !== false}
                onChange={(e) => setConfig({ ...config, showPrayerTimes: e.target.checked })}
                className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* 2. Sections Visibility & Order */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm">التحكم في ظهور وترتيب الأقسام</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              تحديد الأقسام الظاهرة للزوار مع مراعاة حالة التفعيل التشغيلي لكل موديول.
            </p>
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {[...config.sections]
              .sort((a, b) => a.order - b.order)
              .map((section, idx) => {
                const isEducationalSection = section.id === 'educational';
                const isAdmissionsSection = section.id === 'admissions';
                const isPrayerSection = section.id === 'prayer';
                const isOperationallyDisabled =
                  (isEducationalSection && !isEducationalModuleActive) ||
                  (isAdmissionsSection && !isAdmissionsModuleActive) ||
                  (isPrayerSection && activeTenant?.prayerConfig?.showOnPublicPage === false);

                return (
                  <div
                    key={section.id}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                      section.isVisible && !isOperationallyDisabled
                        ? 'bg-slate-50/80 border-slate-200'
                        : 'bg-slate-100/50 border-slate-200/60 opacity-80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={section.isVisible}
                        onChange={(e) => {
                          const updated = config.sections.map((s) =>
                            s.id === section.id ? { ...s, isVisible: e.target.checked } : s
                          );
                          setConfig({ ...config, sections: updated });
                        }}
                        className="w-4 h-4 rounded-md text-emerald-700 focus:ring-emerald-500 cursor-pointer"
                      />
                      <div>
                        <span className="font-bold text-xs text-slate-800">{section.label}</span>
                        {isOperationallyDisabled && (
                          <div className="text-[10px] text-amber-700 font-semibold flex items-center gap-1 mt-0.5">
                            <AlertCircle className="w-3 h-3" />
                            <span>الموديول معطل في إعدادات تشغيل المجمع (لن يظهر للعامة)</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          if (idx === 0) return;
                          const sorted = [...config.sections].sort((a, b) => a.order - b.order);
                          const temp = sorted[idx];
                          sorted[idx] = sorted[idx - 1];
                          sorted[idx - 1] = temp;
                          const reordered = sorted.map((s, i) => ({ ...s, order: i + 1 }));
                          setConfig({ ...config, sections: reordered });
                        }}
                        disabled={idx === 0}
                        className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg disabled:opacity-20 cursor-pointer"
                        title="تحريك لأعلى"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          const sorted = [...config.sections].sort((a, b) => a.order - b.order);
                          if (idx === sorted.length - 1) return;
                          const temp = sorted[idx];
                          sorted[idx] = sorted[idx + 1];
                          sorted[idx + 1] = temp;
                          const reordered = sorted.map((s, i) => ({ ...s, order: i + 1 }));
                          setConfig({ ...config, sections: reordered });
                        }}
                        disabled={idx === config.sections.length - 1}
                        className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg disabled:opacity-20 cursor-pointer"
                        title="تحريك لأسفل"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      )}

      {/* 3. BANNERS MANAGEMENT WITH DIRECT FILE UPLOAD */}
      {(activeSubTab === 'all' || activeSubTab === 'banners') && (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              {configType === 'platform' ? 'البانرات الترويجية للمنصة الأم' : 'البانرات الرئيسية العريضة (Banners)'}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {configType === 'platform'
                ? 'رفع الصور الترويجية للمنصة الأم مباشرة إلى التخزين السحابي.'
                : 'رفع الصور الترويجية للمجمع مباشرة إلى التخزين السحابي دون الحاجة لروابط يدوية.'}
            </p>
          </div>

          <button
            onClick={() => {
              const newBanner: BannerItem = {
                id: `banner_${Date.now()}`,
                title: 'بانر تعريفي جديد',
                subtitle: '',
                imageUrl: '',
                linkUrl: '',
                ctaText: 'المزيد',
                isActive: true,
                order: config.banners.length + 1,
              };
              setConfig({ ...config, banners: [...config.banners, newBanner] });
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold border border-emerald-200 transition-colors self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة بانر جديد</span>
          </button>
        </div>

        {activeBannersCount === 0 && (
          <div className="bg-amber-50 text-amber-900 p-3 rounded-2xl flex items-center text-xs border border-amber-200">
            <AlertCircle className="w-4 h-4 ml-2 shrink-0 text-amber-700" />
            <span>
              لا توجد حالياً بانرات مفعلة ومكتملة الصور. سيظهر المحتوى الأساسي للزوار مباشرة.
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {config.banners.map((banner) => (
            <div
              key={banner.id}
              className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-slate-50/60 relative group"
            >
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={banner.isActive}
                    onChange={(e) => {
                      const updated = config.banners.map((b) =>
                        b.id === banner.id ? { ...b, isActive: e.target.checked } : b
                      );
                      setConfig({ ...config, banners: updated });
                    }}
                    className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-700">مفعل في الواجهة</span>
                </label>

                <button
                  onClick={() => {
                    if (window.confirm('هل أنت متأكد من حذف هذا البانر؟')) {
                      const updated = config.banners.filter((b) => b.id !== banner.id);
                      setConfig({ ...config, banners: updated });
                    }
                  }}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="حذف البانر"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Direct File Upload Dropzone */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-700">
                    صورة البانر (رفع مباشر من جهازك)
                  </label>
                  {banner.imageUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        const updated = config.banners.map((b) =>
                          b.id === banner.id ? { ...b, imageUrl: '' } : b
                        );
                        setConfig({ ...config, banners: updated });
                      }}
                      className="text-[10px] font-bold text-rose-600 hover:text-rose-700"
                    >
                      إزالة الصورة
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="flex items-center justify-center gap-2 px-3 py-2.5 bg-white border border-dashed border-emerald-400 hover:border-emerald-600 rounded-xl cursor-pointer text-xs text-emerald-800 font-bold transition-colors shadow-xs">
                    {uploadingBannerId === banner.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
                        <span>جارٍ المعالجة والرفع...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 text-emerald-700" />
                        <span>{banner.imageUrl ? 'تغيير صورة البانر' : 'اختر صورة لرفعها (JPG/PNG)'}</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onClick={(e) => {
                        (e.target as HTMLInputElement).value = '';
                      }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleBannerFileUpload(banner.id, file);
                      }}
                      disabled={uploadingBannerId === banner.id}
                    />
                  </label>

                  {/* Optional direct URL input */}
                  <input
                    type="text"
                    value={banner.imageUrl || ''}
                    onChange={(e) => {
                      const updated = config.banners.map((b) =>
                        b.id === banner.id ? { ...b, imageUrl: e.target.value } : b
                      );
                      setConfig({ ...config, banners: updated });
                    }}
                    placeholder="أو الصق رابط صورة مباشر (URL)"
                    dir="ltr"
                    className="w-full px-2.5 py-1 text-[11px] bg-white/70 border border-slate-200 rounded-lg font-mono text-slate-600"
                  />
                </div>
              </div>

              {/* Image Preview */}
              {banner.imageUrl && (
                <div className="h-32 w-full bg-slate-900 rounded-xl overflow-hidden relative border border-slate-200 shadow-xs">
                  <img
                    src={banner.imageUrl}
                    alt={banner.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent flex items-end p-2.5">
                    <span className="text-white text-[11px] font-bold truncate">{banner.title}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">العنوان الرئيسي</label>
                <input
                  type="text"
                  value={banner.title}
                  onChange={(e) => {
                    const updated = config.banners.map((b) =>
                      b.id === banner.id ? { ...b, title: e.target.value } : b
                    );
                    setConfig({ ...config, banners: updated });
                  }}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-xl"
                  placeholder="مثال: حفل تكريم الطلاب المتميزين"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">وصف فرعي مختصر</label>
                <input
                  type="text"
                  value={banner.subtitle || ''}
                  onChange={(e) => {
                    const updated = config.banners.map((b) =>
                      b.id === banner.id ? { ...b, subtitle: e.target.value } : b
                    );
                    setConfig({ ...config, banners: updated });
                  }}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-xl"
                  placeholder="مثال: برعاية الجمعية الخيرية لتحفيظ القرآن"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">نص الزر</label>
                  <input
                    type="text"
                    value={banner.ctaText || ''}
                    onChange={(e) => {
                      const updated = config.banners.map((b) =>
                        b.id === banner.id ? { ...b, ctaText: e.target.value } : b
                      );
                      setConfig({ ...config, banners: updated });
                    }}
                    className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded-lg"
                    placeholder="التفاصيل"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">رابط الزر (URL)</label>
                  <input
                    type="text"
                    value={banner.linkUrl || ''}
                    onChange={(e) => {
                      const updated = config.banners.map((b) =>
                        b.id === banner.id ? { ...b, linkUrl: e.target.value } : b
                      );
                      setConfig({ ...config, banners: updated });
                    }}
                    className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded-lg text-left font-mono"
                    dir="ltr"
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>
          ))}

          {config.banners.length === 0 && (
            <div className="col-span-full py-10 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
              <ImageIcon className="w-8 h-8 mx-auto text-slate-300 mb-1" />
              <div className="text-xs font-bold text-slate-600">لا توجد بانرات مضافة بعد</div>
              <p className="text-[11px] text-slate-400 mt-0.5">انقر على "إضافة بانر جديد" لإضافة أول صورة ترويجية</p>
            </div>
          )}
        </div>
      </div>

      )}

      {/* 4. ADS & YOUTUBE VIDEO ADS MANAGEMENT */}
      {(activeSubTab === 'all' || activeSubTab === 'ads' || activeSubTab === 'videos') && (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">شريط الإعلانات والفيديو الترويجي (Ads & Videos)</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              إضافة إعلانات نصية، صور مرفوعة، أو فيديوهات يوتيوب مع استخراج تلقائي لمعرف الفيديو والصورة المصغرة.
            </p>
          </div>

          <button
            onClick={() => {
              const newAd: AdItem = {
                id: `ad_${Date.now()}`,
                type: 'image',
                mediaUrl: '',
                title: 'إعلان جديد',
                description: '',
                isActive: true,
                order: config.announcements.length + 1,
              };
              setConfig({ ...config, announcements: [...config.announcements, newAd] });
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-50 text-amber-900 hover:bg-amber-100 text-xs font-bold border border-amber-200 transition-colors self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة إعلان جديد</span>
          </button>
        </div>

        <div className="space-y-4">
          {config.announcements.map((ad) => {
            const youtubeId = ad.type === 'video' ? extractYouTubeId(ad.mediaUrl) : null;
            const youtubeThumb = youtubeId ? getYouTubeThumbnail(youtubeId) : null;

            return (
              <div
                key={ad.id}
                className="border border-slate-200 rounded-2xl p-5 bg-slate-50/60 space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">النوع:</span>
                      <select
                        value={ad.type}
                        onChange={(e) => {
                          const val = e.target.value as 'image' | 'video';
                          const updated = config.announcements.map((a) =>
                            a.id === ad.id ? { ...a, type: val } : a
                          );
                          setConfig({ ...config, announcements: updated });
                        }}
                        className="text-xs font-bold bg-white border border-slate-300 rounded-xl px-2.5 py-1"
                      >
                        <option value="image">صورة ثابتة / نص</option>
                        <option value="video">فيديو يوتيوب</option>
                      </select>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ad.isActive}
                        onChange={(e) => {
                          const updated = config.announcements.map((a) =>
                            a.id === ad.id ? { ...a, isActive: e.target.checked } : a
                          );
                          setConfig({ ...config, announcements: updated });
                        }}
                        className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-700">مفعل</span>
                    </label>
                  </div>

                  <button
                    onClick={() => {
                      if (window.confirm('هل أنت متأكد من حذف هذا الإعلان؟')) {
                        const updated = config.announcements.filter((a) => a.id !== ad.id);
                        setConfig({ ...config, announcements: updated });
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="حذف الإعلان"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Col */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        عنوان الإعلان (يظهر في الشريط المتحرك)
                      </label>
                      <input
                        type="text"
                        value={ad.title}
                        onChange={(e) => {
                          const updated = config.announcements.map((a) =>
                            a.id === ad.id ? { ...a, title: e.target.value } : a
                          );
                          setConfig({ ...config, announcements: updated });
                        }}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl"
                        placeholder="مثال: بدء التسجيل للفصل الدراسي الثاني"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        تفاصيل إضافية / نبذة
                      </label>
                      <textarea
                        value={ad.description || ''}
                        onChange={(e) => {
                          const updated = config.announcements.map((a) =>
                            a.id === ad.id ? { ...a, description: e.target.value } : a
                          );
                          setConfig({ ...config, announcements: updated });
                        }}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl h-16 leading-relaxed"
                        placeholder="معلومات إضافية عن الفعالية أو الإعلان..."
                      />
                    </div>

                    {/* Media Input: File Upload for Image, or YouTube Link for Video */}
                    {ad.type === 'image' ? (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-bold text-slate-700">
                            صورة الإعلان (رفع مباشر أو رابط)
                          </label>
                          {ad.mediaUrl && (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = config.announcements.map((a) =>
                                  a.id === ad.id ? { ...a, mediaUrl: '' } : a
                                );
                                setConfig({ ...config, announcements: updated });
                              }}
                              className="text-[10px] font-bold text-rose-600 hover:text-rose-700"
                            >
                              إزالة الصورة
                            </button>
                          )}
                        </div>

                        <div className="space-y-2">
                          <label className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-dashed border-emerald-400 hover:border-emerald-600 rounded-xl cursor-pointer text-xs text-emerald-800 font-bold transition-colors">
                            {uploadingAdId === ad.id ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
                                <span>جارٍ المعالجة والرفع...</span>
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4 text-emerald-700" />
                                <span>{ad.mediaUrl ? 'تغيير صورة الإعلان' : 'رفع صورة الإعلان (JPG/PNG)'}</span>
                              </>
                            )}
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              onClick={(e) => {
                                (e.target as HTMLInputElement).value = '';
                              }}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleAdFileUpload(ad.id, file);
                              }}
                              disabled={uploadingAdId === ad.id}
                            />
                          </label>

                          <input
                            type="text"
                            value={ad.mediaUrl || ''}
                            onChange={(e) => {
                              const updated = config.announcements.map((a) =>
                                a.id === ad.id ? { ...a, mediaUrl: e.target.value } : a
                              );
                              setConfig({ ...config, announcements: updated });
                            }}
                            placeholder="أو الصق رابط صورة مباشر (URL)"
                            dir="ltr"
                            className="w-full px-2.5 py-1 text-[11px] bg-white/70 border border-slate-200 rounded-lg font-mono text-slate-600"
                          />
                        </div>

                        {ad.mediaUrl && (
                          <div className="mt-2 h-24 w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                            <img
                              src={ad.mediaUrl}
                              alt="ad preview"
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          رابط فيديو يوتيوب (YouTube URL)
                        </label>
                        <input
                          type="text"
                          value={ad.mediaUrl}
                          onChange={(e) => {
                            const updated = config.announcements.map((a) =>
                              a.id === ad.id ? { ...a, mediaUrl: e.target.value } : a
                            );
                            setConfig({ ...config, announcements: updated });
                          }}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl text-left font-mono"
                          dir="ltr"
                          placeholder="https://www.youtube.com/watch?v=... أو https://youtu.be/..."
                        />

                        {youtubeId && youtubeThumb && (
                          <div className="mt-2 flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-200">
                            <div className="relative w-24 h-16 rounded-lg overflow-hidden shrink-0 bg-black">
                              <img
                                src={youtubeThumb}
                                alt="YouTube Thumbnail"
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <Play className="w-5 h-5 text-white fill-current" />
                              </div>
                            </div>
                            <div className="text-right flex-1 min-w-0">
                              <span className="text-[11px] font-bold text-emerald-800 block">
                                تم التعرف على فيديو يوتيوب بنجاح!
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono truncate block">
                                معرف الفيديو: {youtubeId}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Col */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                          نص زر التفاعل (CTA)
                        </label>
                        <input
                          type="text"
                          value={ad.ctaText || ''}
                          onChange={(e) => {
                            const updated = config.announcements.map((a) =>
                              a.id === ad.id ? { ...a, ctaText: e.target.value } : a
                            );
                            setConfig({ ...config, announcements: updated });
                          }}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-xl"
                          placeholder="سجل الآن"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                          رابط التفاعل (URL)
                        </label>
                        <input
                          type="text"
                          value={ad.ctaUrl || ''}
                          onChange={(e) => {
                            const updated = config.announcements.map((a) =>
                              a.id === ad.id ? { ...a, ctaUrl: e.target.value } : a
                            );
                            setConfig({ ...config, announcements: updated });
                          }}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-xl text-left font-mono"
                          dir="ltr"
                          placeholder="https://..."
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                          هاتف تواصل إضافي
                        </label>
                        <input
                          type="tel"
                          value={ad.contactNumber || ''}
                          onChange={(e) => {
                            const updated = config.announcements.map((a) =>
                              a.id === ad.id ? { ...a, contactNumber: e.target.value } : a
                            );
                            setConfig({ ...config, announcements: updated });
                          }}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-xl text-left font-mono"
                          dir="ltr"
                          placeholder="05XXXXXXXX"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                          واتساب إضافي للإعلان
                        </label>
                        <input
                          type="tel"
                          value={ad.contactWhatsapp || ''}
                          onChange={(e) => {
                            const updated = config.announcements.map((a) =>
                              a.id === ad.id ? { ...a, contactWhatsapp: e.target.value } : a
                            );
                            setConfig({ ...config, announcements: updated });
                          }}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-xl text-left font-mono"
                          dir="ltr"
                          placeholder="05XXXXXXXX"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {config.announcements.length === 0 && (
            <div className="py-8 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
              <Video className="w-8 h-8 mx-auto text-slate-300 mb-1" />
              <div className="text-xs font-bold text-slate-600">لا توجد إعلانات مضافة بعد</div>
            </div>
          )}
        </div>
      </div>

      )}

      {/* 5. AI PROMPT ASSISTANT FOR ISLAMIC/QURANIC BANNERS */}
      {(activeSubTab === 'all' || activeSubTab === 'banners') && (
      <div className="bg-gradient-to-br from-indigo-50/70 via-slate-50 to-emerald-50/50 rounded-3xl border border-indigo-200/80 p-6 space-y-4 shadow-xs">
        <div className="flex items-center gap-2.5 border-b border-indigo-100 pb-3">
          <div className="p-2 bg-indigo-600 text-white rounded-xl">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">مساعد الذكاء الاصطناعي لتوليد تصاميم وبانرات المجمع</h3>
            <p className="text-[11px] text-slate-500">
              أداة مساعدة لصياغة أوامر توليد صور احترافية (Prompts) متوافقة مع الهوية القرآنية وتترك مساحة لشعار المجمع.
            </p>
          </div>
        </div>

        {/* Quick Presets */}
        <div>
          <span className="block text-xs font-bold text-slate-700 mb-2">قوالب سريعة جاهزة للنسخ:</span>
          <div className="flex flex-wrap gap-2">
            {Object.entries(promptPresets).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => handleSelectPreset(key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedPromptCategory === key
                    ? 'bg-indigo-700 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Subject Input */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            أو صياغة أمر مخصص لمناسبة محددة:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={promptSubject}
              onChange={(e) => setPromptSubject(e.target.value)}
              placeholder="مثال: حفل إفطار سنوي لطلاب المجمع القرآني بمشاركة أولياء الأمور..."
              className="flex-1 px-3 py-2 text-xs bg-white border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <button
              onClick={generateCustomPrompt}
              className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors whitespace-nowrap cursor-pointer"
            >
              توليد النص
            </button>
          </div>
        </div>

        {/* Prompt Output with Copy Button */}
        {generatedPrompt && (
          <div className="mt-3 p-4 bg-white rounded-2xl border border-indigo-200/90 shadow-2xs relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-indigo-900">الأمر الجاهز للنسخ واللصق:</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatedPrompt);
                  setCopiedPrompt(true);
                  setTimeout(() => setCopiedPrompt(false), 2500);
                }}
                className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-lg text-xs font-bold border border-indigo-200 transition-colors cursor-pointer"
              >
                {copiedPrompt ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">تم النسخ بنجاح!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-indigo-600" />
                    <span>نسخ النص</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed text-right font-mono" dir="rtl">
              {generatedPrompt}
            </p>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
