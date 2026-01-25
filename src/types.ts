export type AuthorizationState = 'notDetermined' | 'authorized' | 'denied'

export type Weekday =
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'

export type SecondaryButtonBehavior = 'countdown' | 'custom'

export interface AlarmButton {
  text: string
  textColor: string
  systemImageName: string
}

export interface AlertPresentation {
  title: string
  stopButton: AlarmButton
  secondaryButton?: AlarmButton
  secondaryButtonBehavior?: SecondaryButtonBehavior
}

export interface CountdownPresentation {
  title: string
  pauseButton?: AlarmButton
}

export interface PausedPresentation {
  title: string
  resumeButton?: AlarmButton
}

export interface AlarmPresentation {
  alert: AlertPresentation
  countdown?: CountdownPresentation
  paused?: PausedPresentation
}

export interface FixedSchedule {
  type: 'fixed'
  date: number
}

export interface RelativeSchedule {
  type: 'relative'
  hour: number
  minute: number
  weekdays?: Weekday[]
}

export type AlarmSchedule = FixedSchedule | RelativeSchedule

export interface CountdownDuration {
  preAlert: number
  postAlert: number
}

export interface AlarmConfiguration {
  countdownDuration: CountdownDuration
  schedule?: AlarmSchedule
  presentation: AlarmPresentation
  tintColor?: string
  soundName?: string
  metadata?: Record<string, string>
}

export type AlarmState = 'scheduled' | 'countdown' | 'paused' | 'alerting'

export interface Alarm {
  id: string
  state: AlarmState
  countdownDuration: CountdownDuration | null
  schedule: AlarmSchedule | null
}

export interface Subscription {
  remove: () => void
}

export interface SimpleTimerConfig {
  duration: number
  title: string
  snoozeEnabled?: boolean
  snoozeDuration?: number
  tintColor?: string
  sound?: string
}

export interface SimpleAlarmConfig {
  hour: number
  minute: number
  weekdays?: Weekday[]
  title: string
  snoozeEnabled?: boolean
  snoozeDuration?: number
  tintColor?: string
  sound?: string
}
