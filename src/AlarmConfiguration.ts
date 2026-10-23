import type {
  AlarmConfiguration as AlarmConfigurationType,
  AlarmPresentation,
  AlarmSchedule,
  CountdownDuration,
} from './types'

interface ConfigurationOptions {
  attributes: {
    presentation: AlarmPresentation
    metadata?: Record<string, string>
    tintColor?: string
  }
  sound?: string
  trackActions?: boolean
}

export interface TimerOptions extends ConfigurationOptions {
  duration: number
}

export interface AlarmOptions extends ConfigurationOptions {
  schedule: AlarmSchedule
}

export interface FullOptions extends ConfigurationOptions {
  countdownDuration: CountdownDuration
  schedule?: AlarmSchedule
}

function mapOptions(options: ConfigurationOptions) {
  return {
    presentation: options.attributes.presentation,
    metadata: options.attributes.metadata,
    tintColor: options.attributes.tintColor,
    soundName: options.sound,
    trackActions: options.trackActions,
  }
}

export const AlarmConfigurationFactory = {
  timer(options: TimerOptions): AlarmConfigurationType {
    return {
      countdownDuration: {
        preAlert: options.duration,
        postAlert: 0,
      },
      ...mapOptions(options),
    }
  },

  alarm(options: AlarmOptions): AlarmConfigurationType {
    return {
      countdownDuration: {
        preAlert: 0,
        postAlert: 540,
      },
      schedule: options.schedule,
      ...mapOptions(options),
    }
  },

  create(options: FullOptions): AlarmConfigurationType {
    return {
      countdownDuration: options.countdownDuration,
      schedule: options.schedule,
      ...mapOptions(options),
    }
  },
}
