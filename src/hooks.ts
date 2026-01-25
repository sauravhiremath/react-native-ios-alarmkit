import { useState, useEffect } from 'react'
import { AlarmKitManager } from './AlarmKitManager'
import type { Alarm, AuthorizationState } from './types'

export function useAlarms(): Alarm[] {
  const [alarms, setAlarms] = useState<Alarm[]>([])

  useEffect(() => {
    if (!AlarmKitManager.shared.isSupported) return

    AlarmKitManager.shared
      .getAlarms()
      .then(setAlarms)
      .catch(() => {})

    const subscription =
      AlarmKitManager.shared.addAlarmUpdatesListener(setAlarms)
    return () => subscription.remove()
  }, [])

  return alarms
}

export function useAuthorizationState(): AuthorizationState {
  const [state, setState] = useState<AuthorizationState>('notDetermined')

  useEffect(() => {
    if (!AlarmKitManager.shared.isSupported) return

    AlarmKitManager.shared
      .getAuthorizationState()
      .then(setState)
      .catch(() => {})

    const subscription =
      AlarmKitManager.shared.addAuthorizationUpdatesListener(setState)
    return () => subscription.remove()
  }, [])

  return state
}
