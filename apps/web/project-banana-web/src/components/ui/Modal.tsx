import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────────── */

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full';

interface ModalProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    size?: ModalSize;
    scrollBehavior?: 'inside' | 'outside';
    isDismissable?: boolean;
    hideCloseButton?: boolean;
    children: ReactNode;
    className?: string;
}

interface ModalContentProps {
    children: ReactNode | ((onClose: () => void) => ReactNode);
}

interface ModalSectionProps {
    children: ReactNode;
    className?: string;
}

/* ─── Size map ───────────────────────────────────────────────── */

const sizeClasses: Record<ModalSize, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    full: 'max-w-none w-full h-[100dvh] !rounded-none',
};

/* ─── Context-free sub-components ────────────────────────────── */

let _modalOnClose: (() => void) | null = null;

export function Modal({
    isOpen,
    onOpenChange,
    size = 'md',
    scrollBehavior = 'inside',
    isDismissable = true,
    hideCloseButton = false,
    children,
    className = '',
}: ModalProps) {
    const overlayRef = useRef<HTMLDivElement>(null);

    const handleClose = useCallback(() => {
        if (!isDismissable) return;
        onOpenChange(false);
    }, [isDismissable, onOpenChange]);

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleClose();
        };

        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [handleClose, isOpen]);

    // Lock body scroll
    useEffect(() => {
        if (!isOpen) return;

        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [isOpen]);

    // Register onClose for children
    useEffect(() => {
        if (isOpen) {
            _modalOnClose = handleClose;
        }
        return () => {
            if (_modalOnClose === handleClose) {
                _modalOnClose = null;
            }
        };
    }, [handleClose, isOpen]);

    if (!isOpen) return null;

    const isFullScreen = size === 'full';
    const scrollInside = scrollBehavior === 'inside';

    return createPortal(
        <div className="custom-modal-root">
            {/* Backdrop */}
            <div
                ref={overlayRef}
                className="custom-modal-backdrop"
                onClick={(e) => {
                    if (e.target === overlayRef.current) handleClose();
                }}
            >
                {/* Panel */}
                <div
                    className={`
                        custom-modal-panel
                        ${sizeClasses[size]}
                        ${isFullScreen ? '' : 'mx-4 my-6 rounded-2xl'}
                        ${scrollInside ? 'flex flex-col max-h-[calc(100dvh-48px)]' : ''}
                        ${className}
                    `}
                    role="dialog"
                    aria-modal="true"
                >
                    {/* Close button */}
                    {!hideCloseButton && !isFullScreen && (
                        <button
                            type="button"
                            onClick={handleClose}
                            className="absolute top-4 right-4 z-10 rounded-full p-1.5 text-gray-400 transition-colors hover:text-gray-600 hover:bg-gray-100"
                            aria-label="Close"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}

                    {children}
                </div>
            </div>

            <style>{`
                .custom-modal-root {
                    position: fixed;
                    inset: 0;
                    z-index: 9999;
                }
                .custom-modal-backdrop {
                    position: fixed;
                    inset: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(0, 0, 0, 0.5);
                    backdrop-filter: blur(4px);
                    animation: modalFadeIn 0.2s ease-out forwards;
                }
                .custom-modal-panel {
                    position: relative;
                    width: 100%;
                    background: white;
                    box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
                    animation: modalScaleIn 0.2s ease-out forwards;
                    overflow: hidden;
                }
                @keyframes modalFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes modalScaleIn {
                    from { opacity: 0; transform: scale(0.97); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>,
        document.body
    );
}

export function ModalContent({ children }: ModalContentProps) {
    const onClose = _modalOnClose ?? (() => {});

    return (
        <>
            {typeof children === 'function' ? children(onClose) : children}
        </>
    );
}

export function ModalHeader({ children, className = '' }: ModalSectionProps) {
    return (
        <div className={`px-6 py-5 border-b border-gray-100 ${className}`}>
            {children}
        </div>
    );
}

export function ModalBody({ children, className = '' }: ModalSectionProps) {
    return (
        <div className={`px-6 py-5 flex-1 overflow-y-auto ${className}`}>
            {children}
        </div>
    );
}

export function ModalFooter({ children, className = '' }: ModalSectionProps) {
    return (
        <div className={`px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 ${className}`}>
            {children}
        </div>
    );
}
