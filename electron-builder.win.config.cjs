/** Windows-only electron-builder config — Mac/iOS builds use electron-builder.config.cjs */
module.exports = {
  appId: "com.petal.tasktracker",
  productName: "Petal",
  directories: { output: "dist" },

  files: [
    "main.js",
    "preload.js",
    "vault-manager.js",
    "tasklist.html",
    "storage.js",
    "manifest.json",
    "service-worker.js",
    "icon-192.png",
    "icon-512.png",
    "src/**/*"
  ],

  win: {
    target: [{ target: "nsis", arch: ["x64"] }],
    icon: "build/icon.ico"
  },

  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: "Petal"
  }
};
