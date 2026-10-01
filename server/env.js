import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Charge le .env à la racine du projet (indépendant du cwd de PM2).
// Les variables déjà définies dans l'environnement restent prioritaires.
const envPath = join(dirname(fileURLToPath(import.meta.url)), '../.env');
if (process.env.NODE_ENV !== 'test' && existsSync(envPath)) {
  process.loadEnvFile(envPath);
}
