import { useState, useCallback } from 'react';
import { StyleSheet, View, ScrollView, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Header } from '@/components/Header';
import { Banner } from '@/components/Banner';
import { ApplicationList } from '@/components/ApplicationList';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function PostsScreen() {
    const colorScheme = useColorScheme();
    const insets = useSafeAreaInsets();
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        setTimeout(() => {
            setRefreshing(false);
        }, 2000);
    }, []);

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: Colors[colorScheme ?? 'light'].screenBackground,
                    paddingTop: insets.top,
                },
            ]}
        >
            <Header title="Posts" />
            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                <View style={styles.bannerContainer}>
                    <Banner type="referral" />
                </View>
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
    bannerContainer: {
        // Banner has its own padding handling
    },
});
