const { getDefaultConfig } = require('expo/metro-config'); // or '@react-native/metro-config'
const path = require('path');

// 1. Find the project and workspace directories
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../../../');
const backendRoot = path.resolve(monorepoRoot, '../../../packages/backend');

const config = getDefaultConfig(projectRoot);

// 2. Watch all files within the monorepo (including packages/backend)
config.watchFolders = [monorepoRoot];

// 3. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(monorepoRoot, 'node_modules'),
    path.resolve(backendRoot, 'node_modules'),
];

// 4. Force Metro to resolve to the absolute path of the shared backend
config.resolver.extraNodeModules = {
    '@backend': path.resolve(backendRoot),
};

config.resolver.unstable_enablePackageExports = true;

module.exports = config;
