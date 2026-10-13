const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const existingBlockList = config.resolver.blockList;

config.resolver.blockList = [
  ...(Array.isArray(existingBlockList)
    ? existingBlockList
    : existingBlockList
      ? [existingBlockList]
      : []),
  /[\\/]backend[\\/]\.venv(?:[\\/]|$)/,
  // npm executable links are not app source and may be Linux symlinks when
  // dependencies are installed in WSL and Expo is launched with Windows Node.
  /[\\/]node_modules[\\/]\.bin(?:[\\/]|$)/,
];

module.exports = config;
