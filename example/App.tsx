import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AlarmKit, {
  useAlarms,
  useAuthorizationState,
} from 'react-native-ios-alarmkit';
import type { AlarmState } from 'react-native-ios-alarmkit';

const COLORS = {
  bg: '#F5F0E8',
  text: '#1A1A1A',
  textMuted: '#666666',
  textOnDark: '#FFFFFF',
  cardTimer: '#C8D8E8',
  cardAlarm: '#D4E8D0',
  cardDaily: '#E8D8A0',
  cardPerm: '#1A1A1A',
  cardAlarms: '#F7F5F1',
  cardTips: '#F0EBE0',
  cardSuccess: '#2D7A50',
  badgeAuth: '#2D6A4F',
  badgeNotDet: '#8B6914',
  badgeDenied: '#8B2020',
  stateScheduled: '#6594B1',
  stateCountdown: '#2D6A4F',
  statePaused: '#8B6914',
  stateAlerting: '#C0392B',
  cancelBtn: '#C44A3A',
  pauseBtn: '#8A7650',
  resumeBtn: '#5FA777',
  divider: '#E0D8CC',
};

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48 - 12) / 2;

const stateColor = (s: AlarmState): string => {
  if (s === 'scheduled') return COLORS.stateScheduled;
  if (s === 'countdown') return COLORS.stateCountdown;
  if (s === 'paused') return COLORS.statePaused;
  return COLORS.stateAlerting;
};

const platformLabel =
  Platform.OS === 'ios' ? `iOS ${Platform.Version}` : 'Android';

type AuthCardProps = {
  isLoading: boolean;
  isScheduling: boolean;
  authState: string | undefined;
  onPress: () => void;
};

const AuthCard = React.memo(
  ({ isLoading, isScheduling, authState, onPress }: AuthCardProps) => (
    <Pressable
      style={[
        styles.actionCard,
        styles.actionCardDark,
        { width: CARD_WIDTH },
        (isLoading || isScheduling) && styles.cardDisabled,
      ]}
      onPress={onPress}
      disabled={
        isLoading ||
        isScheduling ||
        (authState === 'authorized' && !AlarmKit.isSupported)
      }>
      {({ pressed }) => (
        <>
          {pressed && <View style={styles.pressOverlayLight} />}
          {isScheduling ? (
            <ActivityIndicator color={COLORS.textOnDark} />
          ) : (
            <>
              <Text style={styles.actionCardDarkLabel}>
                {authState === 'denied'
                  ? 'Open\nSettings'
                  : 'Request\nPermission'}
              </Text>
              <Text style={styles.actionCardDarkSub}>
                {authState === 'authorized'
                  ? 'Already granted'
                  : authState === 'denied'
                    ? 'Tap to open settings'
                    : 'Tap to authorize'}
              </Text>
            </>
          )}
        </>
      )}
    </Pressable>
  ),
);

type ScheduleCardProps = {
  color: string;
  isDisabled: boolean;
  isScheduling: boolean;
  isSuccess: boolean;
  label: string;
  sub: string;
  successSub: string;
  onPress: () => void;
};

const ScheduleCard = React.memo(
  ({
    color,
    isDisabled,
    isScheduling,
    isSuccess,
    label,
    sub,
    successSub,
    onPress,
  }: ScheduleCardProps) => (
    <Pressable
      style={[
        styles.actionCard,
        { backgroundColor: isSuccess ? COLORS.cardSuccess : color, width: CARD_WIDTH },
        isDisabled && styles.cardDisabled,
      ]}
      onPress={onPress}
      disabled={isDisabled}>
      {({ pressed }) => (
        <>
          {pressed && <View style={styles.pressOverlayDark} />}
          {isScheduling ? (
            <ActivityIndicator color={isSuccess ? COLORS.textOnDark : COLORS.text} />
          ) : isSuccess ? (
            <>
              <Text style={styles.actionCardSuccessLabel}>Scheduled!</Text>
              <Text style={styles.actionCardSuccessSub}>{successSub}</Text>
            </>
          ) : (
            <>
              <Text style={styles.actionCardLabel}>{label}</Text>
              <Text style={styles.actionCardSub}>{sub}</Text>
            </>
          )}
        </>
      )}
    </Pressable>
  ),
);

