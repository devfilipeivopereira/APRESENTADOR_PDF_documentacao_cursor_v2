/**
 * PM2: pm2 start ecosystem.config.cjs
 * Na VPS: cd /var/www/slides-app && pm2 start ecosystem.config.cjs
 */
module.exports = {
  apps: [
    {
      name: 'slides',
      script: 'server.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
