#if canImport(AlarmKit) && canImport(AppIntents)
import AppIntents
import AlarmKitCore

@available(iOS 26.0, *)
struct AlarmKitAppIntentsPackage: AppIntentsPackage {
  static var includedPackages: [any AppIntentsPackage.Type] {
    [AlarmKitIntentsPackage.self]
  }
}
#endif
