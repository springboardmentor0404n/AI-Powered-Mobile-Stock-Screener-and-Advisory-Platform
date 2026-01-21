// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Reduce resource usage
config.maxWorkers = 2;

module.exports = config;
