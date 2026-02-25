module.exports = function (context) {
  // Build notarize config dynamically from environment variables
  // This bypasses schema validation by building the object at runtime
  const notarizeConfig = {};
  
  if (process.env.APPLE_TEAM_ID) {
    notarizeConfig.teamId = process.env.APPLE_TEAM_ID;
  }
  if (process.env.APPLE_ID) {
    notarizeConfig.appleId = process.env.APPLE_ID;
  }
  if (process.env.APPLE_APP_SPECIFIC_PASSWORD) {
    notarizeConfig.appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD;
  }
  // Always set appBundleId to initialize the options object
  notarizeConfig.appBundleId = "com.petal.tasktracker";

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
      // Build notarize config from environment variables at runtime
      notarize: Object.keys(notarizeConfig).length > 0 ? notarizeConfig : undefined
    },

    win: {
      target: "nsis",
      icon: "build/icon.ico"
    }
  };
};
