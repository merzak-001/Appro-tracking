module.exports = {
  apps: [
    {
      name: "procurement-order-tracker",
      script: "dist/server.cjs",
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 3150,
        DB_SERVER: "192.168.1.253",
        DB_NAME: "ProcurementDB",
        DB_USER: "sa",
        DB_PASSWORD: "0000",
        DB_TRUSTED_CONNECTION: "false",
        DB_TRUST_SERVER_CERTIFICATE: "true"
      }
    }
  ]
};
