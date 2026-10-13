import React from 'react';
import * as Native from 'react-native-web';
export * from 'react-native-web';
const factor = Number(new URLSearchParams(location.search).get('fontScale') || 1);
export const useWindowDimensions = () => ({ ...Native.useWindowDimensions(), fontScale: factor });
export const Text = React.forwardRef((props, ref) => {
  const style = Native.StyleSheet.flatten(props.style) || {};
  return <Native.Text {...props} ref={ref} style={[props.style, {
    fontSize: (style.fontSize || 14) * factor,
    ...(style.lineHeight ? { lineHeight: style.lineHeight * factor } : {}),
  }]} />;
});
