import * as React from 'react';

import { WonderPushExpoPluginViewProps } from './WonderPushExpoPlugin.types';

export default function WonderPushExpoPluginView(props: WonderPushExpoPluginViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}
