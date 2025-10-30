import type { ConfigPlugin } from '@expo/config-plugins';
import { withInfoPlist, withEntitlementsPlist } from '@expo/config-plugins';
import type { WonderPushPluginProps } from '.';
import withWonderPushNotificationServiceExtension from './withWonderPushNotificationServiceExtension';

const withWonderPushIOS: ConfigPlugin<WonderPushPluginProps | void> = (
  expoConfig,
  props
) => {
  const clientId = props?.clientId || 'USE_REMEMBERED';
  const clientSecret = props?.clientSecret || 'USE_REMEMBERED';
  const logging = props?.logging;
  const requiresUserConsent = props?.requiresUserConsent;
  const geolocation = props?.geolocation;

  // Add WonderPush configuration and remote-notification to UIBackgroundModes
  expoConfig = withInfoPlist(expoConfig, (config) => {
    const existingModes = config.modResults.UIBackgroundModes || [];

    // Add remote-notification if not already present
    if (!existingModes.includes('remote-notification')) {
      config.modResults.UIBackgroundModes = [
        ...existingModes,
        'remote-notification',
      ];
    }

    // Add WonderPush clientId and clientSecret
    config.modResults.WonderPushClientId = clientId;
    config.modResults.WonderPushClientSecret = clientSecret;

    // Add logging config if explicitly set to true or false
    if (typeof logging === 'boolean') {
      config.modResults.WonderPushLogging = logging;
    }

    // Add requiresUserConsent config if explicitly set to true or false
    if (typeof requiresUserConsent === 'boolean') {
      config.modResults.WonderPushRequiresUserConsent = requiresUserConsent;
    }

    // Add geolocation config if explicitly set to true or false
    if (typeof geolocation === 'boolean') {
      config.modResults.WonderPushGeolocation = geolocation;
    }

    return config;
  });

  // Add aps-environment entitlement
  expoConfig = withEntitlementsPlist(expoConfig, (config) => {
    const apsEnvironment = props?.ios?.apsEnvironment ?? 'development';
    config.modResults['aps-environment'] = apsEnvironment;
    return config;
  });

  // Add Notification Service Extension
  expoConfig = withWonderPushNotificationServiceExtension(expoConfig, props);

  return expoConfig;
};

export default withWonderPushIOS;
