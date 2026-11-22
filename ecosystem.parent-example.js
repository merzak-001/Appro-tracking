// ============================================================================
// PM2 ECOSYSTEM CONFIGURATION FOR PARENT DIRECTORY CONTAINING MULTIPLE APPS
// Place this file in your root folder that contains all your app folders (e.g. C:\Apps\ecosystem.config.js)
// Start all apps with command: pm2 start ecosystem.config.js
// ============================================================================

module.exports = {
  apps: [
    {
      name: "procurement-order-tracker",
      cwd: "./Procurement-Order-Tracker", // Folder name of this app inside your parent directory
      script: "dist/server.cjs", // Production bundled server
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: 3150,
        DB_SERVER: "192.168.1.253",
        DB_USER: "sa",
        DB_PASSWORD: "0000",
        DB_NAME: "ProcurementDB",
        DB_TRUSTED_CONNECTION: "false",
        DB_TRUST_SERVER_CERTIFICATE: "true",
      },
    },
    {
      name: "second-app",
      cwd: "./second-app-folder", // Folder name of another app
      script: "dist/server.cjs",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: 3001, // Different port for App 2
        DB_SERVER: "localhost\\SQLEXPRESS",
        DB_USER: "sa",
        DB_PASSWORD: "YourPassword123!",
        DB_NAME: "SecondAppDB",
        DB_PORT: "1433",
        DB_TRUST_SERVER_CERTIFICATE: "true",
      },
    },
  ],
};
