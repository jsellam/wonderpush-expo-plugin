import { NativeModule, requireNativeModule } from 'expo';

import { WonderPushExpoPluginModuleEvents } from './WonderPushExpoPlugin.types';

declare class WonderPushExpoPluginModule extends NativeModule<WonderPushExpoPluginModuleEvents> {
  PI: number;
  hello(): string;
  setValueAsync(value: string): Promise<void>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<WonderPushExpoPluginModule>('WonderPushExpoPlugin');
