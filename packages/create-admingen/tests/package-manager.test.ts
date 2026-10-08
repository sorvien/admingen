import { describe, expect, it } from 'bun:test';

import {
  detectPackageManager,
  getPackageManagerCommands,
  packageManagerFromFlags,
} from '../src/package-manager';
import { getSqliteFiles } from '../src/templates/sqlite';
import { getPostgresFiles } from '../src/templates/postgres';

describe('create-admingen package manager helpers', () => {
  it('detects supported package managers from npm_config_user_agent', () => {
    expect(detectPackageManager('bun/1.3.0 npm/? node/v24.0.0')).toBe('bun');
    expect(detectPackageManager('pnpm/10.18.0 npm/? node/v24.0.0')).toBe('pnpm');
    expect(detectPackageManager('npm/11.6.0 node/v24.0.0 linux x64')).toBe('npm');
    expect(detectPackageManager('yarn/4.10.0 npm/? node/v24.0.0')).toBeUndefined();
    expect(detectPackageManager(undefined)).toBeUndefined();
  });

  it('lets explicit package manager flags override detection', () => {
    expect(packageManagerFromFlags(new Set(['--bun']))).toBe('bun');
    expect(packageManagerFromFlags(new Set(['--pnpm']))).toBe('pnpm');
    expect(packageManagerFromFlags(new Set(['--npm']))).toBe('npm');
    expect(packageManagerFromFlags(new Set())).toBeUndefined();
  });

  it('formats package manager commands correctly', () => {
    expect(getPackageManagerCommands('bun').install).toBe('bun install');
    expect(getPackageManagerCommands('bun').dev).toBe('bun dev');
    expect(getPackageManagerCommands('bun').run('docker:up')).toBe('bun run docker:up');

    expect(getPackageManagerCommands('pnpm').install).toBe('pnpm install');
    expect(getPackageManagerCommands('pnpm').dev).toBe('pnpm dev');
    expect(getPackageManagerCommands('pnpm').run('docker:up')).toBe('pnpm run docker:up');

    expect(getPackageManagerCommands('npm').install).toBe('npm install');
    expect(getPackageManagerCommands('npm').dev).toBe('npm run dev');
    expect(getPackageManagerCommands('npm').run('docker:up')).toBe('npm run docker:up');
  });

  it('writes the selected package manager into generated quick-start instructions', () => {
    const sqliteReadme = getSqliteFiles('demo', false, 'npm')['README.md'];
    expect(sqliteReadme).toContain('npm install');
    expect(sqliteReadme).toContain('npm run dev');

    const postgresReadme = getPostgresFiles('demo', false, 'pnpm')['README.md'];
    expect(postgresReadme).toContain('pnpm run docker:up');
    expect(postgresReadme).toContain('pnpm install');
    expect(postgresReadme).toContain('pnpm dev');
  });
});
