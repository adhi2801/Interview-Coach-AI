const path = require("path");
const { getLoaders, loaderByName } = require("@craco/craco");

module.exports = {
  webpack: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
    configure: (webpackConfig) => {
      const { hasFoundAny, matches } = getLoaders(webpackConfig, loaderByName("postcss-loader"));
      if (hasFoundAny) {
        matches[matches.length - 1].loader.options.postcssOptions.config = path.join(__dirname, "postcss.config.js");
      }
      return webpackConfig;
    },
  },
};