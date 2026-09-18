import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react';
import { safeStorage } from '../../lib/safeStorage';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleGoHome = () => {
    window.location.hash = '#public';
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleClearStorageAndReload = () => {
    try {
      safeStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.hash = '#/';
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const title = this.props.fallbackTitle || 'حدث خطأ غير متوقع أثناء عرض هذا القسم';
      const message =
        this.props.fallbackMessage ||
        'نعتذر عن هذا العطل المؤقت. يمكنك إعادة محاولة تحميل الصفحة أو العودة إلى الصفحة الرئيسية دون فقد بياناتك المسجلة.';

      return (
        <div className="w-full my-6 p-6 sm:p-8 bg-white rounded-3xl border border-rose-200 shadow-sm text-right space-y-4 animate-in fade-in duration-200">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-rose-100 text-rose-700 rounded-2xl shrink-0">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black">
                  تنبيه النظام
                </span>
                <h3 className="text-lg font-bold text-slate-900">{title}</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">{message}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={this.handleRetry}
              className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>إعادة المحاولة</span>
            </button>
            <button
              onClick={this.handleGoHome}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all border border-slate-200 flex items-center gap-1.5 cursor-pointer"
            >
              <Home className="w-4 h-4 text-slate-500" />
              <span>العودة للرئيسية</span>
            </button>
            <button
              onClick={this.handleClearStorageAndReload}
              className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-all border border-rose-200 flex items-center gap-1.5 cursor-pointer"
            >
              <span>مسح الذاكرة المؤقتة وإعادة التحميل</span>
            </button>
            <button
              onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
              className="px-3 py-2 text-slate-500 hover:text-slate-700 text-xs font-medium flex items-center gap-1 mr-auto cursor-pointer"
            >
              <span>تفاصيل الخطأ الفنية</span>
              {this.state.showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {this.state.showDetails && this.state.error && (
            <div className="mt-3 p-4 bg-slate-900 text-slate-100 rounded-2xl text-xs font-mono overflow-x-auto text-left dir-ltr">
              <div className="font-bold text-rose-400 mb-1">{this.state.error.toString()}</div>
              {this.state.errorInfo && (
                <pre className="text-[11px] text-slate-400 whitespace-pre-wrap">
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
