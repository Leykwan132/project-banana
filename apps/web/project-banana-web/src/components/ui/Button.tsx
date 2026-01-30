import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    isLoading?: boolean;
    icon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    isLoading = false,
    icon,
    className = '',
    disabled,
    ...props
}) => {
    const baseStyles = "rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2";

    const variants = {
        primary: "bg-[#1C1C1C] text-white px-8 py-3 hover:bg-gray-800 shadow-lg shadow-black/20",
        secondary: "bg-white/90 backdrop-blur-sm border border-gray-200 text-gray-900 px-8 py-3 font-medium hover:bg-gray-50 shadow-lg",
        outline: "bg-[#F4F6F8] text-gray-900 px-4 py-3 font-medium hover:bg-gray-200 border-none", // Matches the "Add" buttons
        ghost: "bg-transparent text-gray-500 hover:text-gray-900 px-0 py-0 shadow-none font-normal" // For back links etc
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${className}`}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
            {!isLoading && icon && <span className="shrink-0">{icon}</span>}
            {children}
        </button>
    );
};

export default Button;
