import type { ExpoConfig } from '@expo/config';
import type { ConfigPlugin } from '@expo/config-plugins';
import {
  withXcodeProject,
  withPodfile,
  withDangerousMod,
  IOSConfig,
  WarningAggregator,
} from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';
import type { WonderPushPluginProps } from '.';

const NSE_TARGET_NAME = 'WonderPushNotificationServiceExtension';
const NSE_SOURCE_FILE = 'NotificationService.m';
const NSE_HEADER_FILE = 'NotificationService.h';
const NSE_INFO_PLIST = `${NSE_TARGET_NAME}-Info.plist`;

/**
 * Creates the Notification Service Extension source files
 */
function createNotificationServiceFiles(
  targetPath: string,
  clientId: string,
  clientSecret: string
): void {
  // Ensure the extension directory exists
  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true });
  }

  // Create NotificationService.h
  const headerContent = `#import <WonderPushExtension/WonderPushExtension.h>

@interface NotificationService : WPNotificationServiceExtension

@end
`;
  fs.writeFileSync(path.join(targetPath, NSE_HEADER_FILE), headerContent);

  // Create NotificationService.m
  const implementationContent = `#import "NotificationService.h"

@implementation NotificationService

+ (NSString *)clientId {
    return @"${clientId}";
}

+ (NSString *)clientSecret {
    return @"${clientSecret}";
}

@end
`;
  fs.writeFileSync(path.join(targetPath, NSE_SOURCE_FILE), implementationContent);

  // Create Info.plist
  const infoPlistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDevelopmentRegion</key>
	<string>$(DEVELOPMENT_LANGUAGE)</string>
	<key>CFBundleDisplayName</key>
	<string>${NSE_TARGET_NAME}</string>
	<key>CFBundleExecutable</key>
	<string>$(EXECUTABLE_NAME)</string>
	<key>CFBundleIdentifier</key>
	<string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
	<key>CFBundleInfoDictionaryVersion</key>
	<string>6.0</string>
	<key>CFBundleName</key>
	<string>$(PRODUCT_NAME)</string>
	<key>CFBundlePackageType</key>
	<string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
	<key>CFBundleShortVersionString</key>
	<string>1.0</string>
	<key>CFBundleVersion</key>
	<string>1</string>
	<key>NSExtension</key>
	<dict>
		<key>NSExtensionPointIdentifier</key>
		<string>com.apple.usernotifications.service</string>
		<key>NSExtensionPrincipalClass</key>
		<string>NotificationService</string>
	</dict>
