module.exports = {
  ci: {
    collect: {
      startServerCommand: "npm run start -- --hostname 127.0.0.1 --port 3101",
      startServerReadyPattern: "Ready",
      startServerReadyTimeout: 120_000,
      url: [
        "http://127.0.0.1:3101/",
        "http://127.0.0.1:3101/photo",
        "http://127.0.0.1:3101/music",
        "http://127.0.0.1:3101/dev/projects",
      ],
      numberOfRuns: 1,
      settings: {
        chromeFlags: "--headless --no-sandbox --disable-gpu",
        preset: "desktop",
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["warn", { minScore: 0.8 }],
        "categories:accessibility": ["error", { minScore: 0.9 }],
        "categories:best-practices": ["error", { minScore: 0.9 }],
        "categories:seo": ["error", { minScore: 0.9 }],
        "cumulative-layout-shift": ["warn", { maxNumericValue: 0.1 }],
        "largest-contentful-paint": ["warn", { maxNumericValue: 3000 }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: "./lighthouse-report",
    },
  },
};
