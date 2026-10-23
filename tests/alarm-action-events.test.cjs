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
