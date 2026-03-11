import { useState, useCallback } from 'react';
import { ScrollView, StyleSheet, View, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Header } from '@/components/Header';
import { BannerCarousel } from '@/components/BannerCarousel';
import { BannerType } from '@/components/Banner';
import { CampaignList } from '@/components/campaign-list';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const isDark = colorScheme === 'dark';
  const screenBackgroundColor = isDark ? Colors[colorScheme ?? 'light'].screenBackground : '#F4F3EE';

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
          backgroundColor: screenBackgroundColor,
          paddingTop: insets.top,
        },
      ]}
    >
      <Header />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <BannerCarousel types={[BannerType.HOW_IT_WORKS, BannerType.CREATOR_CAMPAIGN]} />
        <CampaignList />
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
});
