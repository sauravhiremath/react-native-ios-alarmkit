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

export const AlarmKitErrorCode = {
  INVALID_UUID: 'INVALID_UUID',
  INVALID_JSON: 'INVALID_JSON',
  INVALID_CONFIGURATION: 'INVALID_CONFIGURATION',
  ALARM_NOT_FOUND: 'ALARM_NOT_FOUND',
  MAXIMUM_LIMIT_REACHED: 'MAXIMUM_LIMIT_REACHED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  ALARM_EXISTS: 'ALARM_EXISTS',
  UNKNOWN: 'UNKNOWN',
} as const

export type AlarmKitErrorCodeType =
  (typeof AlarmKitErrorCode)[keyof typeof AlarmKitErrorCode]

export interface AlarmKitErrorInfo {
  code: AlarmKitErrorCodeType
  message: string
  domain?: string
  nativeCode?: number
}

export class AlarmKitError extends Error {
  public readonly code: AlarmKitErrorCodeType
  public readonly domain?: string
  public readonly nativeCode?: number
  public readonly nativeError?: string

  constructor(info: AlarmKitErrorInfo, nativeError?: string) {
    super(info.message)
    this.name = 'AlarmKitError'
    this.code = info.code
    this.domain = info.domain
    this.nativeCode = info.nativeCode
    this.nativeError = nativeError

    Object.setPrototypeOf(this, AlarmKitError.prototype)
  }

  static fromError(error: unknown): AlarmKitError {
    if (error instanceof AlarmKitError) {
      return error
    }

    const errorString = String(error)

    try {
      const jsonMatch = errorString.match(/\{.*\}/)
      if (jsonMatch) {
        const errorInfo = JSON.parse(jsonMatch[0]) as AlarmKitErrorInfo
        return new AlarmKitError(errorInfo, errorString)
      }
    } catch {
      // Failed to parse, fall through to default
    }

    return new AlarmKitError(
      {
        code: AlarmKitErrorCode.UNKNOWN,
        message: errorString,
      },
      errorString
    )
  }

  toString(): string {
    return `AlarmKitError [${this.code}]: ${this.message}`
  }
}

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
