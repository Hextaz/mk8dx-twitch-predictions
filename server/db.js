import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR || join(__dirname, '../data');

if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const dbPath = join(dataDir, 'predictions.db');
const db = new DatabaseSync(dbPath);

// Configuration mémoire sobre pour Lordi (Intel Celeron, 4 Go RAM)
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA synchronous = NORMAL;');
db.exec('PRAGMA cache_size = -2000;'); // Limite le cache SQLite à ~2 Mo

// Schémas des tables
db.exec(`
  CREATE TABLE IF NOT EXISTS app_config (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    is_default INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS prediction_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    twitch_id TEXT,
    title TEXT NOT NULL,
    status TEXT NOT NULL,
    winning_outcome_title TEXT,
    winning_outcome_id TEXT,
    total_points INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME
  );
`);

// Helpers pour la table de configuration
export function getConfig(key, defaultValue = null) {
  const row = db.prepare('SELECT value FROM app_config WHERE key = ?').get(key);
  return row ? row.value : defaultValue;
}

export function getAllConfig() {
  const rows = db.prepare('SELECT key, value FROM app_config').all();
  const conf = {};
  for (const r of rows) {
    conf[r.key] = r.value;
  }
  return conf;
}

export function setConfig(key, value) {
  db.prepare(`
    INSERT INTO app_config (key, value, updated_at) 
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `).run(key, value !== undefined && value !== null ? String(value) : '');
}

export function setMultipleConfig(obj) {
  const stmt = db.prepare(`
    INSERT INTO app_config (key, value, updated_at) 
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `);
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      stmt.run(key, String(value));
    }
  }
}

// Helpers pour les joueurs
export function getPlayers() {
  return db.prepare('SELECT * FROM players ORDER BY is_default DESC, name ASC').all();
}

export function addPlayer(name, isDefault = 0) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Le pseudo ne peut pas être vide');
  if (isDefault) {
    db.prepare('UPDATE players SET is_default = 0').run();
  }
  const stmt = db.prepare(`
    INSERT INTO players (name, is_default)
    VALUES (?, ?)
    ON CONFLICT(name) DO UPDATE SET is_default = excluded.is_default
  `);
  stmt.run(trimmed, isDefault ? 1 : 0);
  return getPlayers();
}

export function removePlayer(name) {
  db.prepare('DELETE FROM players WHERE name = ?').run(name);
  return getPlayers();
}

export function setDefaultPlayer(name) {
  db.prepare('UPDATE players SET is_default = 0').run();
  db.prepare('UPDATE players SET is_default = 1 WHERE name = ?').run(name);
  return getPlayers();
}

// Helpers pour l'historique
export function logPrediction(prediction) {
  const stmt = db.prepare(`
    INSERT INTO prediction_history (twitch_id, title, status, total_points)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(prediction.id, prediction.title, prediction.status, 0);
}

export function updatePredictionLog(twitchId, { status, winning_outcome_title, winning_outcome_id, total_points }) {
  const stmt = db.prepare(`
    UPDATE prediction_history 
    SET status = ?, winning_outcome_title = ?, winning_outcome_id = ?, total_points = ?, resolved_at = CURRENT_TIMESTAMP
    WHERE twitch_id = ?
  `);
  stmt.run(status, winning_outcome_title || null, winning_outcome_id || null, total_points || 0, twitchId);
}

export function getHistory(limit = 10) {
  return db.prepare('SELECT * FROM prediction_history ORDER BY id DESC LIMIT ?').all(limit);
}

// Initialisation de valeurs par défaut si vide
const existingPlayers = db.prepare('SELECT COUNT(*) as count FROM players').get();
if (existingPlayers.count === 0) {
  addPlayer('Nolhan', 1);
  addPlayer('Adversaire', 0);
}

export default db;
