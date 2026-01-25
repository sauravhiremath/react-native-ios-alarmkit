import type { HybridObject } from 'react-native-nitro-modules'

export interface AlarmKit extends HybridObject<{
  ios: 'swift'
  android: 'kotlin'
}> {
  readonly isSupported: boolean

  getAuthorizationState(): Promise<string>
  requestAuthorization(): Promise<boolean>

  schedule(id: string, configJson: string): Promise<void>
  cancel(id: string): Promise<void>
  stop(id: string): Promise<void>
  pause(id: string): Promise<void>
  resume(id: string): Promise<void>
  countdown(id: string): Promise<void>

  getAlarms(): Promise<string>

  addAlarmsListener(callback: (alarmsJson: string) => void): string
  removeAlarmsListener(subscriptionId: string): void
  addAuthorizationListener(callback: (state: string) => void): string
  removeAuthorizationListener(subscriptionId: string): void
}
