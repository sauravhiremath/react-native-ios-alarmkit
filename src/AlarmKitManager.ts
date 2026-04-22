import { NitroModules } from 'react-native-nitro-modules'
import type { AlarmKit as AlarmKitSpec } from './specs/AlarmKit.nitro'
import type {
  Alarm,
  AuthorizationState,
  AlarmConfiguration,
  Subscription,
} from './types'
import { AlarmKitError } from './types'

const AlarmKitModule = NitroModules.createHybridObject<AlarmKitSpec>('AlarmKit')

class AlarmKitManagerClass {
  get isSupported(): boolean {
    return AlarmKitModule.isSupported
  }

  async getAuthorizationState(): Promise<AuthorizationState> {
    try {
      const state = await AlarmKitModule.getAuthorizationState()
      return state as AuthorizationState
    } catch (error) {
      throw AlarmKitError.fromError(error)
    }
  }

  async requestAuthorization(): Promise<boolean> {
    try {
      return await AlarmKitModule.requestAuthorization()
    } catch (error) {
      throw AlarmKitError.fromError(error)
    }
  }

  async schedule(
    id: string,
    configuration: AlarmConfiguration
  ): Promise<Alarm | null> {
    try {
      const json = await AlarmKitModule.schedule(
        id,
        JSON.stringify(configuration)
      )
      if (!json) return null
      return JSON.parse(json)
    } catch (error) {
      throw AlarmKitError.fromError(error)
    }
  }

  async cancel(id: string): Promise<boolean> {
    try {
      return await AlarmKitModule.cancel(id)
    } catch (error) {
      throw AlarmKitError.fromError(error)
    }
  }

  async stop(id: string): Promise<void> {
    try {
      return await AlarmKitModule.stop(id)
    } catch (error) {
      throw AlarmKitError.fromError(error)
    }
  }

  async pause(id: string): Promise<void> {
    try {
      return await AlarmKitModule.pause(id)
    } catch (error) {
      throw AlarmKitError.fromError(error)
    }
  }

  async resume(id: string): Promise<void> {
    try {
      return await AlarmKitModule.resume(id)
    } catch (error) {
      throw AlarmKitError.fromError(error)
    }
  }

  async countdown(id: string): Promise<void> {
    try {
      return await AlarmKitModule.countdown(id)
    } catch (error) {
      throw AlarmKitError.fromError(error)
    }
  }

  async getAlarms(): Promise<Alarm[]> {
    try {
      const json = await AlarmKitModule.getAlarms()
      return JSON.parse(json)
    } catch (error) {
      throw AlarmKitError.fromError(error)
    }
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

  async scheduleOrReschedule(
    id: string,
    configuration: AlarmConfiguration
  ): Promise<Alarm | null> {
    await this.cancel(id)
    return this.schedule(id, configuration)
  }
}

export const AlarmKitManager = {
  shared: new AlarmKitManagerClass(),
}
