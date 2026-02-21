import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { ConvexError } from 'convex/values';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("GlobalErrorBoundary caught an error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            const error = this.state.error;

            // Check if it's a ConvexError with generic data or specific structure
            // The user wants to check for code: 4001
            const isConvexError = error instanceof ConvexError || (error as any).data !== undefined;

            if (isConvexError) {
                const data = (error as any).data;
                if (data && (data.code === 4001 || data.code === "NOT_AUTHENTICATED")) {
                    return <Redirect href="/welcome" />;
                }
            }

            return (
                <View style={styles.container}>
                    <Text style={styles.text}>Something went wrong.</Text>
                    <Text style={styles.errorText}>{error?.message}</Text>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    text: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    errorText: {
        color: 'red',
    },
});
