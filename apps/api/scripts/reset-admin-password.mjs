import Database from 'better-sqlite3';
import { existsSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { stdin, stdout } from 'node:process';
import { hashPassword } from '../dist/auth/auth.service.js';

const databasePath = process.env.DATABASE_PATH ?? './.data/gallery.db';

if (!existsSync(databasePath)) {
  console.error(`Database does not exist: ${databasePath}`);
  process.exit(1);
}

const confirmation = await ask('Type RESET to change the administrator password: ');
if (confirmation !== 'RESET') {
  console.error('Password reset cancelled.');
  process.exit(1);
}

const password = await askSecret('New administrator password: ');
const confirmationPassword = await askSecret('Repeat new administrator password: ');
if (password.length < 12 || password.length > 256 || password !== confirmationPassword) {
  console.error('Passwords must match and be between 12 and 256 characters.');
  process.exit(1);
}

const database = new Database(databasePath);
try {
  const administrator = database.prepare('SELECT id FROM administrators LIMIT 1').get();
  if (!administrator) {
    console.error('No administrator exists. Use the armed first-run setup instead.');
    process.exitCode = 1;
  } else {
    const passwordHash = await hashPassword(password);
    const now = new Date().toISOString();
    const reset = database.transaction(() => {
      database
        .prepare('UPDATE administrators SET password_hash = ?, updated_at = ?')
        .run(passwordHash, now);
      database.prepare('UPDATE sessions SET revoked_at = ? WHERE revoked_at IS NULL').run(now);
    });
    reset();
    console.log('Administrator password changed; all existing sessions were revoked.');
  }
} finally {
  database.close();
}

function ask(prompt) {
  const readline = createInterface({ input: stdin, output: stdout });
  return new Promise((resolve) => {
    readline.question(prompt, (answer) => {
      readline.close();
      resolve(answer);
    });
  });
}

function askSecret(prompt) {
  if (!stdin.isTTY || !stdin.setRawMode) {
    return ask(prompt);
  }

  stdout.write(prompt);
  stdin.setRawMode(true);
  stdin.resume();

  return new Promise((resolve) => {
    let value = '';
    const onData = (chunk) => {
      const input = chunk.toString();
      if (input === '\u0003') {
        stdin.setRawMode(false);
        stdin.off('data', onData);
        stdout.write('\n');
        process.exit(130);
      }
      if (input === '\r' || input === '\n') {
        stdin.setRawMode(false);
        stdin.off('data', onData);
        stdout.write('\n');
        resolve(value);
        return;
      }
      if (input === '\u007f') {
        value = value.slice(0, -1);
        return;
      }
      value += input;
    };

    stdin.on('data', onData);
  });
}
