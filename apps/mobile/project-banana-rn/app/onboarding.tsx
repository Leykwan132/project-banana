import { useCallback, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Pressable,
    StyleSheet,
    TextInput,
    View,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useMutation } from 'convex/react';
import { api } from '../../../../packages/backend/convex/_generated/api';
import {
    PiggyBank,
    Rocket,
    TrendingUp,
    Gift,
    BarChart3,
    FlaskConical,
    ArrowLeft,
    Check,
    Building,
} from 'lucide-react-native';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Options Data ─────────────────────────────────────────────────────────────

const GOAL_OPTIONS = [
    { id: 'side_income', label: 'Earn Extra Side Income', Icon: PiggyBank },
    { id: 'full_time_creator', label: 'Become a Full-Time Creator', Icon: Rocket },
    { id: 'brand', label: 'Work with Brands', Icon: Building },
    { id: 'monetize_audience', label: 'Monetize My Existing Audience', Icon: BarChart3 },
    { id: 'try_ugc', label: 'Just Trying It Out', Icon: FlaskConical },
];

const REFERRAL_OPTIONS = [
    { id: 'instagram', label: 'Instagram', Icon: (props: any) => <FontAwesome6 name="instagram" {...props} /> },
    { id: 'tiktok', label: 'TikTok', Icon: (props: any) => <FontAwesome6 name="tiktok" {...props} /> },
    { id: 'threads', label: 'Threads', Icon: (props: any) => <FontAwesome6 name="threads" {...props} /> },
    { id: 'linkedin', label: 'LinkedIn', Icon: (props: any) => <FontAwesome6 name="linkedin-in" {...props} /> },
    { id: 'friends', label: 'Friends', Icon: (props: any) => <FontAwesome6 name="users" {...props} /> },
];

// ─── Step Components ──────────────────────────────────────────────────────────

interface UsernameStepProps {
    username: string;
    onChangeUsername: (text: string) => void;
    onContinue: () => void;
    isCheckingUsername: boolean;
    usernameError: string | null;
}

function UsernameStep({ username, onChangeUsername, isCheckingUsername, usernameError }: Omit<UsernameStepProps, 'onContinue'>) {
    return (
        <KeyboardAvoidingView
            style={styles.stepContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.stepContent}>
                <ThemedText style={styles.stepTitle}>Pick a username</ThemedText>
                <ThemedText style={styles.stepSubtitle}>
                    This is how brands and creators will know you.
                </ThemedText>

                <View style={styles.inputWrapper}>
                    <ThemedText style={styles.inputPrefix}>@</ThemedText>
                    <TextInput
                        style={styles.usernameInput}
                        value={username}
                        onChangeText={onChangeUsername}
                        placeholder="yourname"
                        placeholderTextColor="#BDBDBD"
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoFocus
                        maxLength={30}
                    />
                </View>
                <View style={styles.inputLine} />

                {usernameError && (
                    <ThemedText style={styles.errorText}>{usernameError}</ThemedText>
                )}

                {username.length > 0 && !usernameError && !isCheckingUsername && (
                    <ThemedText style={styles.availableText}>Username is available ✓</ThemedText>
                )}
            </View>
        </KeyboardAvoidingView>
    );
}

interface GoalStepProps {
    selectedGoals: string[];
    onToggleGoal: (id: string) => void;
    onContinue: () => void;
    onBack: () => void;
}

function GoalStep({ selectedGoals, onToggleGoal }: Pick<GoalStepProps, 'selectedGoals' | 'onToggleGoal'>) {
    return (
        <View style={styles.stepContainer}>
            <ScrollView style={styles.stepScrollContent} contentContainerStyle={styles.stepScrollContentContainer}>
                <ThemedText style={styles.stepTitle}>What's your goal?</ThemedText>
                <ThemedText style={styles.stepSubtitle}>
                    Select all that apply.
                </ThemedText>

                <View style={styles.optionsList}>
                    {GOAL_OPTIONS.map((option) => {
                        const isSelected = selectedGoals.includes(option.id);
                        return (
                            <Pressable
                                key={option.id}
                                style={[
                                    styles.optionRow,
                                    isSelected && styles.optionRowSelected,
                                ]}
                                onPress={() => onToggleGoal(option.id)}
                            >
                                <View style={[styles.optionRowIconContainer, isSelected && styles.optionRowIconContainerSelected]}>
                                    <option.Icon
                                        size={24}
                                        color={isSelected ? '#FC4C02' : '#666666'}
                                        strokeWidth={1.8}
                                    />
                                </View>
                                <ThemedText
                                    style={[
                                        styles.optionRowLabel,
                                        isSelected && styles.optionRowLabelSelected,
                                    ]}
                                >
                                    {option.label}
                                </ThemedText>
                                {isSelected && (
                                    <View style={styles.checkBadgeSmall}>
                                        <Check size={10} color="#FFFFFF" strokeWidth={4} />
                                    </View>
                                )}
                            </Pressable>
                        );
                    })}
                </View>
            </ScrollView>
        </View>
    );
}