</dict>
</plist>
`;
  fs.writeFileSync(path.join(targetPath, NSE_INFO_PLIST), infoPlistContent);
}

function getNSEBundleId(config: ExpoConfig): string {
  const mainAppBundleId = config.ios?.bundleIdentifier;
  if (!mainAppBundleId || typeof mainAppBundleId !== 'string') {
    throw new Error('Please set expo.ios.bundleIdentifier in your app.json/app.config.js/app.config.ts file');
  }
  return `${mainAppBundleId}.${NSE_TARGET_NAME}`;
}

/**
 * Adds the Notification Service Extension target to the Xcode project
 */
const withNotificationServiceExtensionXcodeTarget: ConfigPlugin<
  WonderPushPluginProps | void
> = (config, props) => {
  const developmentTeam = IOSConfig.DevelopmentTeam.getDevelopmentTeam(config);
  const extensionBundleId = getNSEBundleId(config);
  return withXcodeProject(config, async (config) => {
    const xcodeProject = config.modResults;
    const clientId = props?.clientId || 'USE_REMEMBERED';
    const clientSecret = props?.clientSecret || 'USE_REMEMBERED';

    // Check if target already exists
    if (xcodeProject.pbxTargetByName(NSE_TARGET_NAME)) {
      WarningAggregator.addWarningIOS(
        'wonderpush-notification-service-extension',
        `Target ${NSE_TARGET_NAME} already exists, skipping target creation`
      );
      return config;
    }

    // WORKAROUND for xcode library bug with single target projects
    // Xcode projects don't contain these if there is only one target
    // An upstream fix should be made to the code referenced in this link:
    //   - https://github.com/apache/cordova-node-xcode/blob/8b98cabc5978359db88dc9ff2d4c015cba40f150/lib/pbxProject.js#L860
    const projObjects = xcodeProject.hash.project.objects;
    projObjects['PBXTargetDependency'] = projObjects['PBXTargetDependency'] || {};
    projObjects['PBXContainerItemProxy'] = projObjects['PBXContainerItemProxy'] || {};

    // Add the target
    const target = xcodeProject.addTarget(
      NSE_TARGET_NAME,
      'app_extension',
      NSE_TARGET_NAME,
      extensionBundleId
    );

    if (!target) {
      throw new Error(`Failed to create target ${NSE_TARGET_NAME}`);
    }

    // Create a new PBXGroup for the extension
    const extGroup = xcodeProject.addPbxGroup(
      [NSE_SOURCE_FILE, NSE_HEADER_FILE, NSE_INFO_PLIST],
      NSE_TARGET_NAME,
      NSE_TARGET_NAME
    );

    // Add the new PBXGroup to the top level group
    // This makes the files/folder appear in the file explorer in Xcode
    const groups = xcodeProject.hash.project.objects['PBXGroup'];
    Object.keys(groups).forEach(function (key) {
      if (
        typeof groups[key] === 'object' &&
        groups[key].name === undefined &&
        groups[key].path === undefined
      ) {
        xcodeProject.addToPbxGroup(extGroup.uuid, key);
      }
    });

    // Add source file to project
    const sourcePath = NSE_SOURCE_FILE;
    xcodeProject.addSourceFile(
      sourcePath,
      { target: target.uuid },
      extGroup.uuid
    );

    // Add header file to project
    const headerPath = NSE_HEADER_FILE;
    xcodeProject.addHeaderFile(
      headerPath,
      { target: target.uuid },
      extGroup.uuid
    );

    // Add build phases
    xcodeProject.addBuildPhase(
      [NSE_SOURCE_FILE],
      'PBXSourcesBuildPhase',
      'Sources',
      target.uuid
    );

    xcodeProject.addBuildPhase(
      [],
      'PBXResourcesBuildPhase',
      'Resources',
      target.uuid
    );

    xcodeProject.addBuildPhase(
      [],
      'PBXFrameworksBuildPhase',
      'Frameworks',
      target.uuid
    );

    // Configure build settings for the extension
    // We need to directly access the PBXNativeTarget and its build configurations
    const nativeTargets = xcodeProject.hash.project.objects.PBXNativeTarget;
    const configurations = xcodeProject.pbxXCBuildConfigurationSection();

    let mainTargetIPhoneOSDeploymentTarget: string|undefined;
    let mainTargetTargetedDeviceFamily: string|undefined;
    const applicationTarget = xcodeProject.getFirstTarget();
    if (applicationTarget.firstTarget.buildConfigurationList) {
      const buildConfigurationsList = xcodeProject.pbxXCConfigurationList()[applicationTarget.firstTarget.buildConfigurationList];
      if (buildConfigurationsList && buildConfigurationsList.buildConfigurations) {
        buildConfigurationsList.buildConfigurations.forEach((config: any) => {
          const configId = config.value;
          const buildConfig = configurations[configId];
          if (buildConfig && buildConfig.buildSettings) {
            mainTargetIPhoneOSDeploymentTarget = buildConfig.buildSettings.IPHONEOS_DEPLOYMENT_TARGET;
            mainTargetTargetedDeviceFamily = buildConfig.buildSettings.TARGETED_DEVICE_FAMILY;
          }
        });
      }
    }
    if (mainTargetIPhoneOSDeploymentTarget === undefined) {
      WarningAggregator.addWarningIOS(
        'wonderpush-notification-service-extension',
        'IPHONEOS_DEPLOYMENT_TARGET build setting was not found on the main target and won\'t be set on the Notification Service Extension'
      );
    }
    if (mainTargetTargetedDeviceFamily === undefined) {
      WarningAggregator.addWarningIOS(
        'wonderpush-notification-service-extension',
        'TARGETED_DEVICE_FAMILY build setting was not found on the main target and won\'t be set on the Notification Service Extension'
      );
    }

    let nseBuildSettingsSet = false;
    if (target.pbxNativeTarget && target.pbxNativeTarget.buildConfigurationList) {
      const buildConfigurationsList = xcodeProject.pbxXCConfigurationList()[target.pbxNativeTarget.buildConfigurationList];

      if (buildConfigurationsList && buildConfigurationsList.buildConfigurations) {
        buildConfigurationsList.buildConfigurations.forEach((config: any) => {
          const configId = config.value;
          const buildConfig = configurations[configId];

          if (buildConfig && buildConfig.buildSettings) {
            nseBuildSettingsSet = true;
            // Apply build settings directly to the configuration
            buildConfig.buildSettings.CURRENT_PROJECT_VERSION = '"1"';
            if (developmentTeam) {
              buildConfig.buildSettings.DEVELOPMENT_TEAM = developmentTeam;
            }
            if (mainTargetIPhoneOSDeploymentTarget !== undefined) {
              buildConfig.buildSettings.IPHONEOS_DEPLOYMENT_TARGET = mainTargetIPhoneOSDeploymentTarget;
            }
            buildConfig.buildSettings.FRAMEWORK_SEARCH_PATHS = [
              '"$(inherited)"',
              '"$(PROJECT_DIR)"',
              '"$(PROJECT_DIR)/WonderPushNotificationServiceExtension"',
            ];
            buildConfig.buildSettings.MARKETING_VERSION = '"1.0"';
            if (mainTargetTargetedDeviceFamily !== undefined) {
              buildConfig.buildSettings.TARGETED_DEVICE_FAMILY = mainTargetTargetedDeviceFamily;
            }
          }
        });
      }
    }
    if (!nseBuildSettingsSet) {
      WarningAggregator.addWarningIOS(
        'wonderpush-notification-service-extension',
        'Notification Service Extension build settings could not be adjusted'
      );
    }

    // Add target dependency so the extension is embedded in the main app
    xcodeProject.addTargetDependency(applicationTarget.uuid, [target.uuid]);

    return config;
  });
};

/**
 * Creates the extension files on disk using withDangerousMod
 */
const withNotificationServiceExtensionFiles: ConfigPlugin<
  WonderPushPluginProps | void
> = (config, props) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const iosRoot = config.modRequest.platformProjectRoot;
      const targetPath = path.join(iosRoot, NSE_TARGET_NAME);
      const clientId = props?.clientId || 'USE_REMEMBERED';
      const clientSecret = props?.clientSecret || 'USE_REMEMBERED';

      // Check if extension files already exist
      const sourceFilePath = path.join(targetPath, NSE_SOURCE_FILE);
      if (fs.existsSync(sourceFilePath)) {
        WarningAggregator.addWarningIOS(
          'wonderpush-notification-service-extension',
          `${NSE_TARGET_NAME} files already exist, skipping file creation`
        );
        return config;
      }

      createNotificationServiceFiles(targetPath, clientId, clientSecret);

      return config;
    },
  ]);
};

/**
 * Adds the WonderPushExtension pod to the Podfile
 */
const withNotificationServiceExtensionPodfile: ConfigPlugin<
  WonderPushPluginProps | void
> = (config) => {
  return withPodfile(config, (config) => {
    const podfileContent = config.modResults.contents;

    // Check if the extension target already exists in the Podfile
    const targetRegex = new RegExp(
      `target\\s+['"]${NSE_TARGET_NAME}['"]`,
      'i'
    );

    if (targetRegex.test(podfileContent)) {
      WarningAggregator.addWarningIOS(
        'wonderpush-notification-service-extension',
        `${NSE_TARGET_NAME} target already exists in Podfile, skipping`
      );
      return config;
    }

    // Add the extension target block at the end of the file
    const extensionTargetBlock = `
target '${NSE_TARGET_NAME}' do
  pod 'WonderPushExtension', '~> 4.0'
end
`;

    // Insert before the final 'end' or at the end of the file
    // We'll append it at the end for safety
    config.modResults.contents = podfileContent.trim() + '\n' + extensionTargetBlock + '\n';

    return config;
  });
};

