import { NitroModules } from 'react-native-nitro-modules'
import type { AlarmKit as AlarmKitSpec } from './specs/AlarmKit.nitro'
import type {
  Alarm,
  AuthorizationState,
  AlarmConfiguration,
  Subscription,
} from './types'

const AlarmKitModule = NitroModules.createHybridObject<AlarmKitSpec>('AlarmKit')

class AlarmKitManagerClass {
  get isSupported(): boolean {
    return AlarmKitModule.isSupported
  }

  async getAuthorizationState(): Promise<AuthorizationState> {
    const state = await AlarmKitModule.getAuthorizationState()
    return state as AuthorizationState
  }

  async requestAuthorization(): Promise<boolean> {
    return AlarmKitModule.requestAuthorization()
  }

  async schedule(id: string, configuration: AlarmConfiguration): Promise<void> {
    return AlarmKitModule.schedule(id, JSON.stringify(configuration))
  }

  async cancel(id: string): Promise<void> {
    return AlarmKitModule.cancel(id)
  }

  async stop(id: string): Promise<void> {
    return AlarmKitModule.stop(id)
  }

  async pause(id: string): Promise<void> {
    return AlarmKitModule.pause(id)
  }

  async resume(id: string): Promise<void> {
    return AlarmKitModule.resume(id)
  }

  async countdown(id: string): Promise<void> {
    return AlarmKitModule.countdown(id)
  }

  async getAlarms(): Promise<Alarm[]> {
    const json = await AlarmKitModule.getAlarms()
    return JSON.parse(json)
  }

  addAlarmUpdatesListener(callback: (alarms: Alarm[]) => void): Subscription {
    const id = AlarmKitModule.addAlarmsListener((json: string) => {
      callback(JSON.parse(json))
    })
    return {
      remove: () => AlarmKitModule.removeAlarmsListener(id),
    }
  }

  addAuthorizationUpdatesListener(
    callback: (state: AuthorizationState) => void
  ): Subscription {
    const id = AlarmKitModule.addAuthorizationListener((state: string) => {
      callback(state as AuthorizationState)
    })
    return {
      remove: () => AlarmKitModule.removeAuthorizationListener(id),
    }
  }
}

export const AlarmKitManager = {
  shared: new AlarmKitManagerClass(),
}
