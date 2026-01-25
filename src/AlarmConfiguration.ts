import type {
  AlarmConfiguration as AlarmConfigurationType,
  AlarmPresentation,
  AlarmSchedule,
  CountdownDuration,
} from './types'

export interface TimerOptions {
  duration: number
  attributes: {
    presentation: AlarmPresentation
    metadata?: Record<string, string>
    tintColor?: string
  }
  sound?: string
}

export interface AlarmOptions {
  schedule: AlarmSchedule
  attributes: {
    presentation: AlarmPresentation
    metadata?: Record<string, string>
    tintColor?: string
  }
  sound?: string
}

export interface FullOptions {
  countdownDuration: CountdownDuration
  schedule?: AlarmSchedule
  attributes: {
    presentation: AlarmPresentation
    metadata?: Record<string, string>
    tintColor?: string
  }
  sound?: string
}

export const AlarmConfigurationFactory = {
  timer(options: TimerOptions): AlarmConfigurationType {
    return {
      countdownDuration: {
        preAlert: options.duration,
        postAlert: 0,
      },
      presentation: options.attributes.presentation,
      metadata: options.attributes.metadata,
      tintColor: options.attributes.tintColor,
      soundName: options.sound,
    }
  },

  alarm(options: AlarmOptions): AlarmConfigurationType {
    return {
      countdownDuration: {
        preAlert: 0,
        postAlert: 540,
      },
      schedule: options.schedule,
      presentation: options.attributes.presentation,
      metadata: options.attributes.metadata,
      tintColor: options.attributes.tintColor,
      soundName: options.sound,
    }
  },

  create(options: FullOptions): AlarmConfigurationType {
    return {
      countdownDuration: options.countdownDuration,
      schedule: options.schedule,
      presentation: options.attributes.presentation,
      metadata: options.attributes.metadata,
      tintColor: options.attributes.tintColor,
      soundName: options.sound,
    }
  },
}
