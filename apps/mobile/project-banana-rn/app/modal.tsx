import { StyleSheet, View, Pressable } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { NotificationModalCopy, NotificationType } from '@/constants/notification';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function ModalScreen() {
  const router = useRouter();
  const { type, endingDigits } = useLocalSearchParams<{ type?: string; endingDigits?: string }>();

  const isRejected = type === NotificationType.BankAccountRejected;
  const title = isRejected
    ? NotificationModalCopy.bankAccountRejected.title
    : NotificationModalCopy.bankAccountApproved.title;
  const description = isRejected
    ? NotificationModalCopy.bankAccountRejected.description(endingDigits)
    : NotificationModalCopy.bankAccountApproved.description(endingDigits);

  return (
    <ThemedView style={styles.screen}>
      <Stack.Screen options={{ presentation: 'modal', headerShown: false }} />
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>{title}</ThemedText>
        <ThemedText style={styles.description}>{description}</ThemedText>
        <View style={styles.actions}>
          {isRejected ? (
            <Pressable style={[styles.button, styles.primaryButton]} onPress={() => router.replace('/bank-account/add' as any)}>
              <ThemedText style={styles.primaryButtonText}>Add bank account</ThemedText>
            </Pressable>
          ) : null}
          <Pressable
            style={[styles.button, isRejected ? styles.secondaryButton : styles.primaryButton]}
            onPress={() => router.back()}
          >
            <ThemedText style={isRejected ? styles.secondaryButtonText : styles.primaryButtonText}>
              Dismiss
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  container: {
    borderRadius: 24,
    padding: 24,
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  title: {
    fontSize: 24,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#4B5563',
  },
  actions: {
    marginTop: 12,
    gap: 12,
  },
  button: {
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 16,
  },
  primaryButton: {
    backgroundColor: '#111827',
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'GoogleSans_600SemiBold',
  },
  secondaryButtonText: {
    color: '#111827',
    fontSize: 16,
    fontFamily: 'GoogleSans_600SemiBold',
  },
});
