package com.margelo.nitro.alarmkit

import com.margelo.nitro.core.Promise

class HybridAlarmKit : HybridAlarmKitSpec() {
  override val memorySize: Long
    get() = 0L

  override val isSupported: Boolean = false

  override fun getAuthorizationState(): Promise<String> = Promise.resolved("denied")

  override fun requestAuthorization(): Promise<Boolean> = Promise.resolved(false)

  override fun schedule(id: String, configJson: String): Promise<String> = Promise.resolved("")

  override fun cancel(id: String): Promise<Boolean> = Promise.resolved(false)

  override fun stop(id: String): Promise<Unit> = Promise.resolved(Unit)

  override fun pause(id: String): Promise<Unit> = Promise.resolved(Unit)

  override fun resume(id: String): Promise<Unit> = Promise.resolved(Unit)

  override fun countdown(id: String): Promise<Unit> = Promise.resolved(Unit)

  override fun getAlarms(): Promise<String> = Promise.resolved("[]")

  override fun addAlarmsListener(callback: (String) -> Unit): String = ""

  override fun removeAlarmsListener(subscriptionId: String) {
  }

  override fun addAuthorizationListener(callback: (String) -> Unit): String = ""

  override fun removeAuthorizationListener(subscriptionId: String) {
  }
}
