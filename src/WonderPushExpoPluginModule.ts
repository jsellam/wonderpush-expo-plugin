import { NativeModule, requireNativeModule } from "expo";

declare class WonderPushExpoPluginModule extends NativeModule<
  Record<string, unknown>
> {}

// This call loads the native module object from the JSI.
export default requireNativeModule<WonderPushExpoPluginModule>(
  "WonderPushExpoPlugin"
);
