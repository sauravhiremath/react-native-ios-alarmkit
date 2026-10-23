const fs = require('node:fs')
const path = require('node:path')
const pkg = require('../package.json')

fs.writeFileSync(path.join(__dirname, '..', 'AlarmKitCore.podspec.json'), JSON.stringify({
  name: 'AlarmKitCore',
  version: pkg.version,
  summary: 'Swift alarm scheduling and action tracking for iOS AlarmKit',
  homepage: pkg.homepage,
  license: pkg.license,
  authors: pkg.author,
  source: { git: `${pkg.repository.url}.git`, tag: pkg.version },
  platforms: { ios: '15.1' },
  swift_versions: '5.0',
  source_files: 'ios/core/**/*.swift',
  pod_target_xcconfig: { DEFINES_MODULE: 'YES' },
}, null, 2) + '\n')
