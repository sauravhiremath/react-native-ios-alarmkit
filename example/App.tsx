import React, { useState } from 'react'
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Button,
  Alert,
  TextInput,
  TouchableOpacity,
} from 'react-native'
import AlarmKit, {
  useAlarms,
  useAuthorizationState,
  AlarmKitManager,
  AlarmConfigurationFactory,
} from 'react-native-alarmkit'

function App(): React.JSX.Element {
  const authState = useAuthorizationState()
  const alarms = useAlarms()
  const [minutes, setMinutes] = useState('5')
  const [useAdvancedAPI, setUseAdvancedAPI] = useState(false)

  const requestAuth = async () => {
    const granted = await AlarmKit.requestAuthorization()
    if (granted) {
      Alert.alert('Success', 'Authorization granted!')
    } else {
      Alert.alert('Denied', 'Authorization was denied')
    }
  }

  const scheduleSimpleTimer = async () => {
    if (!AlarmKit.isSupported) {
      Alert.alert('Not Supported', 'AlarmKit is only available on iOS 26+')
      return
    }

    if (authState !== 'authorized') {
      Alert.alert('Not Authorized', 'Please authorize the app first')
      return
    }

    try {
      const minutesNum = parseInt(minutes, 10)
      const id = `timer-${Date.now()}`

      await AlarmKit.scheduleTimer(id, {
        duration: minutesNum * 60,
        title: 'Timer Done!',
        snoozeEnabled: true,
        snoozeDuration: 60,
        tintColor: '#FF6B6B',
      })

      Alert.alert('Success', `Timer scheduled for ${minutesNum} minutes`)
    } catch (error) {
      Alert.alert('Error', String(error))
    }
  }

  const scheduleAdvancedAlarm = async () => {
    if (!AlarmKitManager.shared.isSupported) {
      Alert.alert('Not Supported', 'AlarmKit is only available on iOS 26+')
      return
    }

    if (authState !== 'authorized') {
      Alert.alert('Not Authorized', 'Please authorize the app first')
      return
    }

    try {
      const id = `alarm-${Date.now()}`

      const config = AlarmConfigurationFactory.timer({
        duration: 300,
        attributes: {
          presentation: {
            alert: {
              title: 'Advanced Timer!',
              stopButton: {
                text: 'Stop',
                textColor: '#FFFFFF',
                systemImageName: 'stop.circle',
              },
            },
            countdown: {
              title: 'Countdown...',
            },
          },
          tintColor: '#4A90D9',
        },
      })

      await AlarmKitManager.shared.schedule(id, config)
      Alert.alert('Success', 'Advanced alarm scheduled!')
    } catch (error) {
      Alert.alert('Error', String(error))
    }
  }

  const cancelAlarm = async (id: string) => {
    try {
      await AlarmKit.cancel(id)
      Alert.alert('Cancelled', 'Alarm cancelled successfully')
    } catch (error) {
      Alert.alert('Error', String(error))
    }
  }

  const pauseAlarm = async (id: string) => {
    try {
      await AlarmKit.pause(id)
      Alert.alert('Paused', 'Alarm paused')
    } catch (error) {
      Alert.alert('Error', String(error))
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.title}>AlarmKit Example</Text>

          <View style={styles.statusCard}>
            <Text style={styles.label}>Platform Support:</Text>
            <Text style={styles.value}>
              {AlarmKit.isSupported ? 'Supported' : 'Not Supported'}
            </Text>
          </View>

          <View style={styles.statusCard}>
            <Text style={styles.label}>Authorization:</Text>
            <Text style={styles.value}>{authState}</Text>
          </View>

          {AlarmKit.isSupported && authState !== 'authorized' && (
            <Button title="Request Authorization" onPress={requestAuth} />
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleButton, !useAdvancedAPI && styles.toggleButtonActive]}
              onPress={() => setUseAdvancedAPI(false)}
            >
              <Text style={[styles.toggleText, !useAdvancedAPI && styles.toggleTextActive]}>
                Simple API
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, useAdvancedAPI && styles.toggleButtonActive]}
              onPress={() => setUseAdvancedAPI(true)}
            >
              <Text style={[styles.toggleText, useAdvancedAPI && styles.toggleTextActive]}>
                Advanced API
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {AlarmKit.isSupported && authState === 'authorized' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {useAdvancedAPI ? 'Advanced API Demo' : 'Simple API Demo'}
            </Text>

            {!useAdvancedAPI ? (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Minutes"
                  value={minutes}
                  onChangeText={setMinutes}
                  keyboardType="number-pad"
                />
                <Button title="Schedule Simple Timer" onPress={scheduleSimpleTimer} />
              </>
            ) : (
              <Button title="Schedule Advanced Timer" onPress={scheduleAdvancedAlarm} />
            )}
          </View>
        )}

        {alarms.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Alarms ({alarms.length})</Text>
            {alarms.map((alarm) => (
              <View key={alarm.id} style={styles.alarmItem}>
                <View style={styles.alarmInfo}>
                  <Text style={styles.alarmId} numberOfLines={1}>
                    {alarm.id}
                  </Text>
                  <Text style={styles.alarmState}>{alarm.state}</Text>
                </View>
                <View style={styles.alarmActions}>
                  {alarm.state === 'countdown' && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => pauseAlarm(alarm.id)}
                    >
                      <Text style={styles.actionButtonText}>Pause</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonDanger]}
                    onPress={() => cancelAlarm(alarm.id)}
                  >
                    <Text style={styles.actionButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>React Hooks Demo</Text>
          <Text style={styles.infoText}>
            This screen uses useAuthorizationState() and useAlarms() hooks to automatically
            update when alarms change.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  statusCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    color: '#666',
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  toggleButtonActive: {
    backgroundColor: '#4A90D9',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  toggleTextActive: {
    color: '#fff',
  },
  alarmItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginBottom: 8,
  },
  alarmInfo: {
    flex: 1,
    marginRight: 12,
  },
  alarmId: {
    fontSize: 12,
    color: '#333',
    marginBottom: 4,
  },
  alarmState: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90D9',
  },
  alarmActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#4A90D9',
    borderRadius: 6,
  },
  actionButtonDanger: {
    backgroundColor: '#FF6B6B',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
})

export default App
