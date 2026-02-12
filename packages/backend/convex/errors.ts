

export const ErrorType = {
    // Authentication & Authorization (4000-4999)
    NOT_AUTHENTICATED: {
        code: 4001,
        message: "Not authenticated",
        severity: "high",
    },
    UNAUTHORIZED_ACCESS: {
        code: 4003,
        message: "You are not authorized to perform this action",
        severity: "high",
    },

    // Not Found (5000-5999)
    USER_NOT_FOUND: {
        code: 5001,
        message: "User not found",
        severity: "high",
    },
    CREATOR_NOT_FOUND: {
        code: 5002,
        message: "Creator record not found",
        severity: "high",
    },

    // Validation & Logic (6000-6999)
    INVALID_INPUT: {
        code: 6001,
        message: "Invalid input provided",
        severity: "low",
    },
    INSUFFICIENT_BALANCE: {
        code: 6002,
        message: "Insufficient balance",
        severity: "medium",
    },
    INSUFFICIENT_CREDITS: {
        code: 6003,
        message: "Insufficient credits",
        severity: "medium",
    },
} as const;

export const ERROR_CODES = ErrorType;


