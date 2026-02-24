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
    // Empty notarize object to initialize options - credentials from env vars
    // APPLE_TEAM_ID, APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD
    notarize: {}
  },

  win: {
    target: "nsis",
    icon: "build/icon.ico"
  }
};
