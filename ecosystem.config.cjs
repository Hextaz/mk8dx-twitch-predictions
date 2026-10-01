module.exports = {
  apps: [
    {
      name: 'mk8-predictions',
      script: 'server/index.js',
      cwd: __dirname,
      exec_mode: 'fork',
      autorestart: true,
      time: true,
      watch: false,
      // Node vide ≈ 40 Mo RSS, l'appli ≈ 70-75 Mo : le heap V8 est bridé à 48 Mo,
      // la marge RSS évite une boucle de redémarrage PM2 en plein stream.
      max_memory_restart: '120M',
      node_args: '--max-old-space-size=48 --optimize-for-size',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
