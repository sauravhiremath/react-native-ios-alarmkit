const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { execFileSync } = require('node:child_process')

const app = process.argv[2]
const filename = path.join(app, 'Metadata.appintents', 'extract.actionsdata')
const definitions = [JSON.parse(fs.readFileSync(filename, 'utf8'))]
const framework = path.join(app, 'Frameworks', 'AlarmKitCore.framework', 'Metadata.appintents')
if (fs.existsSync(framework)) {
  const packages = JSON.parse(fs.readFileSync(path.join(app, 'Metadata.appintents', 'extract.packagedata'), 'utf8'))
  const includes = (packages.includes || []).map((name) => execFileSync('xcrun', [
    'swift-demangle', '--compact', name.startsWith('$s') ? name : `$s${name}`,
  ], { encoding: 'utf8' }).trim())
  assert.equal(includes.filter((name) => name === 'AlarmKitCore.AlarmKitIntentsPackage').length, 1,
    'The app must register AlarmKitCore.AlarmKitIntentsPackage once')
  definitions.push(JSON.parse(fs.readFileSync(path.join(framework, 'extract.actionsdata'), 'utf8')))
}
for (const name of ['AlarmKitStopIntent', 'AlarmKitSnoozeIntent']) {
  const matches = definitions.flatMap((metadata) => Object.values(metadata.actions || {}))
    .filter((action) => action.fullyQualifiedTypeName === `AlarmKitCore.${name}`)
  assert.equal(matches.length, 1, `Expected one AlarmKitCore.${name} action in ${filename}`)
}
console.log(`Verified both action definitions: ${filename}`)
