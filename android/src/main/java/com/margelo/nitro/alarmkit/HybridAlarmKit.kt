package com.margelo.nitro.alarmkit

class HybridAlarmKit : HybridAlarmKitSpec() {
  override val hybridContext = margelo.nitro.HybridContext()
  
  override val memorySize: Long
    get() = 0L
  
  override val isSupported: Boolean = false
  
  override suspend fun getAuthorizationState(): String = "denied"
  
  override suspend fun requestAuthorization(): Boolean = false
  
  override suspend fun schedule(id: String, configJson: String): String {
    return ""
  }
  
  override suspend fun cancel(id: String) {
  }
  
  override suspend fun stop(id: String) {
  }
  
  override suspend fun pause(id: String) {
  }
  
  override suspend fun resume(id: String) {
  }
  
  override suspend fun countdown(id: String) {
  }
  
  override suspend fun getAlarms(): String = "[]"
  
  override fun addAlarmsListener(callback: (String) -> Unit): String = ""
  
  override fun removeAlarmsListener(subscriptionId: String) {
  }
  
  override fun addAuthorizationListener(callback: (String) -> Unit): String = ""
  
  override fun removeAuthorizationListener(subscriptionId: String) {
  }
}

