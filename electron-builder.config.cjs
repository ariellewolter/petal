module.exports = {
  appId: "com.petal.tasktracker",
  productName: "Petal",
  directories: { output: "dist" },

  files: [
    "main.js",
    "preload.js",
    "tasklist.html",
    "storage.js",
    "manifest.json",
    "icon-192.png",
    "icon-512.png",
    "src/**/*"
  ],

  mac: {
    category: "public.app-category.productivity",
    icon: "build/icon.icns",
    target: ["dmg", "zip"],

    // Explicit notarization config (pulls from GitHub Secrets env vars)
    notarize: {
      teamId: process.env.APPLE_TEAM_ID,
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
    }
  },

  win: {
    target: "nsis",
    icon: "build/icon.ico"
  }
};
