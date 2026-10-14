// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const cryptoShimPath = path.resolve(__dirname, 'src/shims/cryptoShim.js');

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  crypto: cryptoShimPath,
};

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'crypto') {
    return {
      filePath: cryptoShimPath,
      type: 'sourceFile',
    };
  }
  if (typeof originalResolveRequest === 'function') {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