export default function App(): React.JSX.Element {
  const {
    state: authState,
    isLoading: authIsLoading,
    error: authError,
  } = useAuthorizationState();
  const { alarms, error: alarmsError } = useAlarms();
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSuccess = (id: string): void => {
    if (successTimer.current) clearTimeout(successTimer.current);
    setSuccessId(id);
    successTimer.current = setTimeout(() => setSuccessId(null), 1500);
  };

  React.useEffect(() => {
    if (authError) Alert.alert('Authorization Error', authError.message);
  }, [authError]);

  React.useEffect(() => {
    if (alarmsError) Alert.alert('Alarms Error', alarmsError.message);
  }, [alarmsError]);

  React.useEffect(() => {
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, []);

  const checkSupport = (): boolean => {
    if (!AlarmKit.isSupported) {
      Alert.alert('Not Supported', 'AlarmKit requires iOS 26 or later.');
      return false;
    }
    return true;
  };

  const handleRequestAuth = useCallback(async (): Promise<void> => {
    if (!checkSupport()) return;
    if (authState === 'denied') {
      await Linking.openSettings();
      return;
    }
    setSchedulingId('auth');
    try {
      await AlarmKit.requestAuthorization();
    } catch (e) {
      Alert.alert('Error', String(e));
    } finally {
      setSchedulingId(null);
    }
  }, [authState]);

  const handleScheduleTimer = useCallback(async (): Promise<void> => {
    if (!checkSupport()) return;
    setSchedulingId('timer');
    try {
      await AlarmKit.scheduleTimer('00000000-0000-0000-0000-000000000001', {
        duration: 5,
        title: 'Timer Done!',
        snoozeEnabled: false,
        tintColor: '#5B7FA6',
      });
      showSuccess('timer');
    } catch (e) {
      Alert.alert('Error', String(e));
    } finally {
      setSchedulingId(null);
    }
  }, []);

  const handleScheduleAlarm = useCallback(async (): Promise<void> => {
    if (!checkSupport()) return;
    setSchedulingId('alarm');
    try {
      await AlarmKit.scheduleTimer('00000000-0000-0000-0000-000000000002', {
        duration: 10,
        title: 'Alarm!',
        snoozeEnabled: false,
        tintColor: '#2D6A4F',
      });
      showSuccess('alarm');
    } catch (e) {
      Alert.alert('Error', String(e));
    } finally {
      setSchedulingId(null);
    }
  }, []);

  const handleScheduleDaily = useCallback(async (): Promise<void> => {
    if (!checkSupport()) return;
    setSchedulingId('daily');
    try {
      await AlarmKit.scheduleAlarm('00000000-0000-0000-0000-000000000003', {
        hour: 7,
        minute: 0,
        weekdays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        title: 'Good Morning',
        snoozeEnabled: true,
        snoozeDuration: 540,
        tintColor: '#8B6914',
      });
      showSuccess('daily');
    } catch (e) {
      Alert.alert('Error', String(e));
    } finally {
      setSchedulingId(null);
    }
  }, []);

  const handleCancel = useCallback(async (id: string): Promise<void> => {
    setLoadingId(id);
    try {
      await AlarmKit.cancel(id);
    } catch (e) {
      Alert.alert('Error', String(e));
    } finally {
      setLoadingId(null);
    }
  }, []);

  const handlePause = useCallback(async (id: string): Promise<void> => {
    setLoadingId(id);
    try {
      await AlarmKit.pause(id);
    } catch (e) {
      Alert.alert('Error', String(e));
    } finally {
      setLoadingId(null);
    }
  }, []);

  const handleResume = useCallback(async (id: string): Promise<void> => {
    setLoadingId(id);
    try {
      await AlarmKit.resume(id);
    } catch (e) {
      Alert.alert('Error', String(e));
    } finally {
      setLoadingId(null);
    }
  }, []);

  const authBadgeColor =
    !AlarmKit.isSupported
      ? COLORS.textMuted
      : authState === 'authorized'
        ? COLORS.badgeAuth
        : authState === 'denied'
          ? COLORS.badgeDenied
          : COLORS.badgeNotDet;

  const authStateLabel = !AlarmKit.isSupported
    ? 'Unsupported'
    : authIsLoading
      ? '...'
      : authState === 'authorized'
        ? 'Granted'
        : authState === 'denied'
          ? 'Declined'
          : 'Unknown';

  const scheduleDisabled = authState !== 'authorized' || !AlarmKit.isSupported;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>AlarmKit Demo</Text>
          <Text
            style={styles.subtitle}
            onPress={() =>
              Linking.openURL(
                'https://github.com/sauravhiremath/react-native-ios-alarmkit/',
              )
            }>
            react-native-ios-alarmkit
          </Text>
        </View>

        {/* Info rows */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Platform</Text>
            <Text style={styles.infoValue}>{platformLabel}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowLast]}>
            <Text style={styles.infoLabel}>Authorization</Text>
            <View style={[styles.authBadge, { backgroundColor: authBadgeColor }]}>
              <Text style={styles.authBadgeText}>{authStateLabel}</Text>
            </View>
          </View>
        </View>

        {/* Action cards grid */}
        <View style={styles.actionGrid}>
          <AuthCard
            isLoading={authIsLoading}
            isScheduling={schedulingId === 'auth'}
            authState={authState}
            onPress={handleRequestAuth}
          />
          <ScheduleCard
            color={COLORS.cardTimer}
            isDisabled={scheduleDisabled || schedulingId === 'timer'}
            isScheduling={schedulingId === 'timer'}
            isSuccess={successId === 'timer'}
            label="5s Timer"
            sub="Countdown · no snooze"
            successSub="Timer Done! · 5s"
            onPress={handleScheduleTimer}
          />
          <ScheduleCard
            color={COLORS.cardAlarm}
            isDisabled={scheduleDisabled || schedulingId === 'alarm'}
            isScheduling={schedulingId === 'alarm'}
            isSuccess={successId === 'alarm'}
            label="10s Alarm"
            sub="Fixed date · no snooze"
            successSub="Alarm! · 10s"
            onPress={handleScheduleAlarm}
          />
          <ScheduleCard
            color={COLORS.cardDaily}
            isDisabled={scheduleDisabled || schedulingId === 'daily'}
            isScheduling={schedulingId === 'daily'}
            isSuccess={successId === 'daily'}
            label="Daily 7:00 AM"
            sub="Mon–Fri · recurring"
            successSub="Good Morning · Mon–Fri"
            onPress={handleScheduleDaily}
          />
        </View>

        {/* Active alarms */}
        <View style={styles.alarmsCard}>
          <View style={styles.alarmsHeader}>
            <Text style={styles.alarmsTitle}>Active Alarms</Text>
            <View style={styles.alarmsCountBadge}>
              <Text style={styles.alarmsCountText}>{alarms.length}</Text>
            </View>
          </View>
          {alarms.length === 0 && (
            <View style={styles.alarmsEmptyContainer}>
              <Text style={styles.alarmsEmpty}>Tap above to schedule alarms</Text>
            </View>
          )}
          {alarms.map((alarm, index) => (
              <View
                key={alarm.id}
                style={[styles.alarmRow, index === 0 && styles.alarmRowFirst]}>
                <View style={styles.alarmInfo}>
                  <View
                    style={[
                      styles.alarmStateBadge,
                      { backgroundColor: stateColor(alarm.state) },
                    ]}>
                    <Text style={styles.alarmStateBadgeText}>
                      {alarm.state}
                    </Text>
                  </View>
                  <Text style={styles.alarmIdText}>
                    {alarm.id.length > 10
                      ? alarm.id.slice(0, 8) + '…'
                      : alarm.id}
                  </Text>
                </View>
                <View style={styles.alarmActions}>
                  {alarm.state === 'countdown' && (
                    <TouchableOpacity
                      style={[
                        styles.alarmActionBtn,
                        { backgroundColor: COLORS.pauseBtn },
                      ]}
                      onPress={() => handlePause(alarm.id)}
                      disabled={loadingId === alarm.id}
                      activeOpacity={0.45}>
                      <Text style={styles.alarmActionBtnText}>Pause</Text>
                    </TouchableOpacity>
                  )}
                  {alarm.state === 'paused' && (
                    <TouchableOpacity
                      style={[
                        styles.alarmActionBtn,
                        { backgroundColor: COLORS.resumeBtn },
                      ]}
                      onPress={() => handleResume(alarm.id)}
                      disabled={loadingId === alarm.id}
                      activeOpacity={0.45}>
                      <Text style={styles.alarmActionBtnText}>Resume</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[
                      styles.alarmActionBtn,
                      { backgroundColor: COLORS.cancelBtn },
                    ]}
                    onPress={() => handleCancel(alarm.id)}
                    disabled={loadingId === alarm.id}
                    activeOpacity={0.45}>
                    {loadingId === alarm.id ? (
                      <ActivityIndicator
                        color={COLORS.textOnDark}
                        size="small"
                      />
                    ) : (
                      <Text style={styles.alarmActionBtnText}>Cancel</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
          ))}
        </View>

        {/* Features */}
        <View style={styles.featuresCard}>
          <Text style={styles.featuresLabel}>Features</Text>
          <Text style={styles.featureText}>
            - AlarmKit requires iOS 26 or later
          </Text>
          <Text style={styles.featureText}>
            - Alarms persist across app restarts via the OS
          </Text>
          <Text style={styles.featureText}>
            - State updates are delivered via hooks in real time
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 48,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontFamily: 'OggTRIAL-Bold',
    fontSize: 42,
    color: COLORS.text,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textMuted,
    marginTop: 4,
    textDecorationLine: 'underline',
  },
  infoCard: {
    backgroundColor: COLORS.cardAlarms,
    borderRadius: 20,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  authBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  authBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textOnDark,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  actionCard: {
    borderRadius: 24,
    padding: 20,
    minHeight: 110,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  actionCardDark: {
    backgroundColor: COLORS.cardPerm,
  },
  pressOverlayDark: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.15)',
    pointerEvents: 'none',
  },
  pressOverlayLight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.12)',
    pointerEvents: 'none',
  },
  actionCardLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  actionCardSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 5,
  },
  actionCardDarkLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textOnDark,
  },
  actionCardDarkSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 5,
  },
  actionCardSuccessLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textOnDark,
  },
  actionCardSuccessSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 5,
  },
  cardDisabled: {
    opacity: 0.45,
  },
  alarmsCard: {
    backgroundColor: COLORS.cardAlarms,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 12,
    minHeight: 160,
    flexDirection: 'column',
  },
  alarmsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  alarmsTitle: {
    fontFamily: 'OggTRIAL-Bold',
    fontSize: 22,
    color: COLORS.text,
    flex: 1,
  },
  alarmsCountBadge: {
    backgroundColor: COLORS.text,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  alarmsCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textOnDark,
  },
  alarmsEmptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  alarmsEmpty: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  alarmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    marginTop: 4,
  },
  alarmRowFirst: {
    borderTopWidth: 0,
    marginTop: 0,
  },
  alarmInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alarmIdText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: 'Menlo',
  },
  alarmStateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  alarmStateBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textOnDark,
  },
  alarmActions: {
    flexDirection: 'row',
    gap: 6,
  },
  alarmActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 56,
    alignItems: 'center',
  },
  alarmActionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textOnDark,
  },
  featuresCard: {
    backgroundColor: COLORS.cardTips,
    borderRadius: 20,
    padding: 20,
    gap: 6,
  },
  featuresLabel: {
    fontFamily: 'OggTRIAL-Bold',
    fontSize: 22,
    color: COLORS.text,
    marginBottom: 2,
  },
  featureText: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
});
