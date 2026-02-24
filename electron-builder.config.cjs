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
    // Explicit notarize config to initialize options object
    // Credentials come from environment variables: APPLE_TEAM_ID, APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD
    notarize: {
      appBundleId: "com.petal.tasktracker"
    }
  },

  win: {
    target: "nsis",
    icon: "build/icon.ico"
  }
};
