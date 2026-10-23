const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const { test } = require('node:test')

test('the metadata check rejects missing, copied, or duplicate intent definitions', () => {
  const app = fs.mkdtempSync(path.join(os.tmpdir(), 'alarmkit-metadata-'))
  const dir = path.join(app, 'Metadata.appintents')
  fs.mkdirSync(dir)
  const check = (actions) => {
    fs.writeFileSync(path.join(dir, 'extract.actionsdata'), JSON.stringify({ actions }))
    return spawnSync(process.execPath, [path.join(__dirname, '..', 'scripts', 'verify-intent-metadata.cjs'), app]).status
  }
  const stop = { fullyQualifiedTypeName: 'AlarmKitCore.AlarmKitStopIntent' }
  const snooze = { fullyQualifiedTypeName: 'AlarmKitCore.AlarmKitSnoozeIntent' }
  try {
    assert.equal(check({ stop, snooze }), 0)
    assert.notEqual(check({ stop }), 0)
    assert.notEqual(check({ stop, snooze, duplicate: stop }), 0)
    assert.notEqual(check({ stop, snooze: { fullyQualifiedTypeName: 'App.AlarmKitSnoozeIntent' } }), 0)
  } finally {
    fs.rmSync(app, { recursive: true, force: true })
  }
})
