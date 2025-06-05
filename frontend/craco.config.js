module.exports = {
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      // Add a rule to ignore source map warnings from react-datepicker
      // We are looking for the source-map-loader rule
      const oneOfRule = webpackConfig.module.rules.find(rule => rule.oneOf);
      if (oneOfRule) {
        const sourceMapLoaderRule = oneOfRule.oneOf.find(
          rule => rule.loader && rule.loader.includes('source-map-loader')
        );

        if (sourceMapLoaderRule) {
          // Clone the existing rule and add an 'exclude' condition
          const newSourceMapLoaderRule = { ...sourceMapLoaderRule };
          // Ensure 'exclude' is an array, even if it's undefined initially
          newSourceMapLoaderRule.exclude = [
            ...(Array.isArray(newSourceMapLoaderRule.exclude) ? newSourceMapLoaderRule.exclude : (newSourceMapLoaderRule.exclude ? [newSourceMapLoaderRule.exclude] : [])),
            /node_modules\/react-datepicker\//  // Exclude react-datepicker from source-map-loader
          ];

          // Find the index of the original source-map-loader rule
          const ruleIndex = oneOfRule.oneOf.indexOf(sourceMapLoaderRule);
          if (ruleIndex !== -1) {
            // Replace the original rule with the modified one
            oneOfRule.oneOf[ruleIndex] = newSourceMapLoaderRule;
          }
        } else {
          // Fallback: if source-map-loader is not found directly in oneOf,
          // try to add a general ignore for these warnings.
          // This is less precise but can work if the loader structure is different.
          if (!webpackConfig.ignoreWarnings) {
            webpackConfig.ignoreWarnings = [];
          }
          webpackConfig.ignoreWarnings.push(
            /Failed to parse source map from .*react-datepicker/
          );
        }
      } else {
        // Fallback for different Webpack configurations
        if (!webpackConfig.ignoreWarnings) {
          webpackConfig.ignoreWarnings = [];
        }
        webpackConfig.ignoreWarnings.push(
          /Failed to parse source map from .*react-datepicker/
        );
      }
      return webpackConfig;
    },
  },
  jest: {
    configure: (config) => {
      config.transformIgnorePatterns = [
        'node_modules/(?!date-fns|date-fns-tz)/',
      ];
      return config;
    },
  },
};
