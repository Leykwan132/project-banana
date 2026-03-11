import { useState, useCallback } from 'react';
import { StyleSheet, View, ScrollView, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Header } from '@/components/Header';
import { BannerType } from '@/components/Banner';
import { ApplicationList } from '@/components/ApplicationList';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { BannerCarousel } from '@/components/BannerCarousel';

export default function PostsScreen() {
    const colorScheme = useColorScheme();
    const insets = useSafeAreaInsets();
    const [refreshing, setRefreshing] = useState(false);
    const isDark = colorScheme === 'dark';
    const screenBackgroundColor = isDark ? Colors[colorScheme ?? 'light'].screenBackground : '#F4F3EE';

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        // Convex queries are reactive, so incrementing the trigger will cause a refetch
        // We wait a bit to show the refresh animation
        setTimeout(() => {
            setRefreshing(false);
        }, 1000);
    }, []);

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: screenBackgroundColor,
                    paddingTop: insets.top,
                },
            ]}
        >
            <Header title="Posts" />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                <BannerCarousel types={[BannerType.NEW_ACCOUNT, BannerType.CREATOR_CAMPAIGN]} />
                <ApplicationList />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 24,
    },
    bannerContainer: {
        // Banner has its own padding handling
    },
});
