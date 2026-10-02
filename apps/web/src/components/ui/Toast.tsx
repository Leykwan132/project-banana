import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CircleCheck, CircleAlert, TriangleAlert, Info, X } from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────────── */

type ToastVariant = 'success' | 'danger' | 'warning' | 'info';

interface ToastOptions {
    title: string;
    description?: string;
    color?: ToastVariant;
    duration?: number;
}

interface ToastEntry extends ToastOptions {
    id: string;
}

type AddToastFn = (options: ToastOptions) => void;

/* ─── Context ────────────────────────────────────────────────── */

const ToastContext = createContext<AddToastFn | null>(null);

export function useToast(): AddToastFn {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
    return ctx;
}

/* ─── Singleton (imperative) ─────────────────────────────────── */

let _addToast: AddToastFn | null = null;

/** Imperative `toast()` — works anywhere after `<ToastProvider>` mounts. */
export function toast(options: ToastOptions) {
    if (!_addToast) {
        console.warn('[Toast] ToastProvider not mounted yet');
        return;
    }
    _addToast(options);
}

/* ─── Variant config ─────────────────────────────────────────── */

const variantConfig: Record<ToastVariant, {
    icon: typeof CircleCheck;
    containerClass: string;
    iconClass: string;
    titleClass: string;
    descClass: string;
    closeClass: string;
}> = {
    success: {
        icon: CircleCheck,
        containerClass: 'bg-emerald-50 border-emerald-200',
        iconClass: 'text-emerald-500',
        titleClass: 'text-emerald-900',
        descClass: 'text-emerald-600',
        closeClass: 'text-emerald-400 hover:text-emerald-600',
    },
    danger: {
        icon: CircleAlert,
        containerClass: 'bg-red-50 border-red-200',
        iconClass: 'text-red-500',
        titleClass: 'text-red-900',
        descClass: 'text-red-600',
        closeClass: 'text-red-400 hover:text-red-600',
    },
    warning: {
        icon: TriangleAlert,
        containerClass: 'bg-amber-50 border-amber-200',
        iconClass: 'text-amber-500',
        titleClass: 'text-amber-900',
        descClass: 'text-amber-600',
        closeClass: 'text-amber-400 hover:text-amber-600',
    },
    info: {
        icon: Info,
        containerClass: 'bg-gray-50 border-gray-200',
        iconClass: 'text-gray-500',
        titleClass: 'text-gray-900',
        descClass: 'text-gray-500',
        closeClass: 'text-gray-400 hover:text-gray-600',
    },
};

/* ─── Individual Toast ───────────────────────────────────────── */

function ToastItem({ entry, onDismiss }: { entry: ToastEntry; onDismiss: (id: string) => void }) {
    const variant = entry.color ?? 'info';
    const cfg = variantConfig[variant];
    const Icon = cfg.icon;
    const [isExiting, setIsExiting] = useState(false);

    const dismiss = useCallback(() => {
        setIsExiting(true);
        setTimeout(() => onDismiss(entry.id), 220);
    }, [entry.id, onDismiss]);

    useEffect(() => {
        const timeout = setTimeout(dismiss, entry.duration ?? 3000);
        return () => clearTimeout(timeout);
    }, [dismiss, entry.duration]);

    return (
        <div
            className={`toast-item ${isExiting ? 'toast-exit' : 'toast-enter'}`}
            role="alert"
        >
            <div
                className={`
                    flex items-start gap-3 px-4 py-3 rounded-xl border shadow-sm
                    min-w-[320px] max-w-[420px]
                    ${cfg.containerClass}
                `}
            >
                <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${cfg.iconClass}`} />

                <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold leading-snug ${cfg.titleClass}`}>
                        {entry.title}
                    </p>
                    {entry.description && (
                        <p className={`text-[13px] leading-snug mt-0.5 ${cfg.descClass}`}>
                            {entry.description}
                        </p>
                    )}
                </div>

                <button
                    onClick={dismiss}
                    className={`shrink-0 mt-0.5 rounded-full p-0.5 transition-colors ${cfg.closeClass}`}
                    aria-label="Close"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}

/* ─── Provider ───────────────────────────────────────────────── */

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastEntry[]>([]);
    const counterRef = useRef(0);

    const addToast: AddToastFn = useCallback((options) => {
        counterRef.current += 1;
        const id = `toast-${counterRef.current}-${Date.now()}`;
        setToasts((prev) => [...prev, { ...options, id }]);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    // Register singleton
    useEffect(() => {
        _addToast = addToast;
        return () => {
            _addToast = null;
        };
    }, [addToast]);

    return (
        <ToastContext.Provider value={addToast}>
            {children}
            {createPortal(
                <div className="toast-container">
                    {toasts.map((entry) => (
                        <ToastItem key={entry.id} entry={entry} onDismiss={removeToast} />
                    ))}

                    <style>{`
                        .toast-container {
                            position: fixed;
                            top: 24px;
                            left: 50%;
                            transform: translateX(-50%);
                            z-index: 99999;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            gap: 8px;
                            pointer-events: none;
                        }
                        .toast-item {
                            pointer-events: auto;
                        }
                        .toast-enter {
                            animation: toastSlideIn 0.25s ease-out forwards;
                        }
                        .toast-exit {
                            animation: toastSlideOut 0.22s ease-in forwards;
                        }
                        @keyframes toastSlideIn {
                            from {
                                opacity: 0;
                                transform: translateY(-12px) scale(0.96);
                            }
                            to {
                                opacity: 1;
                                transform: translateY(0) scale(1);
                            }
                        }
                        @keyframes toastSlideOut {
                            from {
                                opacity: 1;
                                transform: translateY(0) scale(1);
                            }
                            to {
                                opacity: 0;
                                transform: translateY(-12px) scale(0.96);
                            }
                        }
                    `}</style>
                </div>,
                document.body
            )}
        </ToastContext.Provider>
    );
}
