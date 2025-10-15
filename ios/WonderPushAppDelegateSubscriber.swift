import ExpoModulesCore
import WonderPush
import os.log

public class WonderPushAppDelegateSubscriber: ExpoAppDelegateSubscriber {

    public func application(_ application: UIApplication, willFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Read logging config from Info.plist and enable if set to true
        if let logging = Bundle.main.object(forInfoDictionaryKey: "WonderPushLogging") as? Bool, logging {
            WonderPush.setLogging(true)
        }

        // Read requiresUserConsent config from Info.plist
        if let requiresUserConsent = Bundle.main.object(forInfoDictionaryKey: "WonderPushRequiresUserConsent") as? Bool {
            WonderPush.setRequiresUserConsent(requiresUserConsent)
        }

        // Read geolocation config from Info.plist
        if let geolocation = Bundle.main.object(forInfoDictionaryKey: "WonderPushGeolocation") as? Bool {
            if geolocation {
                WonderPush.enableGeolocation()
            } else {
                WonderPush.disableGeolocation()
            }
        }

        // Read clientId and clientSecret from Info.plist
        let clientId = Bundle.main.object(forInfoDictionaryKey: "WonderPushClientId") as? String ?? "USE_REMEMBERED"
        let clientSecret = Bundle.main.object(forInfoDictionaryKey: "WonderPushClientSecret") as? String ?? "USE_REMEMBERED"

        WonderPush.setClientId(clientId, secret: clientSecret)
        WonderPush.setupDelegateForUserNotificationCenter()

        // Do not use WonderPush.setupDelegateForApplication(application),
        // instead manually forward the other methods, so that the class of
        // UIApplication.delegate is left untouched, as the WonderPush iOS SDK
        // does not use method swizzling at the moment.
        //WonderPush.setupDelegateForApplication(application)

        return true
    }

    public func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        WonderPush.application(application, didFinishLaunchingWithOptions: launchOptions)
        return true
    }

    public func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        WonderPush.application(application, didRegisterForRemoteNotificationsWithDeviceToken: deviceToken)
    }

    public func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        WonderPush.application(application, didFailToRegisterForRemoteNotificationsWithError: error)
    }

    public func application(_ application: UIApplication, didReceiveRemoteNotification userInfo: [AnyHashable : Any], fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
        WonderPush.application(application, didReceiveRemoteNotification: userInfo, fetchCompletionHandler: completionHandler)
    }

    public func applicationDidBecomeActive(_ application: UIApplication) {
        WonderPush.applicationDidBecomeActive(application)
    }

    public func applicationDidEnterBackground(_ application: UIApplication) {
        WonderPush.applicationDidEnterBackground(application)
    }

    public func application(_ application: UIApplication, didRegister notificationSettings: UIUserNotificationSettings) {
        WonderPush.application(application, didRegister: notificationSettings)
    }

}