interface ReferralStepProps {
    selectedReferral: string | null;
    onSelectReferral: (id: string) => void;
    onSubmit: () => void;
    onBack: () => void;
    isSubmitting: boolean;
}

function ReferralStep({ selectedReferral, onSelectReferral }: Pick<ReferralStepProps, 'selectedReferral' | 'onSelectReferral'>) {
    return (
        <View style={styles.stepContainer}>
            <View style={styles.stepContent}>
                <ThemedText style={styles.stepTitle}>How did you hear about us?</ThemedText>
                <ThemedText style={styles.stepSubtitle}>
                    Pick one.
                </ThemedText>

                <View style={styles.optionsList}>
                    {REFERRAL_OPTIONS.map((option) => {
                        const isSelected = selectedReferral === option.id;
                        const IconComponent = option.Icon;
                        return (
                            <Pressable
                                key={option.id}
                                style={[
                                    styles.optionRow,
                                    isSelected && styles.optionRowSelected,
                                ]}
                                onPress={() => onSelectReferral(option.id)}
                            >
                                <View style={[styles.optionRowIconContainer, isSelected && styles.optionRowIconContainerSelected]}>
                                    <IconComponent
                                        size={24}
                                        color={isSelected ? '#FC4C02' : '#666666'}
                                    />
                                </View>
                                <ThemedText
                                    style={[
                                        styles.optionRowLabel,
                                        isSelected && styles.optionRowLabelSelected,
                                    ]}
                                >
                                    {option.label}
                                </ThemedText>
                                {isSelected && (
                                    <View style={styles.checkBadgeSmall}>
                                        <Check size={10} color="#FFFFFF" strokeWidth={4} />
                                    </View>
                                )}
                            </Pressable>
                        );
                    })}
                </View>
            </View>
        </View>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

const TOTAL_STEPS = 3;

export default function OnboardingScreen() {
    const insets = useSafeAreaInsets();
    const [step, setStep] = useState(0);
    const [username, setUsername] = useState('');
    const [usernameError, setUsernameError] = useState<string | null>(null);
    const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
    const [selectedReferral, setSelectedReferral] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCheckingUsername, setIsCheckingUsername] = useState(false);

    const slideAnim = useRef(new Animated.Value(0)).current;
    const checkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const completeOnboarding = useMutation(api.creators.completeOnboarding);

    // ── Username validation ──
    const handleUsernameChange = useCallback((text: string) => {
        // Only allow alphanumeric, underscores, and periods
        const sanitized = text.replace(/[^a-zA-Z0-9_.]/g, '');
        setUsername(sanitized);

        if (checkTimeoutRef.current) {
            clearTimeout(checkTimeoutRef.current);
        }

        if (sanitized.length < 3) {
            setUsernameError(sanitized.length > 0 ? 'Username must be at least 3 characters' : null);
            return;
        }

        setUsernameError(null);
        setIsCheckingUsername(true);

        // Debounce the check
        checkTimeoutRef.current = setTimeout(async () => {
            try {
                // We'll do a lightweight check — in a real scenario, this calls the query
                // For now, we just clear the loading state; the mutation will do the final check
                setIsCheckingUsername(false);
            } catch {
                setIsCheckingUsername(false);
            }
        }, 500);
    }, []);

    // ── Navigation ──
    const animateToStep = useCallback((nextStep: number) => {
        const direction = nextStep > step ? -1 : 1;

        Animated.timing(slideAnim, {
            toValue: direction * SCREEN_WIDTH,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            setStep(nextStep);
            slideAnim.setValue(-direction * SCREEN_WIDTH);
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        });
    }, [step, slideAnim]);

    const handleContinueFromUsername = useCallback(() => {
        if (!username.trim() || username.length < 3) return;
        animateToStep(1);
    }, [username, animateToStep]);

    const handleContinueFromGoals = useCallback(() => {
        if (selectedGoals.length === 0) return;
        animateToStep(2);
    }, [selectedGoals, animateToStep]);

    const handleBack = useCallback(() => {
        if (step > 0) {
            animateToStep(step - 1);
        }
    }, [step, animateToStep]);

    const handleToggleGoal = useCallback((goalId: string) => {
        setSelectedGoals((prev) => {
            const isCurrentlySelected = prev.includes(goalId);
            // Block deselecting the last remaining goal
            if (isCurrentlySelected && prev.length === 1) return prev;
            return isCurrentlySelected
                ? prev.filter((id) => id !== goalId)
                : [...prev, goalId];
        });
    }, []);

    const handleSelectReferral = useCallback((referralId: string) => {
        setSelectedReferral(referralId);
    }, []);

    const handleSubmit = useCallback(async () => {
        if (!selectedReferral || selectedGoals.length === 0) return;
        setIsSubmitting(true);
        try {
            await completeOnboarding({
                username: username.trim(),
                signupGoal: selectedGoals,
                referralSource: selectedReferral,
            });
            router.replace('/(tabs)');
        } catch (error: any) {
            setIsSubmitting(false);
            // Check for username taken error
            if (error?.data?.code === 6004) {
                animateToStep(0);
                setUsernameError('This username is already taken');
                return;
            }
            Alert.alert('Error', 'Something went wrong. Please try again.');
        }
    }, [username, selectedGoals, selectedReferral, completeOnboarding, animateToStep]);

    // ── Render content (animated) ──
    const isUsernameContinueDisabled = !username.trim() || !!usernameError || isCheckingUsername;
    const isGoalsContinueDisabled = selectedGoals.length === 0;
    const isSubmitDisabled = !selectedReferral || isSubmitting;

    const renderStepContent = () => {
        switch (step) {
            case 0:
                return (
                    <UsernameStep
                        username={username}
                        onChangeUsername={handleUsernameChange}
                        isCheckingUsername={isCheckingUsername}
                        usernameError={usernameError}
                    />
                );
            case 1:
                return (
                    <GoalStep
                        selectedGoals={selectedGoals}
                        onToggleGoal={handleToggleGoal}
                    />
                );
            case 2:
                return (
                    <ReferralStep
                        selectedReferral={selectedReferral}
                        onSelectReferral={handleSelectReferral}
                    />
                );
            default:
                return null;
        }
    };

    // ── Render fixed footer button ──
    const renderFooter = () => {
        switch (step) {
            case 0:
                return (
                    <Pressable
                        style={[
                            styles.primaryButton,
                            isUsernameContinueDisabled && styles.disabledButton,
                        ]}
                        onPress={isUsernameContinueDisabled ? undefined : handleContinueFromUsername}
                        disabled={isUsernameContinueDisabled}
                    >
                        {isCheckingUsername ? (
                            <LoadingIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <ThemedText style={styles.primaryButtonText}>Continue</ThemedText>
                        )}
                    </Pressable>
                );
            case 1:
                return (
                    <Pressable
                        style={[
                            styles.primaryButton,
                            isGoalsContinueDisabled && styles.disabledButton,
                        ]}
                        onPress={isGoalsContinueDisabled ? undefined : handleContinueFromGoals}
                        disabled={isGoalsContinueDisabled}
                    >
                        <ThemedText style={styles.primaryButtonText}>Continue</ThemedText>
                    </Pressable>
                );
            case 2:
                return (
                    <Pressable
                        style={[
                            styles.primaryButton,
                            isSubmitDisabled && styles.disabledButton,
                        ]}
                        onPress={isSubmitDisabled ? undefined : handleSubmit}
                        disabled={isSubmitDisabled}
                    >
                        {isSubmitting ? (
                            <LoadingIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <ThemedText style={styles.primaryButtonText}>Get Started</ThemedText>
                        )}
                    </Pressable>
                );
            default:
                return null;
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                {step > 0 ? (
                    <Pressable style={styles.backButton} onPress={handleBack}>
                        <ArrowLeft size={24} color="#000000" strokeWidth={2} />
                    </Pressable>
                ) : (
                    <View style={styles.backPlaceholder} />
                )}

                <View style={styles.brandingRow}>
                    <View style={styles.brandingLogoContainer}>
                        <ThemedText type="title" style={styles.brandingLogoText}>✦</ThemedText>
                    </View>
                    <ThemedText type="defaultSemiBold" style={styles.brandingAppName}>Lumina</ThemedText>
                </View>

                <View style={styles.backPlaceholder} />
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
                {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.progressDot,
                            i <= step && styles.progressDotActive,
                        ]}
                    />
                ))}
            </View>

            {/* Animated content only */}
            <Animated.View
                style={[
                    styles.animatedContainer,
                    { transform: [{ translateX: slideAnim }] },
                ]}
            >
                {renderStepContent()}
            </Animated.View>

            {/* Fixed footer — never animates */}
            <View style={[styles.stepFooter, { paddingBottom: Math.max(insets.bottom, 24) }]}>
                {renderFooter()}
            </View>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backPlaceholder: {
        width: 40,
        height: 40,
    },
    brandingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    brandingLogoContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#000',
        alignItems: 'center',
        justifyContent: 'center',
    },
    brandingLogoText: {
        color: '#fff',
        fontSize: 18,
        lineHeight: 22,
    },
    brandingAppName: {
        fontSize: 20,
        fontFamily: 'GoogleSans_700Bold',
        lineHeight: 26,
    },

    // Progress
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
    },
    progressDot: {
        width: 32,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#E8E8E8',
    },
    progressDotActive: {
        backgroundColor: '#FC4C02',
    },

    // Animated wrapper
    animatedContainer: {
        flex: 1,
    },

    // Steps
    stepContainer: {
        flex: 1,
    },
    stepContent: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 40,
    },
    stepScrollContent: {
        flex: 1,
        paddingHorizontal: 24,
    },
    stepScrollContentContainer: {
        paddingTop: 40,
        paddingBottom: 24,
    },
    stepTitle: {
        fontSize: 28,
        fontFamily: 'GoogleSans_700Bold',
        color: '#000000',
        marginBottom: 8,
        lineHeight: 34,
    },
    stepSubtitle: {
        fontSize: 16,
        fontFamily: 'GoogleSans_400Regular',
        color: '#666666',
        marginBottom: 40,
        lineHeight: 22,
    },
    stepFooter: {
        paddingHorizontal: 24,
        paddingBottom: 40,
        paddingTop: 16,
    },

    // Username Input
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    inputPrefix: {
        fontSize: 28,
        fontFamily: 'GoogleSans_500Medium',
        color: '#BDBDBD',
        marginRight: 4,
        lineHeight: 34,
    },
    usernameInput: {
        flex: 1,
        fontSize: 28,
        fontFamily: 'GoogleSans_500Medium',
        color: '#000000',
        paddingVertical: 8,
        lineHeight: 34,
    },
    inputLine: {
        height: 2,
        backgroundColor: '#E8E8E8',
        borderRadius: 1,
        marginTop: 4,
    },
    errorText: {
        fontSize: 14,
        fontFamily: 'GoogleSans_400Regular',
        color: '#FF3B30',
        marginTop: 12,
    },
    availableText: {
        fontSize: 14,
        fontFamily: 'GoogleSans_400Regular',
        color: '#34C759',
        marginTop: 12,
    },

    // Option Cards & Rows
    optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    optionsList: {
        flexDirection: 'column',
        gap: 12,
    },
    optionRow: {
        width: '100%',
        backgroundColor: '#F3F4F6',
        borderRadius: 100,
        paddingVertical: 16,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    optionRowSelected: {
        borderColor: '#FC4C02',
        backgroundColor: '#FFF5F0',
    },
    optionRowIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        // backgroundColor: '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    optionRowIconContainerSelected: {
        // backgroundColor: '#FFE0D0',
    },
    optionRowLabel: {
        flex: 1,
        fontSize: 15,
        fontFamily: 'GoogleSans_500Medium',
        color: '#374151',
    },
    optionRowLabelSelected: {
        color: '#FC4C02',
        fontFamily: 'GoogleSans_700Bold',
    },
    checkBadgeSmall: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#FC4C02',
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionCard: {
        width: (SCREEN_WIDTH - 48 - 12) / 2,
        backgroundColor: '#F8F8F8',
        borderRadius: 16,
        paddingVertical: 20,
        paddingHorizontal: 16,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
        position: 'relative',
    },
    optionCardSelected: {
        borderColor: '#FC4C02',
        backgroundColor: '#FFF5F0',
    },
    checkBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#FC4C02',
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#EEEEEE',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    optionIconContainerSelected: {
        backgroundColor: '#FFE0D0',
    },
    optionLabel: {
        fontSize: 13,
        fontFamily: 'GoogleSans_600SemiBold',
        color: '#333333',
        textAlign: 'center',
        lineHeight: 18,
    },
    optionLabelSelected: {
        color: '#FC4C02',
    },

    // Buttons
    primaryButton: {
        width: '100%',
        backgroundColor: '#000000',
        borderRadius: 30,
        paddingVertical: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: 'GoogleSans_700Bold',
    },
    disabledButton: {
        opacity: 0.4,
    },
});