const withNotificationServiceExtensionEASConfig: ConfigPlugin<
  WonderPushPluginProps | void
> = (config) => {
  const extensionBundleId = getNSEBundleId(config);
  config.extra = {
    ...config.extra,
    eas: {
      ...config.extra?.eas,
      build: {
        ...config.extra?.eas?.build,
        experimental: {
          ...config.extra?.eas?.build?.experimental,
          ios: {
            ...config.extra?.eas?.build?.experimental?.ios,
            appExtensions: [
              ...(config.extra?.eas?.build?.experimental?.ios?.appExtensions ?? []),
              {
                // keep in sync with native changes in NSE
                targetName: NSE_TARGET_NAME,
                bundleIdentifier: extensionBundleId,
              }
            ]
          }
        }
      }
    }
  };
  return config;
}

/**
 * Main config plugin that combines all the modifications
 */
const withWonderPushNotificationServiceExtension: ConfigPlugin<
  WonderPushPluginProps | void
> = (config, props) => {
  config = withNotificationServiceExtensionFiles(config, props);
  config = withNotificationServiceExtensionXcodeTarget(config, props);
  config = withNotificationServiceExtensionPodfile(config);
  config = withNotificationServiceExtensionEASConfig(config);
  return config;
};

export default withWonderPushNotificationServiceExtension;
