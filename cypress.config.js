const { defineConfig } = require('cypress');

module.exports = defineConfig({
  chromeWebSecurity: false,
  e2e: {
    baseUrl: 'http://localhost:3000',
    viewportWidth: 1280,
    viewportHeight: 800,
    video: true,
    videosFolder: 'cypress/videos',
    screenshotsFolder: 'cypress/screenshots',
    videoCompression: 32,
    defaultCommandTimeout: 10000,
    setupNodeEvents(on, config) {
      // Node event listeners
    },
  },
});
