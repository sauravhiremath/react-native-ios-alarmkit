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

    let active = true
    let receivedUpdate = false
    const subscription = AlarmKitManager.shared.addAlarmUpdatesListener(
      (updatedAlarms) => {
        if (!active) return
        receivedUpdate = true
        setAlarms(updatedAlarms)
        setError(null)
        setIsLoading(false)
      }
    )

    AlarmKitManager.shared
      .getAlarms()
      .then((initialAlarms) => {
        if (!active || receivedUpdate) return
        setAlarms(initialAlarms)
        setIsLoading(false)
      })
      .catch((err) => {
        if (!active || receivedUpdate) return
        setError(AlarmKitError.fromError(err))
        setIsLoading(false)
      })

    return () => {
      active = false
      subscription.remove()
    }
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

    let active = true
    let receivedUpdate = false
    const subscription = AlarmKitManager.shared.addAuthorizationUpdatesListener(
      (newState) => {
        if (!active) return
        receivedUpdate = true
        setState(newState)
        setError(null)
        setIsLoading(false)
      }
    )

    AlarmKitManager.shared
      .getAuthorizationState()
      .then((initialState) => {
        if (!active || receivedUpdate) return
        setState(initialState)
        setIsLoading(false)
      })
      .catch((err) => {
        if (!active || receivedUpdate) return
        setError(AlarmKitError.fromError(err))
        setIsLoading(false)
      })

    return () => {
      active = false
      subscription.remove()
    }
  }, [])

  return { state, error, isLoading }
}
