module.exports = function (context) {
  // Build notarize config - only teamId is allowed by schema
  // Other credentials (APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD) are read from env vars automatically
  const notarizeConfig = process.env.APPLE_TEAM_ID ? {
    teamId: process.env.APPLE_TEAM_ID
  } : undefined;

  return {
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
      hardenedRuntime: true,
      gatekeeperAssess: false,
      // Only teamId is allowed by schema - other credentials from env vars
      notarize: notarizeConfig
    },

    win: {
      target: "nsis",
      icon: "build/icon.ico"
    }
  };
};
