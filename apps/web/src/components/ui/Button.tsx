import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
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
    const baseStyles = "rounded-xl text-sm font-semibold transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2";

    const variants = {
        primary: "bg-[#1C1C1C] text-white px-5 py-2.5 hover:bg-gray-800",
        secondary: "bg-white/90 backdrop-blur-sm border border-gray-200 text-gray-900 px-5 py-2.5 hover:bg-gray-50",
        outline: "bg-[#F4F6F8] text-gray-900 px-5 py-2.5 hover:bg-gray-200 border-none", // Matches the "Add" buttons
        ghost: "bg-transparent text-gray-500 hover:text-gray-900 px-0 py-0 shadow-none font-normal", // For back links etc
        danger: "bg-[#D92D20] text-white border border-[#D92D20] px-5 py-2.5 hover:bg-[#B42318]"
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
