/**
 * Wipe local D1 state, re-apply migrations, and re-seed. Local development only.
 *   npm run db:reset:local
 */
import { execFileSync } from 'node:child_process';
import { rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const d1State = resolve(process.cwd(), '.wrangler', 'state', 'v3', 'd1');
if (existsSync(d1State)) {
  rmSync(d1State, { recursive: true, force: true });
  console.log('Removed local D1 state.');
}

const run = (cmd: string, args: string[]) =>
  execFileSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });

console.log('Applying migrations...');
run('npx', ['wrangler', 'd1', 'migrations', 'apply', 'atlase-db', '--local', '-y']);

console.log('Seeding...');
run('npm', ['run', 'db:seed:local']);

console.log('✅ Local database reset complete.');
