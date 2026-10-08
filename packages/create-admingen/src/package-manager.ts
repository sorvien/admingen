export type PackageManager = 'bun' | 'pnpm' | 'npm';

export function detectPackageManager(userAgent: string | undefined): PackageManager | undefined {
  const name = userAgent?.trim().split(/\s+/, 1)[0]?.split('/', 1)[0];
  if (name === 'bun' || name === 'pnpm' || name === 'npm') {
    return name;
  }
  return undefined;
}

export function packageManagerFromFlags(flags: Set<string>): PackageManager | undefined {
  if (flags.has('--bun')) return 'bun';
  if (flags.has('--pnpm')) return 'pnpm';
  if (flags.has('--npm')) return 'npm';
  return undefined;
}

export function getPackageManagerCommands(packageManager: PackageManager) {
  if (packageManager === 'npm') {
    return {
      install: 'npm install',
      dev: 'npm run dev',
      run: (script: string) => `npm run ${script}`,
    };
  }

  if (packageManager === 'pnpm') {
    return {
      install: 'pnpm install',
      dev: 'pnpm dev',
      run: (script: string) => `pnpm run ${script}`,
    };
  }

  return {
    install: 'bun install',
    dev: 'bun dev',
    run: (script: string) => `bun run ${script}`,
  };
}
