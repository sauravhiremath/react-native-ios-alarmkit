struct AlarmActionTracking: Equatable, Sendable {
  let tracksStop: Bool
  let tracksSnooze: Bool

  static func resolve(
    trackActions: Bool?,
    hasSecondaryButton: Bool,
    secondaryButtonBehavior: String?
  ) -> AlarmActionTracking {
    let enabled = trackActions == true
    let secondaryButtonCountsDown = (secondaryButtonBehavior ?? "countdown") == "countdown"
    return AlarmActionTracking(
      tracksStop: enabled,
      tracksSnooze: enabled && hasSecondaryButton && secondaryButtonCountsDown
    )
  }
}
