export class AlarmKitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AlarmKitError'
  }
}
