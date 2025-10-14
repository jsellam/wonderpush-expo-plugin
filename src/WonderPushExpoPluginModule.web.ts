import { registerWebModule, NativeModule } from 'expo';

import { WonderPushExpoPluginModuleEvents } from './WonderPushExpoPlugin.types';

class WonderPushExpoPluginModule extends NativeModule<WonderPushExpoPluginModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
}

export default registerWebModule(WonderPushExpoPluginModule, 'WonderPushExpoPluginModule');
