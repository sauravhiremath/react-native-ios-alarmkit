const fs = require('node:fs')
const path = require('node:path')
const { execFileSync } = require('node:child_process')

module.exports = function buildConsumer({ work, consumer, linkage, configuration, appName, dynamicBridge = true }) {
  const ios = path.join(consumer, 'ios')
  const env = { ...process.env }
  if (linkage === 'library') delete env.USE_FRAMEWORKS
  else env.USE_FRAMEWORKS = linkage
  function logged(command, args, filename) {
    const log = path.join(work, filename)
    const output = fs.openSync(log, 'w')
    console.log(`${command}: ${log}`)
    try {
      execFileSync(command, args, { cwd: ios, stdio: ['ignore', output, output], env })
    } catch (error) {
      console.error(fs.readFileSync(log, 'utf8').split('\n').slice(-100).join('\n'))
      throw error
    } finally {
      fs.closeSync(output)
    }
  }
  logged('pod', ['install'], 'pods.log')
  logged('xcodebuild', [
    '-workspace', `${appName}.xcworkspace`, '-scheme', appName,
    '-configuration', configuration, '-sdk', 'iphonesimulator',
    '-destination', 'generic/platform=iOS Simulator', '-derivedDataPath', path.join(work, 'build'),
    'CODE_SIGNING_ALLOWED=NO', 'build',
  ], 'build.log')
  const app = path.join(work, 'build', 'Build', 'Products', `${configuration}-iphonesimulator`, `${appName}.app`)
  execFileSync(process.execPath, [path.join(__dirname, 'verify-intent-metadata.cjs'), app], { stdio: 'inherit' })
  if (linkage === 'dynamic') {
    for (const framework of ['AlarmKitCore', ...(dynamicBridge ? ['NitroAlarmkit'] : [])]) {
      if (!fs.existsSync(path.join(app, 'Frameworks', `${framework}.framework`, framework))) {
        throw new Error(`The dynamic consumer does not embed ${framework}.framework`)
      }
    }
  }
  const frameworkBinary = path.join(app, 'Frameworks', 'NitroAlarmkit.framework', 'NitroAlarmkit')
  const bridgeBinary = fs.existsSync(frameworkBinary) ? frameworkBinary
    : fs.existsSync(path.join(app, `${appName}.debug.dylib`)) ? path.join(app, `${appName}.debug.dylib`)
      : path.join(app, appName)
  const symbols = execFileSync('xcrun', ['nm', '-j', bridgeBinary], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
  if (!symbols.includes('_OBJC_CLASS_$_NitroAlarmkitAutolinking')) {
    throw new Error('The app does not link the Nitro AlarmKit registration class')
  }
}
