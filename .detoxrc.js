module.exports = {
  testRunner: {
    args: {
      '$0': 'jest',
      config: 'e2e/jest.config.js',
    },
    jest: {
      setupFilesAfterEnv: ['./e2e/init.js'],
    },
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/MarketHubMobile.app',
      build: 'xcodebuild -workspace ios/MarketHubMobile.xcworkspace -scheme MarketHubMobile -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build',
    },
    'ios.release': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Release-iphonesimulator/MarketHubMobile.app',
      build: 'xcodebuild -workspace ios/MarketHubMobile.xcworkspace -scheme MarketHubMobile -configuration Release -sdk iphonesimulator -derivedDataPath ios/build',
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug',
      reversePorts: [8081],
    },
    'android.release': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/release/app-release.apk',
      build: 'cd android && ./gradlew assembleRelease assembleAndroidTest -DtestBuildType=release',
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 15',
      },
    },
    attached: {
      type: 'android.attached',
      device: {
        adbName: '.*', // any attached device
      },
    },
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_7_API_33',
      },
    },
  },
  configurations: {
    'ios.sim.debug': {
      app: 'ios.debug',
      device: 'simulator',
    },
    'ios.sim.release': {
      app: 'ios.release',
      device: 'simulator',
    },
    'android.att.debug': {
      app: 'android.debug',
      device: 'attached',
    },
    'android.att.release': {
      app: 'android.release',
      device: 'attached',
    },
    'android.emu.debug': {
      app: 'android.debug',
      device: 'emulator',
    },
    'android.emu.release': {
      app: 'android.release',
      device: 'emulator',
    },
  },
};
