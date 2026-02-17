module.exports = {
  apps: [{
    name: 'revision',
    script: 'server/index.js',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    max_memory_restart: '150M',
    max_restarts: 10,
    restart_delay: 5000,
    exp_backoff_restart_delay: 100,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    merge_logs: true
  }]
};
