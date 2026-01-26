import { useState, useEffect } from 'react'
import { AlarmKitManager } from './AlarmKitManager'
import type { Alarm, AuthorizationState } from './types'
import { AlarmKitError } from './types'

export interface UseAlarmsResult {
  alarms: Alarm[]
  error: AlarmKitError | null
  isLoading: boolean
}

export interface UseAuthorizationResult {
  state: AuthorizationState
  error: AlarmKitError | null
  isLoading: boolean
}

export function useAlarms(): UseAlarmsResult {
  const [alarms, setAlarms] = useState<Alarm[]>([])
  const [error, setError] = useState<AlarmKitError | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!AlarmKitManager.shared.isSupported) {
      setIsLoading(false)
      return
    }

    // Subscribe first to avoid race condition where an update
    // arrives between fetch start and subscription setup
    const subscription = AlarmKitManager.shared.addAlarmUpdatesListener(
      (updatedAlarms) => {
        setAlarms(updatedAlarms)
        setError(null)
        setIsLoading(false)
      }
    )

    // Then fetch initial state
    AlarmKitManager.shared
      .getAlarms()
      .then((initialAlarms) => {
        setAlarms(initialAlarms)
        setIsLoading(false)
      })
      .catch((err) => {
        setError(AlarmKitError.fromError(err))
        setIsLoading(false)
      })

    return () => subscription.remove()
  }, [])

  return { alarms, error, isLoading }
}

export function useAuthorizationState(): UseAuthorizationResult {
  const [state, setState] = useState<AuthorizationState>('notDetermined')
  const [error, setError] = useState<AlarmKitError | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!AlarmKitManager.shared.isSupported) {
      setIsLoading(false)
      return
    }

    // Subscribe first to avoid race condition
    const subscription = AlarmKitManager.shared.addAuthorizationUpdatesListener(
      (newState) => {
        setState(newState)
        setError(null)
        setIsLoading(false)
      }
    )

    // Then fetch initial state
    AlarmKitManager.shared
      .getAuthorizationState()
      .then((initialState) => {
        setState(initialState)
        setIsLoading(false)
      })
      .catch((err) => {
        setError(AlarmKitError.fromError(err))
        setIsLoading(false)
      })

    return () => subscription.remove()
  }, [])

  return { state, error, isLoading }
}
