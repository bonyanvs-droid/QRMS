import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useApp } from '../../context/AppContext';
import {
  Settings,
  Save,
  Navigation,
  MapPin,
  Locate,
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Info,
  Clock,
  Calendar,
  Check,
  RotateCw,
  Building2,
  GraduationCap,
  BookOpen,
  Layers,
  Search,
  Copy,
  Users,
  Sparkles,
} from 'lucide-react';
import { calculateDistanceMeters } from '../../utils/geoAttendance';
import {
  StageAttendanceOverride,
  HalaqahAttendanceOverride,
  HalaqahDaySchedule,
  ScheduleTimeType,
  PrayerTimeOffset,
} from '../../types';
import { MosquePrayerSettingsCard } from './MosquePrayerSettingsCard';
import { HalaqahScheduleEditor } from './HalaqahScheduleEditor';
import { BulkHalaqahScheduleModal } from './BulkHalaqahScheduleModal';
import {
  formatHalaqahStructuredSummary,
  getHalaqahActiveDays,
  STANDARD_WEEK_DAYS,
} from '../../utils/scheduleCalculator';

export const AttendanceSettingsTab: React.FC = () => {
  const {
    activeTenant,
    updateAttendanceConfig,
    updatePrayerConfig,
    updateHalaqah,
    bulkUpdateHalaqahs,
    prayerTimesToday,
    stages = [],
    halaqahs = [],
  } = useApp();

  // Tenant attendance config defaults
  const attendanceCfg = activeTenant?.attendanceConfig || {
    latitude: 21.56466,
    longitude: 39.1442,
    radiusMeters: 200,
    regularDays: [0, 1, 2, 3, 4], // Sun-Thu
    welcomeMessage: 'أهلاً بك في مقر المجمع القرآني. يرجى تسجيل حضورك الذكي عند تواجدك داخل النطاق المحدد.',
    startTime: '16:00',
    endTime: '18:00',
    lateThresholdMinutes: 15,
    attendanceScope: 'general',
  };

  const [latInput, setLatInput] = useState(attendanceCfg.latitude?.toString() || '21.56466');
  const [lngInput, setLngInput] = useState(attendanceCfg.longitude?.toString() || '39.14420');
  const [radiusInput, setRadiusInput] = useState(attendanceCfg.radiusMeters?.toString() || '200');
  const [startTimeInput, setStartTimeInput] = useState(attendanceCfg.startTime || '16:00');
  const [endTimeInput, setEndTimeInput] = useState(attendanceCfg.endTime || '18:00');
  const [lateThresholdInput, setLateThresholdInput] = useState(
    (attendanceCfg.lateThresholdMinutes || 15).toString()
  );
  const [regularDays, setRegularDays] = useState<number[]>(
    attendanceCfg.regularDays || [0, 1, 2, 3, 4]
  );
  const [welcomeMsgInput, setWelcomeMsgInput] = useState(
    attendanceCfg.welcomeMessage ||
      'أهلاً بك في مقر المجمع القرآني. يرجى تسجيل حضورك الذكي عند تواجدك داخل النطاق المحدد.'
  );

  // Scope Settings
  const [attendanceScope, setAttendanceScope] = useState<'general' | 'stage' | 'halaqah'>(
    attendanceCfg.attendanceScope || 'general'
  );
  const [stageOverrides, setStageOverrides] = useState<Record<string, StageAttendanceOverride>>(
    attendanceCfg.stageOverrides || {}
  );
  const [halaqahOverrides, setHalaqahOverrides] = useState<Record<string, HalaqahAttendanceOverride>>(
    attendanceCfg.halaqahOverrides || {}
  );

  // Selection states for scope editing
  const [selectedStageId, setSelectedStageId] = useState<string>(stages[0]?.id || 'baraem');
  const [selectedHalaqahId, setSelectedHalaqahId] = useState<string>(halaqahs[0]?.id || '');
  const [halaqahSearch, setHalaqahSearch] = useState<string>('');
  const [halaqahStageFilter, setHalaqahStageFilter] = useState<string>('all');

  // Geolocation states
  const [isLocating, setIsLocating] = useState(false);
  const [currentGps, setCurrentGps] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: string;
  } | null>(null);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [locateSuccessMsg, setLocateSuccessMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  // Interactive map state
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const userMarkerRef = useRef<L.CircleMarker | null>(null);

  // Baseline = persisted config merged over defaults — drives dirty detection.
  const baselineCfg = useMemo(() => {
    const defaults = {
      latitude: 21.56466,
      longitude: 39.1442,
      radiusMeters: 200,
      regularDays: [0, 1, 2, 3, 4],
      welcomeMessage: 'أهلاً بك في مقر المجمع القرآني. يرجى تسجيل حضورك الذكي عند تواجدك داخل النطاق المحدد.',
      startTime: '16:00',
      endTime: '18:00',
      lateThresholdMinutes: 15,
      attendanceScope: 'general',
    };
    return { ...defaults, ...(activeTenant?.attendanceConfig || {}) };
  }, [activeTenant?.attendanceConfig]);

  const isDirty = useMemo(() => {
    const sameDays = (a: number[], b: number[]) =>
      a.length === b.length && [...a].sort().every((v, i) => v === [...b].sort()[i]);
    return (
      (parseFloat(latInput) || 0) !== (baselineCfg.latitude || 0) ||
      (parseFloat(lngInput) || 0) !== (baselineCfg.longitude || 0) ||
      (parseInt(radiusInput) || 0) !== (baselineCfg.radiusMeters || 0) ||
      (startTimeInput || '16:00') !== (baselineCfg.startTime || '16:00') ||
      (endTimeInput || '18:00') !== (baselineCfg.endTime || '18:00') ||
      (parseInt(lateThresholdInput) || 15) !== (baselineCfg.lateThresholdMinutes || 15) ||
      !sameDays(regularDays, baselineCfg.regularDays || [0, 1, 2, 3, 4]) ||
      welcomeMsgInput !== (baselineCfg.welcomeMessage || '')
    );
  }, [latInput, lngInput, radiusInput, startTimeInput, endTimeInput, lateThresholdInput, regularDays, welcomeMsgInput, baselineCfg]);

  // Update inputs if activeTenant changes
  useEffect(() => {
    if (activeTenant?.attendanceConfig) {
      const cfg = activeTenant.attendanceConfig;
      setLatInput(cfg.latitude.toString());
      setLngInput(cfg.longitude.toString());
      setRadiusInput(cfg.radiusMeters.toString());
      setWelcomeMsgInput(cfg.welcomeMessage || '');
      setStartTimeInput(cfg.startTime || '16:00');
      setEndTimeInput(cfg.endTime || '18:00');
      setLateThresholdInput((cfg.lateThresholdMinutes || 15).toString());
      setRegularDays(cfg.regularDays || [0, 1, 2, 3, 4]);
      setAttendanceScope(cfg.attendanceScope || 'general');
      setStageOverrides(cfg.stageOverrides || {});
      setHalaqahOverrides(cfg.halaqahOverrides || {});
    }
  }, [activeTenant?.attendanceConfig]);

  useEffect(() => {
    if (stages.length > 0 && !selectedStageId) {
      setSelectedStageId(stages[0].id);
    }
    if (halaqahs.length > 0 && !selectedHalaqahId) {
      setSelectedHalaqahId(halaqahs[0].id);
    }
  }, [stages, halaqahs]);

  // Function to determine current location using GPS
  const handleDetectCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocateError('متصفحك لا يدعم ميزة تحديد الموقع الجغرافي (Geolocation).');
      return;
    }

    setIsLocating(true);
    setLocateError(null);
    setLocateSuccessMsg(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const rawLat = position.coords.latitude;
        const rawLng = position.coords.longitude;
        const accuracy = Math.round(position.coords.accuracy);

        const formattedLat = Number(rawLat.toFixed(6));
        const formattedLng = Number(rawLng.toFixed(6));

        setLatInput(formattedLat.toString());
        setLngInput(formattedLng.toString());

        setCurrentGps({
          latitude: formattedLat,
          longitude: formattedLng,
          accuracy,
          timestamp: new Date().toLocaleTimeString('ar-SA'),
        });

        setIsLocating(false);
        setLocateSuccessMsg(
          `تم رصد موقعك الجغرافي بنجاح بدقة (±${accuracy} متراً) وضبط الإحداثيات!`
        );
      },
      (error) => {
        setIsLocating(false);
        let errorMsg = 'تعذر تحديد الموقع الجغرافي.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMsg =
              'تم رفض إذن الوصول للموقع. يرجى السماح بالوصول للموقع الجغرافي من المتصفح.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg = 'معلومات الموقع الجغرافي غير متوفرة حالياً.';
            break;
          case error.TIMEOUT:
            errorMsg = 'انتهت مهلة استدعاء الموقع الجغرافي.';
            break;
          default:
            errorMsg = `خطأ أثناء جلب الموقع: ${error.message || 'غير معروف'}`;
            break;
        }
        setLocateError(errorMsg);
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      }
    );
  };

  // Initialize the interactive Leaflet map once (draggable pin + radius circle).
  useEffect(() => {
    const el = mapContainerRef.current;
    if (!el || mapRef.current) return;

    const initLat = parseFloat(latInput);
    const initLng = parseFloat(lngInput);
    const center: L.LatLngExpression = [
      !isNaN(initLat) ? initLat : 21.56466,
      !isNaN(initLng) ? initLng : 39.1442,
    ];

    const mosquePin = L.divIcon({
      className: '',
      html: `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 34 44">
        <path d="M17 1C8.7 1 2 7.7 2 16c0 11.2 14 26.4 14.6 27 .4.4 1 .4 1.4 0C18.6 42.4 32 27.2 32 16 32 7.7 25.3 1 17 1z" fill="#047857" stroke="#ffffff" stroke-width="2"/>
        <circle cx="17" cy="15.5" r="5.5" fill="#ffffff"/>
      </svg>`,
      iconSize: [34, 44],
      iconAnchor: [17, 43],
    });

    const map = L.map(el, { center, zoom: 16, scrollWheelZoom: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    const marker = L.marker(center, { draggable: true, icon: mosquePin }).addTo(map);
    const circle = L.circle(center, {
      radius: parseInt(radiusInput) || 200,
      color: '#047857',
      weight: 2,
      fillColor: '#10b981',
      fillOpacity: 0.12,
    }).addTo(map);

    const dropPin = (p: L.LatLng) => {
      setLatInput(p.lat.toFixed(6));
      setLngInput(p.lng.toFixed(6));
    };
    marker.on('dragend', () => dropPin(marker.getLatLng()));
    map.on('click', (e: L.LeafletMouseEvent) => dropPin(e.latlng));

    mapRef.current = map;
    markerRef.current = marker;
    circleRef.current = circle;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      circleRef.current = null;
      userMarkerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep pin + geofence circle in sync with the coordinate inputs.
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    const circle = circleRef.current;
    if (!map || !marker || !circle) return;
    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);
    if (isNaN(lat) || isNaN(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return;
    const ll = L.latLng(lat, lng);
    marker.setLatLng(ll);
    circle.setLatLng(ll);
    // Recenter only on meaningful jumps (detected location, big edits) —
    // not for micro-changes while typing or clicks already on-screen.
    if (map.distance(map.getCenter(), ll) > 500) {
      map.setView(ll, map.getZoom(), { animate: true });
    }
  }, [latInput, lngInput]);

  // Keep the geofence circle in sync with the radius input.
  useEffect(() => {
    const r = parseInt(radiusInput);
    if (circleRef.current && !isNaN(r) && r > 0) {
      circleRef.current.setRadius(r);
    }
  }, [radiusInput]);

  // Show the admin's own detected position as a blue dot.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !currentGps) return;
    const ll = L.latLng(currentGps.latitude, currentGps.longitude);
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng(ll);
    } else {
      userMarkerRef.current = L.circleMarker(ll, {
        radius: 7,
        color: '#ffffff',
        weight: 2,
        fillColor: '#2563eb',
        fillOpacity: 1,
      }).addTo(map);
    }
  }, [currentGps]);

  const daysOfWeek = [
    { index: 0, label: 'الأحد' },
    { index: 1, label: 'الإثنين' },
    { index: 2, label: 'الثلاثاء' },
    { index: 3, label: 'الأربعاء' },
    { index: 4, label: 'الخميس' },
    { index: 5, label: 'الجمعة' },
    { index: 6, label: 'السبت' },
  ];

  // Helper functions for general days toggle
  const toggleGeneralDay = (dayIndex: number) => {
    setRegularDays((prev) =>
      prev.includes(dayIndex) ? prev.filter((d) => d !== dayIndex) : [...prev, dayIndex].sort()
    );
  };

  // Helper functions for Stage Overrides
  const getStageDays = (stageId: string): number[] => {
    return stageOverrides[stageId]?.regularDays ?? regularDays;
  };

  const toggleStageDay = (stageId: string, dayIndex: number) => {
    const currentDays = getStageDays(stageId);
    const updated = currentDays.includes(dayIndex)
      ? currentDays.filter((d) => d !== dayIndex)
      : [...currentDays, dayIndex].sort();

    setStageOverrides((prev) => ({
      ...prev,
      [stageId]: {
        ...prev[stageId],
        regularDays: updated,
      },
    }));
  };

  const getStageTimes = (stageId: string) => {
    return {
      startTime: stageOverrides[stageId]?.startTime || startTimeInput || '16:00',
      endTime: stageOverrides[stageId]?.endTime || endTimeInput || '18:00',
    };
  };

  const setStageTimes = (stageId: string, startTime: string, endTime: string) => {
    setStageOverrides((prev) => ({
      ...prev,
      [stageId]: {
        regularDays: getStageDays(stageId),
        lateThresholdMinutes: getStageLateThreshold(stageId),
        ...prev[stageId],
        startTime,
        endTime,
      },
    }));
  };

  const getStageLateThreshold = (stageId: string): number => {
    return stageOverrides[stageId]?.lateThresholdMinutes ?? (parseInt(lateThresholdInput) || 15);
  };

  const setStageLateThreshold = (stageId: string, val: number) => {
    setStageOverrides((prev) => ({
      ...prev,
      [stageId]: {
        regularDays: getStageDays(stageId),
        ...prev[stageId],
        lateThresholdMinutes: val,
      },
    }));
  };

  const copyGeneralToStage = (stageId: string) => {
    setStageOverrides((prev) => ({
      ...prev,
      [stageId]: {
        regularDays: [...regularDays],
        startTime: startTimeInput,
        endTime: endTimeInput,
        lateThresholdMinutes: parseInt(lateThresholdInput) || 15,
      },
    }));
  };

  // Bulk Apply Schedule to Multiple Halaqahs
  const handleApplyBulkSchedule = async (params: {
    targetHalaqahIds: string[];
    weeklySchedule: HalaqahDaySchedule[];
    defaultTimeType: ScheduleTimeType;
    defaultStartTime?: string;
    defaultEndTime?: string;
    defaultStartPrayerOffset?: PrayerTimeOffset;
    defaultEndPrayerOffset?: PrayerTimeOffset;
    lateThresholdMinutes?: number;
  }) => {
    const activeDays = params.weeklySchedule.filter((d) => d.isActive).map((d) => d.dayOfWeek);

    // 1. Bulk update halaqahs in AppContext
    await bulkUpdateHalaqahs(params.targetHalaqahIds, {
      weeklySchedule: params.weeklySchedule,
      defaultTimeType: params.defaultTimeType,
      defaultStartTime: params.defaultStartTime,
      defaultEndTime: params.defaultEndTime,
      defaultStartPrayerOffset: params.defaultStartPrayerOffset,
      defaultEndPrayerOffset: params.defaultEndPrayerOffset,
      daysPerWeek: activeDays.length,
    });

    // 2. Update local halaqahOverrides for attendance
    setHalaqahOverrides((prev) => {
      const updated = { ...prev };
      params.targetHalaqahIds.forEach((id) => {
        updated[id] = {
          regularDays: activeDays,
          startTime: params.defaultStartTime,
          endTime: params.defaultEndTime,
          timeType: params.defaultTimeType,
          startPrayerOffset: params.defaultStartPrayerOffset,
          endPrayerOffset: params.defaultEndPrayerOffset,
          lateThresholdMinutes: params.lateThresholdMinutes || 15,
        };
      });
      return updated;
    });

    setSaveSuccessMsg(`تم بنجاح تعميم الجدول والمواعيد على (${params.targetHalaqahIds.length}) حلقة.`);
    setTimeout(() => setSaveSuccessMsg(null), 5000);
  };

  // Propagate stage schedule to all halaqahs of that stage
  const handlePropagateStageSchedule = async (stageId: string) => {
    const stageHalaqahs = halaqahs.filter(
      (h) => !h.isArchived && (h.stageId === stageId || h.grade === stageId)
    );

    if (stageHalaqahs.length === 0) {
      alert('لا توجد حلقات مرتبطة بهذه المرحلة حالياً.');
      return;
    }

    const stgDays = getStageDays(stageId);
    const stgTimes = getStageTimes(stageId);
    const stgThreshold = getStageLateThreshold(stageId);

    const weeklySchedule: HalaqahDaySchedule[] = STANDARD_WEEK_DAYS.map((day) => ({
      dayOfWeek: day.dayOfWeek,
      dayName: day.dayName,
      isActive: stgDays.includes(day.dayOfWeek),
      timeType: 'fixed',
      startTime: stgTimes.startTime,
      endTime: stgTimes.endTime,
      isCustomTime: false,
    }));

    const confirmMsg = `هل ترغب في تعميم مواعيد هذه المرحلة (${stgTimes.startTime} إلى ${stgTimes.endTime}) وأيامها على جميع حلقاتها (${stageHalaqahs.length} حلقة)؟`;
    if (!window.confirm(confirmMsg)) return;

    await handleApplyBulkSchedule({
      targetHalaqahIds: stageHalaqahs.map((h) => h.id),
      weeklySchedule,
      defaultTimeType: 'fixed',
      defaultStartTime: stgTimes.startTime,
      defaultEndTime: stgTimes.endTime,
      lateThresholdMinutes: stgThreshold,
    });
  };

  // Propagate general schedule to all active halaqahs
  const handlePropagateGeneralSchedule = async () => {
    const activeHalaqahs = halaqahs.filter((h) => !h.isArchived);
    if (activeHalaqahs.length === 0) {
      alert('لا توجد حلقات نشطة في المجمع حالياً.');
      return;
    }

    const confirmMsg = `هل ترغب في تعميم التوقيت العام للمجمع (${startTimeInput} إلى ${endTimeInput}) وأيام الدوام على جميع حلقات المجمع (${activeHalaqahs.length} حلقة)؟`;
    if (!window.confirm(confirmMsg)) return;

    const weeklySchedule: HalaqahDaySchedule[] = STANDARD_WEEK_DAYS.map((day) => ({
      dayOfWeek: day.dayOfWeek,
      dayName: day.dayName,
      isActive: regularDays.includes(day.dayOfWeek),
      timeType: 'fixed',
      startTime: startTimeInput,
      endTime: endTimeInput,
      isCustomTime: false,
    }));

    await handleApplyBulkSchedule({
      targetHalaqahIds: activeHalaqahs.map((h) => h.id),
      weeklySchedule,
      defaultTimeType: 'fixed',
      defaultStartTime: startTimeInput,
      defaultEndTime: endTimeInput,
      lateThresholdMinutes: parseInt(lateThresholdInput) || 15,
    });
  };

  // Helper functions for Halaqah Overrides
  const getHalaqahDays = (halaqahId: string): number[] => {
    return halaqahOverrides[halaqahId]?.regularDays ?? regularDays;
  };

  const toggleHalaqahDay = (halaqahId: string, dayIndex: number) => {
    const currentDays = getHalaqahDays(halaqahId);
    const updated = currentDays.includes(dayIndex)
      ? currentDays.filter((d) => d !== dayIndex)
      : [...currentDays, dayIndex].sort();

    setHalaqahOverrides((prev) => ({
      ...prev,
      [halaqahId]: {
        ...prev[halaqahId],
        regularDays: updated,
      },
    }));
  };

  const getHalaqahTimes = (halaqahId: string) => {
    return {
      startTime: halaqahOverrides[halaqahId]?.startTime || startTimeInput || '16:00',
      endTime: halaqahOverrides[halaqahId]?.endTime || endTimeInput || '18:00',
    };
  };

  const setHalaqahTimes = (halaqahId: string, startTime: string, endTime: string) => {
    setHalaqahOverrides((prev) => ({
      ...prev,
      [halaqahId]: {
        regularDays: getHalaqahDays(halaqahId),
        lateThresholdMinutes: getHalaqahLateThreshold(halaqahId),
        ...prev[halaqahId],
        startTime,
        endTime,
      },
    }));
  };

  const getHalaqahLateThreshold = (halaqahId: string): number => {
    return halaqahOverrides[halaqahId]?.lateThresholdMinutes ?? (parseInt(lateThresholdInput) || 15);
  };

  const setHalaqahLateThreshold = (halaqahId: string, val: number) => {
    setHalaqahOverrides((prev) => ({
      ...prev,
      [halaqahId]: {
        regularDays: getHalaqahDays(halaqahId),
        ...prev[halaqahId],
        lateThresholdMinutes: val,
      },
    }));
  };

  const copyGeneralToHalaqah = (halaqahId: string) => {
    setHalaqahOverrides((prev) => ({
      ...prev,
      [halaqahId]: {
        regularDays: [...regularDays],
        startTime: startTimeInput,
        endTime: endTimeInput,
        lateThresholdMinutes: parseInt(lateThresholdInput) || 15,
      },
    }));
  };

  // Calculate live distance
  const parsedTargetLat = parseFloat(latInput);
  const parsedTargetLng = parseFloat(lngInput);
  const parsedRadius = parseInt(radiusInput) || 200;

  const liveDistance =
    currentGps && !isNaN(parsedTargetLat) && !isNaN(parsedTargetLng)
      ? calculateDistanceMeters(
          currentGps.latitude,
          currentGps.longitude,
          parsedTargetLat,
          parsedTargetLng
        )
      : null;

  const isWithinRadius = liveDistance !== null ? liveDistance <= parsedRadius : null;

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant) return;

    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);
    const rad = parseInt(radiusInput);

    if (isNaN(lat) || isNaN(lng)) {
      alert('يرجى التأكد من كتابة إحداثيات صحيحة لخط العرض وخط الطول.');
      return;
    }

    if (isNaN(rad) || rad <= 0) {
      alert('يرجى تحديد نطاق حضور صحيح أكبر من صفر.');
      return;
    }

    setIsSaving(true);
    setSaveSuccessMsg(null);

    try {
      await updateAttendanceConfig({
        latitude: lat,
        longitude: lng,
        radiusMeters: rad,
        regularDays,
        welcomeMessage: welcomeMsgInput,
        startTime: startTimeInput,
        endTime: endTimeInput,
        lateThresholdMinutes: parseInt(lateThresholdInput) || 15,
        attendanceScope,
        stageOverrides,
        halaqahOverrides,
      });

      setIsSaving(false);
      setSaveSuccessMsg('تم حفظ وتحديث كافة إعدادات الحضور والانصراف وأوقات الدوام وأيام العمل بنجاح.');
      setTimeout(() => {
        setSaveSuccessMsg(null);
      }, 5000);
    } catch (err: any) {
      setIsSaving(false);
      alert('حدث خطأ أثناء الحفظ: ' + (err.message || 'تعذر التحديث'));
    }
  };

  const radiusPresets = [50, 100, 150, 200, 300, 500];

  // Filtered halaqahs list for halaqah scope
  const filteredHalaqahs = halaqahs.filter((h) => {
    const matchesStage = halaqahStageFilter === 'all' || h.stageId === halaqahStageFilter || h.grade === halaqahStageFilter;
    const matchesSearch = !halaqahSearch || h.name.includes(halaqahSearch) || (h.teacherName && h.teacherName.includes(halaqahSearch));
    return matchesStage && matchesSearch;
  });

  const selectedStage = stages.find((s) => s.id === selectedStageId) || stages[0];
  const selectedHalaqah = halaqahs.find((h) => h.id === selectedHalaqahId) || halaqahs[0];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center shadow-inner">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">إعدادات الحضور والانصراف وأوقات الدوام</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              تحديد موقع المجمع ونطاق الحضور الجغرافي، أيام الدوام، وأوقات البداية والنهاية، ووقت التأخير المعتمد.
            </p>
          </div>
        </div>
      </div>

      {/* Global Success / Error Banners */}
      {saveSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 text-emerald-900 text-xs font-bold animate-fade-in shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {locateSuccessMsg && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-3 text-blue-900 text-xs font-bold animate-fade-in shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
          <span>{locateSuccessMsg}</span>
        </div>
      )}

      {locateError && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3 text-rose-900 text-xs font-bold animate-fade-in shadow-xs">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{locateError}</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* SECTION 1: GEOFENCING & GPS COORDINATES */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-700" />
              <h4 className="text-base font-bold text-slate-800">إحداثيات الموقع ونطاق التحضير الذكي (GPS)</h4>
            </div>
            <button
              type="button"
              onClick={handleDetectCurrentLocation}
              disabled={isLocating}
              className={`cursor-pointer px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-sm shrink-0 ${
                isLocating
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                  : 'bg-emerald-700 hover:bg-emerald-800 text-white active:scale-95'
              }`}
            >
              {isLocating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  <span>جارٍ رصد إشارة GPS...</span>
                </>
              ) : (
                <>
                  <Locate className="w-4 h-4" />
                  <span>رصد الموقع الحقيقي الآن</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">خط العرض (Latitude):</label>
              <input
                type="text"
                value={latInput}
                onChange={(e) => setLatInput(e.target.value)}
                placeholder="21.564660"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">خط الطول (Longitude):</label>
              <input
                type="text"
                value={lngInput}
                onChange={(e) => setLngInput(e.target.value)}
                placeholder="39.144200"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">نطاق الحضور المسموح (بالمتر):</label>
              <input
                type="number"
                min="10"
                max="5000"
                value={radiusInput}
                onChange={(e) => setRadiusInput(e.target.value)}
                placeholder="200"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono"
                required
              />
            </div>
          </div>

          {/* Presets */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-500">خيارات سريعة لنطاق التحضير:</span>
            {radiusPresets.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRadiusInput(r.toString())}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                  radiusInput === r.toString()
                    ? 'bg-emerald-800 text-white border-emerald-800'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {r} متر
              </button>
            ))}
          </div>

          {/* GPS Distance Diagnostic */}
          {currentGps && liveDistance !== null && (
            <div
              className={`p-4 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isWithinRadius
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : 'bg-amber-50 border-amber-200 text-amber-950'
              }`}
            >
              <div className="space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  {isWithinRadius ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  )}
                  <span>
                    موقعك الحالي يبعد حوالي <strong className="font-mono text-sm">{Math.round(liveDistance)}</strong> متراً عن الإحداثيات المدخلة.
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  {isWithinRadius
                    ? 'أنت الآن داخل نطاق التحضير الذكي المعين. سيتمكن الكادر من تسجيل الحضور بنجاح.'
                    : `تنبيه: أنت خارج النطاق المحدد (${parsedRadius}م). يُفضل توسيع النطاق أو تحديث الإحداثيات.`}
                </p>
              </div>
            </div>
          )}

          {/* Interactive map — drop the pin to set the mosque location */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-700">
                حدّد موقع المجمع: انقر على الخريطة لإسقاط الدبوس أو اسحبه مباشرة
              </span>
              {!isNaN(parsedTargetLat) && !isNaN(parsedTargetLng) && (
                <a
                  href={`https://www.google.com/maps?q=${parsedTargetLat},${parsedTargetLng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1 shrink-0"
                >
                  <span>فتح في الخرائط</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <div
              ref={mapContainerRef}
              className="relative z-0 w-full h-[280px] rounded-xl overflow-hidden border border-slate-200 bg-slate-100"
            />
            {!isNaN(parsedTargetLat) && !isNaN(parsedTargetLng) && (
              <div className="text-[10px] text-slate-500 font-mono text-left">
                {parsedTargetLat.toFixed(6)}, {parsedTargetLng.toFixed(6)} | نطاق: {parsedRadius}م — الدائرة الخضراء = منطقة التحضير
              </div>
            )}
          </div>
        </div>

        {/* SECTION 2: WORK DAYS & ATTENDANCE TIMES */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <CalendarDays className="w-5 h-5 text-emerald-700" />
            <h4 className="text-base font-bold text-slate-800">أيام الدوام وأوقات الحضور</h4>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">أيام الدوام الأسبوعية المعتمدة:</label>
            <div className="flex flex-wrap items-center gap-2">
              {daysOfWeek.map((d) => (
                <button
                  key={d.index}
                  type="button"
                  onClick={() => toggleGeneralDay(d.index)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                    regularDays.includes(d.index)
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-500">إعداد سريع:</span>
              <button
                type="button"
                onClick={() => setRegularDays([0, 1, 2, 3, 4])}
                className="px-3 py-1 rounded-lg text-[11px] font-bold bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition cursor-pointer"
              >
                الأحد - الخميس
              </button>
              <button
                type="button"
                onClick={() => setRegularDays([0, 1, 2, 3, 4, 6])}
                className="px-3 py-1 rounded-lg text-[11px] font-bold bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition cursor-pointer"
              >
                السبت - الخميس
              </button>
              <button
                type="button"
                onClick={() => setRegularDays([0, 1, 2, 3, 4, 5, 6])}
                className="px-3 py-1 rounded-lg text-[11px] font-bold bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition cursor-pointer"
              >
                طوال الأسبوع
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-700" />
                وقت بداية الدوام:
              </label>
              <input
                type="time"
                value={startTimeInput}
                onChange={(e) => setStartTimeInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-700" />
                وقت نهاية الدوام:
              </label>
              <input
                type="time"
                value={endTimeInput}
                onChange={(e) => setEndTimeInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">عتبة التأخير المسموحة (بالدقائق):</label>
              <input
                type="number"
                min="0"
                max="120"
                value={lateThresholdInput}
                onChange={(e) => setLateThresholdInput(e.target.value)}
                placeholder="15"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono"
                required
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            تُستخدم هذه القيم في تحديد ما إذا كان يوم التسجيل يوم دوام اعتيادي، وكمصدر للتوقيت العام عند تعميم مواعيد الحلقات.
          </p>
        </div>

        {/* SECTION 3: WELCOME MESSAGE CARD */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Info className="w-5 h-5 text-emerald-700" />
            <h4 className="text-base font-bold text-slate-800">رسالة الترحيب والتحقق الذكية</h4>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              نص الرسالة التي تظهر للمستخدم عند فتح النظام داخل نطاق المجمع:
            </label>
            <textarea
              value={welcomeMsgInput}
              onChange={(e) => setWelcomeMsgInput(e.target.value)}
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              placeholder="أهلاً بك في مقر المجمع القرآني. يرجى تسجيل حضورك الذكي عند تواجدك داخل النطاق المحدد."
              required
            />
          </div>
        </div>

        {/* STICKY SAVE BAR — saves the attendance domain only (map + days/times + welcome) */}
        <div className="sticky bottom-4 z-30">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-lg px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-slate-500 font-medium">
              * يحفظ إعدادات الموقع والنطاق وأيام الدوام والأوقات ورسالة الترحيب، وتُطبَّق فوراً على التحضير الذكي.
            </span>
            <button
              type="submit"
              disabled={isSaving || !isDirty}
              className="w-full sm:w-auto px-8 py-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-bold shadow-md flex items-center justify-center gap-2 transition cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>جارٍ الحفظ...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isDirty ? 'حفظ إعدادات الحضور' : 'لا تغييرات للحفظ'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* STANDALONE TOOLS — each saves/applies independently of the form above */}
      <div className="pt-4 border-t border-slate-200">
        <p className="text-xs font-bold text-slate-400 mb-4">
          أدوات مستقلة للمجمع — لكل بطاقة إجراؤها الخاص المنفصل عن إعدادات الحضور أعلاه
        </p>
        <div className="space-y-6">
          {activeTenant && (
            <MosquePrayerSettingsCard
              tenant={activeTenant}
              onSaveConfig={updatePrayerConfig}
            />
          )}
          <BulkHalaqahScheduleModal
            inline={true}
            halaqahs={halaqahs}
            stages={stages}
            prayerTimesToday={prayerTimesToday}
            onApply={handleApplyBulkSchedule}
          />
        </div>
      </div>

    </div>
  );
};
