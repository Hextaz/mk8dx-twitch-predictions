import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, cpSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';

const root = resolve('.');
const pluginSrc = join(root, 'touchportal-plugin');
const tempDir = join(root, '.temp-tpp');
const targetPluginDir = join(tempDir, 'MK8DX_Predictions');
const outputFile = join(root, 'MK8DX_Predictions.tpp');

console.log('[TPP Builder] Préparation du plugin Touch Portal...');

if (existsSync(tempDir)) {
  rmSync(tempDir, { recursive: true, force: true });
}
mkdirSync(targetPluginDir, { recursive: true });

// Copie des fichiers requis
cpSync(join(pluginSrc, 'entry.tp'), join(targetPluginDir, 'entry.tp'));
cpSync(join(pluginSrc, 'index.js'), join(targetPluginDir, 'index.js'));
cpSync(join(pluginSrc, 'package.json'), join(targetPluginDir, 'package.json'));

if (existsSync(outputFile)) {
  rmSync(outputFile);
}

try {
  // Création du fichier .tpp (archive zip)
  execSync(`cd "${tempDir}" && zip -r "${outputFile}" MK8DX_Predictions/`, { stdio: 'inherit' });
  console.log(`\n✓ Plugin Touch Portal généré avec succès : ${outputFile}`);
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
