import { NotificationType } from '@/constants/notification';

type NotificationPayload = {
    type: string;
    notificationId?: string;
    submissionId?: string;
    applicationId?: string;
    bankAccountId?: string;
    bankAccountType?: string;
    endingDigits?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

const getString = (value: unknown) => typeof value === 'string' ? value : undefined;

const normalizePayload = (value: Record<string, unknown>): NotificationPayload | null => {
    const type = getString(value.type);
    if (type) {
        return {
            type,
            notificationId: getString(value.notificationId),
            submissionId: getString(value.submissionId),
            applicationId: getString(value.applicationId),
            bankAccountId: getString(value.bankAccountId),
            bankAccountType: getString(value.bankAccountType),
            endingDigits: getString(value.endingDigits),
        };
    }

    const redirectType = getString(value.redirect_type);
    const redirectId = getString(value.redirect_id);

    switch (redirectType) {
        case 'application':
            return redirectId ? { type: NotificationType.SubmissionApproved, applicationId: redirectId } : null;
        case 'submission':
            return redirectId ? { type: NotificationType.SubmissionRejected, submissionId: redirectId } : null;
        case 'bank-account':
            return { type: NotificationType.BankAccountApproved, bankAccountId: redirectId };
        default:
            return null;
    }
};

export const extractNotificationPayload = (value: unknown): NotificationPayload | null => {
    if (!isRecord(value)) {
        return null;
    }

    const nestedData = isRecord(value.data) ? normalizePayload(value.data) : null;
    if (nestedData) {
        return nestedData;
    }

    const notification = isRecord(value.notification) ? value.notification : null;
    const request = notification && isRecord(notification.request) ? notification.request : null;
    const content = request && isRecord(request.content) ? request.content : null;
    const pushData = content && isRecord(content.data) ? normalizePayload(content.data) : null;
    if (pushData) {
        return pushData;
    }

    return normalizePayload(value);
};

export const navigateFromNotification = (router: { push: (href: any) => void }, value: unknown) => {
    const payload = extractNotificationPayload(value);
    if (!payload) {
        return null;
    }

    switch (payload.type) {
        case NotificationType.SubmissionApproved:
        case NotificationType.PostDescriptionMissing:
            if (payload.applicationId) {
                router.push({
                    pathname: '/application/[id]',
                    params: { id: payload.applicationId },
                });
            }
            return payload;
        case NotificationType.SubmissionRejected:
            if (payload.submissionId) {
                router.push({
                    pathname: '/submission/[id]',
                    params: { id: payload.submissionId },
                });
            }
            return payload;
        case NotificationType.BankAccountApproved:
        case NotificationType.BankAccountRejected:
            router.push('/bank-account');
            return payload;
        default:
            return payload;
    }
};
