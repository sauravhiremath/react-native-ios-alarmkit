const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const vm = require('node:vm')
const { createRequire } = require('node:module')
const { test } = require('node:test')
const plugins = require('@expo/config-plugins')
const pluginRequire = createRequire(require.resolve('@expo/config-plugins'))
const xcode = pluginRequire('xcode')
const root = path.resolve(__dirname, '..')

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'alarmkit-plugin-'))
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }))
  const projectFile = path.join(directory, 'project.pbxproj')
  fs.copyFileSync(path.join(root, 'example/ios/AlarmKitExample.xcodeproj/project.pbxproj'), projectFile)
  const project = xcode.project(projectFile)
  project.parseSync()
  const module = { exports: {} }
  vm.runInThisContext(`(function(require, module, __dirname) { ${fs.readFileSync(path.join(root, 'app.plugin.js'), 'utf8')}\n})`)(
    (name) => name === 'expo/config-plugins'
      ? { ...plugins,
        withXcodeProject: (config, mod) => ({ ...config, runMod: mod }),
        withPodfile: (config, mod) => ({ ...config, runPodfileMod: mod }),
      }
      : createRequire(path.join(root, 'app.plugin.js'))(name),
    module, root
  )
  const apply = () => {
    const config = module.exports({ name: 'AlarmKitExample', slug: 'alarmkit' })
    return config.runMod({
      ...config, modResults: project,
      modRequest: { platformProjectRoot: directory, projectName: 'AlarmKitExample' },
    })
  }
  const applyPodfile = (contents) => {
    const config = module.exports({ name: 'AlarmKitExample', slug: 'alarmkit' })
    return config.runPodfileMod({ ...config, modResults: { contents } }).modResults.contents
  }
  return { directory, project, apply, applyPodfile, plugin: module.exports }
}

function registrationReferences(project) {
  return Object.entries(project.pbxFileReferenceSection()).filter(([, value]) =>
    typeof value === 'object' && String(value.path).includes('AlarmKitAppIntents.swift'))
}

test('commented core pods do not prevent repeatable Podfile setup', (t) => {
  const { applyPodfile } = fixture(t)
  const contents = `target 'AlarmKitExample' do
  # pod 'AlarmKitCore', :path => '../old-path'
  # pod "AlarmKitCore", :path => '../old-path'
  use_expo_modules!
end
`
  const result = applyPodfile(contents)
  assert.equal((result.match(/^[\t ]*pod ['"]AlarmKitCore['"]/gm) || []).length, 1)
  assert.ok(result.includes("  # pod 'AlarmKitCore', :path => '../old-path'"))
  assert.ok(result.includes('  # pod "AlarmKitCore", :path => \'../old-path\''))
  assert.equal(applyPodfile(result), result)
})

test('existing active core pods are unchanged for either quote style', (t) => {
  const { applyPodfile } = fixture(t)
  for (const quote of ["'", '"']) {
    const contents = `target 'AlarmKitExample' do
  pod ${quote}AlarmKitCore${quote}, :path => '../library'
  use_expo_modules!
end
`
    assert.equal(applyPodfile(contents), contents)
  }
})

test('an absent Podfile anchor reports how to add the core pod', (t) => {
  const { applyPodfile } = fixture(t)
  assert.throws(() => applyPodfile("target 'AlarmKitExample' do\nend\n"), /Cannot find use_expo_modules!.*Add the AlarmKitCore pod/)
})

test('registration survives two runs and has one application source entry', async (t) => {
  const { directory, project, apply } = fixture(t)
  await apply()
  await apply()
  assert.equal(fs.readFileSync(path.join(directory, 'AlarmKitExample/AlarmKitAppIntents.swift'), 'utf8'), fs.readFileSync(path.join(root, 'plugin/AlarmKitAppIntents.swift'), 'utf8'))
  const refs = registrationReferences(project)
  assert.equal(refs.length, 1)
  const builds = Object.entries(project.pbxBuildFileSection()).filter(([, value]) => value.fileRef === refs[0][0])
  assert.equal(builds.length, 1)
  const target = Object.values(project.pbxNativeTargetSection()).find((value) => value.name === 'AlarmKitExample')
  const sources = target.buildPhases.map((phase) => project.hash.project.objects.PBXSourcesBuildPhase?.[phase.value]).filter(Boolean)
  assert.equal(sources.flatMap((phase) => phase.files).filter((file) => file.value === builds[0][0]).length, 1)
})

test('an existing source reference without build membership is repaired', async (t) => {
  const { project, apply } = fixture(t)
  project.addFile('AlarmKitExample/AlarmKitAppIntents.swift', project.getFirstProject().firstProject.mainGroup)
  await apply()
  assert.equal(registrationReferences(project).length, 1)
  const id = registrationReferences(project)[0][0]
  assert.equal(Object.values(project.pbxBuildFileSection()).filter((file) => file.fileRef === id).length, 1)
})

test('conflicting source content is not overwritten', async (t) => {
  const { directory, apply } = fixture(t)
  const file = path.join(directory, 'AlarmKitExample/AlarmKitAppIntents.swift')
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, 'user source')
  await assert.rejects(async () => apply(), /AlarmKitAppIntents\.swift.*conflict/i)
  assert.equal(fs.readFileSync(file, 'utf8'), 'user source')
})

test('an absent application target fails before writing source files', async (t) => {
  const { directory, project, apply } = fixture(t)
  for (const target of Object.values(project.pbxNativeTargetSection())) {
    if (typeof target === 'object') target.productType = '"com.apple.product-type.app-extension"'
  }
  await assert.rejects(async () => apply(), /application target/i)
  assert.equal(fs.existsSync(path.join(directory, 'AlarmKitExample/AlarmKitAppIntents.swift')), false)
})

test('loading the plugin does not write iOS files', (t) => {
  const { directory, plugin } = fixture(t)
  plugin({ name: 'AlarmKitExample', slug: 'alarmkit' })
  assert.equal(fs.existsSync(path.join(directory, 'AlarmKitExample')), false)
})
