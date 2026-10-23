enum AlarmActionTrackingTests {
  static func run() throws {
    for trackActions in [nil, false] as [Bool?] {
      let off = AlarmActionTracking.resolve(
        trackActions: trackActions,
        hasSecondaryButton: true,
        secondaryButtonBehavior: "countdown"
      )
      try expect(!off.tracksStop && !off.tracksSnooze, "Tracking off must not add intents")
    }

    let noSecondaryButton = AlarmActionTracking.resolve(
      trackActions: true,
      hasSecondaryButton: false,
      secondaryButtonBehavior: nil
    )
    try expect(
      noSecondaryButton.tracksStop && !noSecondaryButton.tracksSnooze,
      "Tracking without a secondary button must track stop only"
    )

    let defaultBehavior = AlarmActionTracking.resolve(
      trackActions: true,
      hasSecondaryButton: true,
      secondaryButtonBehavior: nil
    )
    try expect(
      defaultBehavior.tracksStop && defaultBehavior.tracksSnooze,
      "A secondary button without a behavior defaults to countdown and must track snooze"
    )

    let countdown = AlarmActionTracking.resolve(
      trackActions: true,
      hasSecondaryButton: true,
      secondaryButtonBehavior: "countdown"
    )
    try expect(countdown.tracksStop && countdown.tracksSnooze, "A countdown secondary button must track snooze")

    let custom = AlarmActionTracking.resolve(
      trackActions: true,
      hasSecondaryButton: true,
      secondaryButtonBehavior: "custom"
    )
    try expect(custom.tracksStop && !custom.tracksSnooze, "A custom secondary button must not track snooze")
  }
}
