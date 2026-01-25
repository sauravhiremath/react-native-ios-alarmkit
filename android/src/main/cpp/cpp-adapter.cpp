#include <jni.h>
#include "NitroAlarmkitOnLoad.hpp"

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  return margelo::nitro::alarmkit::initialize(vm);
}
