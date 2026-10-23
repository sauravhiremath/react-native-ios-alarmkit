const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { test } = require('node:test')
const vm = require('node:vm')
const ts = require('typescript')

function loadModule(filename, imports) {
  const source = fs.readFileSync(path.join(__dirname, '..', filename), 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  })
  const module = { exports: {} }
  const run = vm.runInThisContext(
    `(function(require, module, exports) { ${outputText}\n})`,
    { filename }
  )
  run(
    (name) => {
      assert.ok(name in imports, `Unexpected import: ${name}`)
      return imports[name]
    },
    module,
    module.exports
  )
  return module.exports
}

function createAPI(native) {
  const types = loadModule('src/types.ts', {})
  const manager = loadModule('src/AlarmKitManager.ts', {
    'react-native-nitro-modules': {
      NitroModules: { createHybridObject: () => native },
    },
    './types': types,
  })
  const { AlarmKit } = loadModule('src/index.ts', {
    './AlarmKitManager': manager,
    './AlarmConfiguration': loadModule('src/AlarmConfiguration.ts', {}),
    './hooks': {},
    './types': types,
  })
  return { AlarmKit, manager: manager.AlarmKitManager.shared, ...types }
}

const event = {
  id: 'event-id',
  alarmId: 'alarm-id',
  action: 'stop',
  timestamp: 1792660000000,
}

test('both APIs read pending events without consuming them', async () => {
  let reads = 0
  const api = createAPI({
    getPendingActionEvents: async () => {
      reads += 1
      return JSON.stringify([event])
    },
  })
  assert.deepEqual(await api.AlarmKit.getPendingActionEvents(), [event])
  assert.deepEqual(await api.manager.getPendingActionEvents(), [event])
  assert.equal(reads, 2)
})

test('both APIs pass explicit event IDs for acknowledgement', async () => {
  const calls = []
  const api = createAPI({
    acknowledgeActionEvents: async (ids) => calls.push(ids),
  })
  await api.AlarmKit.acknowledgeActionEvents([event.id])
  await api.manager.acknowledgeActionEvents([])
  assert.deepEqual(calls, [[event.id], []])
})

test('unsupported platforms return no events and accept acknowledgement', async () => {
  const api = createAPI({
    getPendingActionEvents: async () => '[]',
    acknowledgeActionEvents: async () => {},
  })
  assert.deepEqual(await api.AlarmKit.getPendingActionEvents(), [])
  await api.AlarmKit.acknowledgeActionEvents(['unknown'])
})

test('read and acknowledgement failures use AlarmKitError', async () => {
  const failure = new Error('storage is unavailable')
  const api = createAPI({
    getPendingActionEvents: async () => {
      throw failure
    },
    acknowledgeActionEvents: async () => {
      throw failure
    },
  })
  await assert.rejects(api.AlarmKit.getPendingActionEvents(), api.AlarmKitError)
  await assert.rejects(
    api.AlarmKit.acknowledgeActionEvents([event.id]),
    api.AlarmKitError
  )
})

test('invalid native JSON rejects instead of returning an empty history', async () => {
  const api = createAPI({ getPendingActionEvents: async () => 'invalid' })
  await assert.rejects(api.AlarmKit.getPendingActionEvents(), api.AlarmKitError)
})

test('simple scheduling passes the action tracking option without enabling it by default', async () => {
  const configurations = []
  const api = createAPI({
    cancel: async () => false,
    schedule: async (_id, json) => {
      configurations.push(JSON.parse(json))
      return ''
    },
  })
  await api.AlarmKit.scheduleTimer('timer-id', {
    duration: 60,
    title: 'Timer',
    trackActions: true,
  })
  await api.AlarmKit.scheduleAlarm('alarm-id', {
    hour: 7,
    minute: 0,
    title: 'Alarm',
    trackActions: true,
  })
  await api.AlarmKit.scheduleTimer('untracked-id', {
    duration: 60,
    title: 'Timer',
  })
  assert.equal(configurations[0].trackActions, true)
  assert.equal(configurations[1].trackActions, true)
  assert.equal(configurations[2].trackActions, undefined)
})

test('all configuration factories pass the action tracking option', () => {
  const { AlarmConfigurationFactory: factory } = loadModule(
    'src/AlarmConfiguration.ts',
    {}
  )
  const attributes = { presentation: { alert: {} } }
  assert.equal(
    factory.timer({ duration: 60, attributes, trackActions: true })
      .trackActions,
    true
  )
  assert.equal(
    factory.alarm({
      schedule: { type: 'fixed', date: 0 },
      attributes,
      trackActions: true,
    }).trackActions,
    true
  )
  assert.equal(
    factory.create({
      countdownDuration: { preAlert: 0, postAlert: 0 },
      attributes,
      trackActions: false,
    }).trackActions,
    false
  )
  assert.equal(
    factory.timer({ duration: 60, attributes }).trackActions,
    undefined
  )
})

