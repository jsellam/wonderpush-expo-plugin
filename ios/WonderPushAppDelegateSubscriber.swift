import ExpoModulesCore
import WonderPush
import os.log

public class WonderPushAppDelegateSubscriber: ExpoAppDelegateSubscriber {

    public func application(_ application: UIApplication, willFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        NSLog("[WonderPush] application:willFinishLaunchingWithOptions: called")

        // TODO Fetch CLIENT_ID and CLIENT_SECRET and initialize the WonderPush SDK

        // Avoid WonderPush.setupDelegateForApplication(application) and
        // manually forward the other methods, so that the class of
        // UIApplication.delegate is left untouched, as the WonderPush iOS SDK
        // does not use method swizzling at the moment.
        //WonderPush.setupDelegateForApplication(application)

        WonderPush.setupDelegateForUserNotificationCenter()

        return true
    }

    public func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        NSLog("[WonderPush] application:didFinishLaunchingWithOptions: called")
        WonderPush.application(application, didFinishLaunchingWithOptions: launchOptions)
        return true
    }

    public func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NSLog("[WonderPush] application:didRegisterForRemoteNotificationsWithDeviceToken: called")
        WonderPush.application(application, didRegisterForRemoteNotificationsWithDeviceToken: deviceToken)
    }

    public func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NSLog("[WonderPush] application:didFailToRegisterForRemoteNotificationsWithError: called with error: %@", error.localizedDescription)
        WonderPush.application(application, didFailToRegisterForRemoteNotificationsWithError: error)
    }

    public func application(_ application: UIApplication, didReceiveRemoteNotification userInfo: [AnyHashable : Any], fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
        NSLog("[WonderPush] application:didReceiveRemoteNotification:fetchCompletionHandler: called")
        WonderPush.application(application, didReceiveRemoteNotification: userInfo, fetchCompletionHandler: completionHandler)
    }

    public func applicationDidBecomeActive(_ application: UIApplication) {
        NSLog("[WonderPush] applicationDidBecomeActive: called")
        WonderPush.applicationDidBecomeActive(application)
    }

    public func applicationDidEnterBackground(_ application: UIApplication) {
        NSLog("[WonderPush] applicationDidEnterBackground: called")
        WonderPush.applicationDidEnterBackground(application)
    }

    public func application(_ application: UIApplication, didRegister notificationSettings: UIUserNotificationSettings) {
        NSLog("[WonderPush] application:didRegister: called")
        WonderPush.application(application, didRegister: notificationSettings)
    }

}
