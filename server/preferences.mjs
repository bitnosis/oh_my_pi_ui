import {promises as fs} from 'node:fs';
import {join} from 'node:path';
import {appData} from './storage.mjs';
import {defaultPreferences, mergePreferences, sanitizePreferences} from '../src/lib/preferences-model.js';

const path = join(appData, 'preferences.json');
let current = defaultPreferences();
let chain = Promise.resolve();

function locked(operation) {
  const run = chain.then(operation, operation);
  chain = run.then(() => {}, () => {});
  return run;
}

async function save() {
  await fs.mkdir(appData, {recursive: true});
  const temp = path + '.tmp-' + process.pid;
  await fs.writeFile(temp, JSON.stringify(current));
  await fs.rename(temp, path);
}

export function currentPreferences() {
  return locked(async () => structuredClone(current));
}

export function loadPreferences() {
  return locked(async () => {
    try {
      current = sanitizePreferences(JSON.parse(await fs.readFile(path, 'utf8')));
      if (current.revision < 1) current.revision = 1;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      current = defaultPreferences();
    }
    return structuredClone(current);
  });
}

export function seedPreferences(value) {
  return locked(async () => {
    if (current.revision === 0) {
      current = sanitizePreferences(value);
      current.revision = 1;
      await save();
    }
    return structuredClone(current);
  });
}

export function changePreferences(patch) {
  return locked(async () => {
    current = mergePreferences(current, patch);
    current.revision += 1;
    await save();
    return structuredClone(current);
  });
}