test('factories preserve fields, defaults, and detached method calls', () => {
  const { AlarmConfigurationFactory: factory } = loadModule('src/AlarmConfiguration.ts', {})
  const attributes = {
    presentation: { alert: { title: 'Wake up' }, countdown: { title: 'Remaining' } },
    tintColor: '#123456',
    metadata: { key: 'value' },
  }
  const options = { attributes, sound: 'sound.caf', trackActions: false }
  const mapped = {
    presentation: attributes.presentation,
    tintColor: attributes.tintColor,
    metadata: attributes.metadata,
    soundName: 'sound.caf',
    trackActions: false,
  }
  const { timer, alarm, create } = factory
  assert.deepEqual(timer({ ...options, duration: 41 }), {
    ...mapped, countdownDuration: { preAlert: 41, postAlert: 0 },
  })
  for (const schedule of [
    { type: 'fixed', date: 1792660000000 },
    { type: 'relative', hour: 7, minute: 10, weekdays: ['monday', 'friday'] },
  ]) {
    assert.deepEqual(alarm({ ...options, schedule }), {
      ...mapped, countdownDuration: { preAlert: 0, postAlert: 540 }, schedule,
    })
    assert.deepEqual(create({ ...options, countdownDuration: { preAlert: 12, postAlert: 34 }, schedule }), {
      ...mapped, countdownDuration: { preAlert: 12, postAlert: 34 }, schedule,
    })
  }
  assert.equal(timer({ duration: 1, attributes }).soundName, undefined)
  assert.equal(timer({ duration: 1, attributes }).trackActions, undefined)
})

test('simple APIs keep their different snooze defaults and field mapping', async () => {
  const calls = []
  const api = createAPI({
    cancel: async (id) => { calls.push(['cancel', id]); return false },
    schedule: async (id, json) => { calls.push(['schedule', id, JSON.parse(json)]); return '' },
  })
  for (const snoozeEnabled of [undefined, false, true]) {
    for (const snoozeDuration of [undefined, 0, 90]) {
      const common = { title: 'Test', snoozeEnabled, snoozeDuration, tintColor: '#123456', sound: 'a.caf', trackActions: false }
      await api.AlarmKit.scheduleTimer('timer', { ...common, duration: 20 })
      await api.AlarmKit.scheduleAlarm('alarm', { ...common, hour: 8, minute: 12, weekdays: ['monday'] })
      const timer = calls[calls.length - 3][2]
      const alarm = calls[calls.length - 1][2]
      assert.deepEqual(timer.countdownDuration, { preAlert: 20, postAlert: snoozeDuration || 300 })
      assert.deepEqual(alarm.countdownDuration, { preAlert: 0, postAlert: snoozeEnabled ? snoozeDuration || 0 : 0 })
      assert.deepEqual(alarm.schedule, { type: 'relative', hour: 8, minute: 12, weekdays: ['monday'] })
      assert.deepEqual(timer.presentation.countdown, { title: 'Time Remaining' })
      assert.equal(alarm.presentation.countdown, undefined)
      for (const config of [timer, alarm]) {
        assert.equal(config.trackActions, false)
        assert.equal(config.tintColor, common.tintColor)
        assert.equal(config.soundName, common.sound)
        assert.deepEqual(config.presentation.alert.stopButton, { text: 'Stop', textColor: '#FFFFFF', systemImageName: 'stop.circle' })
        assert.equal(config.presentation.alert.secondaryButtonBehavior, snoozeEnabled ? 'countdown' : undefined)
        assert.equal(config.presentation.alert.secondaryButton?.text, snoozeEnabled ? 'Snooze' : undefined)
      }
    }
  }
  assert.deepEqual(calls.slice(0, 2).map((call) => call[0]), ['cancel', 'schedule'])
})

test('structured errors retain code and native details through both APIs', async () => {
  const info = { code: 'INVALID_CONFIGURATION', message: 'Rejected\nconfiguration', domain: 'NativeDomain', nativeCode: 42 }
  const api = createAPI({ schedule: async () => { throw new Error(JSON.stringify(info)) } })
  await assert.rejects(api.manager.schedule('id', {}), (error) => {
    assert.equal(error.code, info.code)
    assert.equal(error.message, info.message)
    assert.equal(error.domain, info.domain)
    assert.equal(error.nativeCode, info.nativeCode)
    assert.equal(api.AlarmKitError.fromError(error), error)
    return true
  })
})

test('malformed structured error data uses the UNKNOWN fallback', () => {
  const { AlarmKitError } = loadModule('src/types.ts', {})
  for (const input of ['broken {json}', '{}', '{"code":"INVALID_UUID"}', '{"code":12,"message":false}', '{"code":"OTHER","message":"text"}']) {
    const error = AlarmKitError.fromError(input)
    assert.equal(error.code, 'UNKNOWN')
    assert.equal(error.message, input)
  }
})
