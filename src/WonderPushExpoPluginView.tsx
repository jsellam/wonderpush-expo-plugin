import { requireNativeView } from 'expo';
import * as React from 'react';

import { WonderPushExpoPluginViewProps } from './WonderPushExpoPlugin.types';

const NativeView: React.ComponentType<WonderPushExpoPluginViewProps> =
  requireNativeView('WonderPushExpoPlugin');

export default function WonderPushExpoPluginView(props: WonderPushExpoPluginViewProps) {
  return <NativeView {...props} />;
}
