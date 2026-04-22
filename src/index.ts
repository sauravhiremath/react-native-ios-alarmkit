import { AlarmKitManager } from './AlarmKitManager'
import type {
  Alarm,
  AuthorizationState,
  Subscription,
  SimpleTimerConfig,
  SimpleAlarmConfig,
  AlarmButton,
} from './types'

const createDefaultButton = (
  text: string,
  color: string,
  icon: string
): AlarmButton => ({
  text,
  textColor: color,
  systemImageName: icon,
})

export const AlarmKit = {
  get isSupported(): boolean {
    return AlarmKitManager.shared.isSupported
  },

  async getAuthorizationState(): Promise<AuthorizationState> {
    return AlarmKitManager.shared.getAuthorizationState()
  },

  async requestAuthorization(): Promise<boolean> {
    return AlarmKitManager.shared.requestAuthorization()
  },

  async scheduleTimer(
    id: string,
    config: SimpleTimerConfig
  ): Promise<Alarm | null> {
    const stopButton = createDefaultButton('Stop', '#FFFFFF', 'stop.circle')
    const secondaryButton = config.snoozeEnabled
      ? createDefaultButton('Snooze', '#FFFFFF', 'zzz')
      : undefined

    return AlarmKitManager.shared.scheduleOrReschedule(id, {
      countdownDuration: {
        preAlert: config.duration,
        postAlert: config.snoozeDuration || 300,
      },
      presentation: {
        alert: {
          title: config.title,
          stopButton,
          secondaryButton,
          secondaryButtonBehavior: config.snoozeEnabled
            ? 'countdown'
            : undefined,
        },
        countdown: {
          title: 'Time Remaining',
        },
      },
      tintColor: config.tintColor,
      soundName: config.sound,
    })
  },

  async scheduleAlarm(
    id: string,
    config: SimpleAlarmConfig
  ): Promise<Alarm | null> {
    const stopButton = createDefaultButton('Stop', '#FFFFFF', 'stop.circle')
    const secondaryButton = config.snoozeEnabled
      ? createDefaultButton('Snooze', '#FFFFFF', 'zzz')
      : undefined

    return AlarmKitManager.shared.scheduleOrReschedule(id, {
      countdownDuration: {
        preAlert: 0,
        postAlert: config.snoozeEnabled ? config.snoozeDuration || 0 : 0,
      },
      schedule: {
        type: 'relative',
        hour: config.hour,
        minute: config.minute,
        weekdays: config.weekdays,
      },
      presentation: {
        alert: {
          title: config.title,
          stopButton,
          secondaryButton,
          secondaryButtonBehavior: config.snoozeEnabled
            ? 'countdown'
            : undefined,
        },
      },
      tintColor: config.tintColor,
      soundName: config.sound,
    })
  },

  async cancel(id: string): Promise<boolean> {
    return AlarmKitManager.shared.cancel(id)
  },

  async stop(id: string): Promise<void> {
    return AlarmKitManager.shared.stop(id)
  },

  async pause(id: string): Promise<void> {
    return AlarmKitManager.shared.pause(id)
  },

  async resume(id: string): Promise<void> {
    return AlarmKitManager.shared.resume(id)
  },

  async countdown(id: string): Promise<void> {
    return AlarmKitManager.shared.countdown(id)
  },

  async getAlarms(): Promise<Alarm[]> {
    return AlarmKitManager.shared.getAlarms()
  },

  addAlarmsListener(callback: (alarms: Alarm[]) => void): Subscription {
    return AlarmKitManager.shared.addAlarmUpdatesListener(callback)
  },

  addAuthorizationListener(
    callback: (state: AuthorizationState) => void
  ): Subscription {
    return AlarmKitManager.shared.addAuthorizationUpdatesListener(callback)
  },
}

export { AlarmKitManager } from './AlarmKitManager'
export { AlarmConfigurationFactory } from './AlarmConfiguration'
export {
  useAlarms,
  useAuthorizationState,
  type UseAlarmsResult,
  type UseAuthorizationResult,
} from './hooks'
export * from './types'
export default AlarmKit
