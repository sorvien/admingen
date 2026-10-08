#!/usr/bin/env node

import { intro, outro, text, select, confirm, spinner, isCancel, cancel } from '@clack/prompts';
import pc from 'picocolors';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { getSqliteFiles } from './templates/sqlite';
import { getPostgresFiles } from './templates/postgres';
import {
  detectPackageManager,
  getPackageManagerCommands,
  packageManagerFromFlags,
  type PackageManager,
} from './package-manager';

async function main() {
  const rawArgs = process.argv.slice(2);
  const flags = new Set(rawArgs.filter((arg) => arg.startsWith('-')));
  const nonFlagArgs = rawArgs.filter((arg) => !arg.startsWith('-'));

  const isNonInteractive = flags.has('-y') || flags.has('--yes') || flags.has('--sqlite') || flags.has('--postgres');
  const packageManagerFlag = packageManagerFromFlags(flags);
  const detectedPackageManager = detectPackageManager(process.env.npm_config_user_agent);
  let packageManager: PackageManager | undefined = packageManagerFlag ?? detectedPackageManager;
  let targetDir = nonFlagArgs[0];

  if (!isNonInteractive) {
    console.log();
    intro(pc.bgCyan(pc.black(' create-admingen ')));
  }

  // 1. Target Directory / Project Name
  if (!targetDir) {
    if (isNonInteractive) {
      targetDir = 'my-admin';
    } else {
      const nameInput = await text({
        message: 'Where should we create your AdminGen project?',
        placeholder: './my-admin',
        defaultValue: 'my-admin',
        validate(value) {
          if (!value || !value.trim()) return 'Project name cannot be empty';
        },
      });

      if (isCancel(nameInput)) {
        cancel('Operation cancelled.');
        process.exit(0);
      }
      targetDir = nameInput as string;
    }
  }

  const projectPath = resolve(process.cwd(), targetDir);
  const projectName = targetDir.replace(/^\.\//, '').replace(/\/$/, '').split('/').pop() || 'my-admin';

  if (existsSync(projectPath) && !isNonInteractive) {
    const overwrite = await confirm({
      message: `Directory "${targetDir}" already exists. Continue anyway?`,
      initialValue: false,
    });

    if (isCancel(overwrite) || !overwrite) {
      cancel('Operation cancelled.');
      process.exit(0);
    }
  }

  // 2. Select Database
  let database = 'sqlite';
  if (flags.has('--postgres')) {
    database = 'postgres';
  } else if (flags.has('--sqlite')) {
    database = 'sqlite';
  } else if (!isNonInteractive) {
    const dbChoice = await select({
      message: 'Select your database engine:',
      options: [
        {
          value: 'sqlite',
          label: 'SQLite (Recommended)',
          hint: 'Runs in-memory or single file via bun:sqlite. Zero setup.',
        },
        {
          value: 'postgres',
          label: 'PostgreSQL',
          hint: 'Full relational database with Docker Compose included.',
        },
      ],
    });

    if (isCancel(dbChoice)) {
      cancel('Operation cancelled.');
      process.exit(0);
    }
    database = dbChoice as string;
  }

  // 3. Select Package Manager
  if (!packageManagerFlag && !isNonInteractive) {
    const packageManagerChoice = await select({
      message: 'Select your package manager:',
      initialValue: packageManager ?? 'bun',
      options: [
        { value: 'bun', label: 'Bun (Recommended)' },
        { value: 'pnpm', label: 'pnpm' },
        { value: 'npm', label: 'npm' },
      ],
    });

    if (isCancel(packageManagerChoice)) {
      cancel('Operation cancelled.');
      process.exit(0);
    }
    packageManager = packageManagerChoice as PackageManager;
  }

  packageManager ??= 'bun';
  const packageCommands = getPackageManagerCommands(packageManager);

  // 4. Demo Data
  let includeSeed = !flags.has('--no-seed');
  if (database === 'sqlite' && !isNonInteractive && !flags.has('--seed')) {
    const seedChoice = await confirm({
      message: 'Include pre-seeded demo data (teams, users, posts)?',
      initialValue: true,
    });

    if (isCancel(seedChoice)) {
      cancel('Operation cancelled.');
      process.exit(0);
    }
    includeSeed = seedChoice;
  }

  // 5. Scaffold Files
  const s = spinner();
  s.start(`Scaffolding project in ${pc.cyan(targetDir)}...`);

  const files = database === 'sqlite'
    ? getSqliteFiles(projectName, includeSeed, packageManager)
    : getPostgresFiles(projectName, includeSeed, packageManager);

  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = join(projectPath, relativePath);
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(filePath, content, 'utf-8');
  }

  s.stop(`Project scaffolded successfully!`);

  // 6. Next Steps
  const nextSteps = [
    `cd ${targetDir}`,
    database === 'postgres' ? `${packageCommands.run('docker:up')}  ${pc.dim('# start local postgres')}` : null,
    packageCommands.install,
    packageCommands.dev,
  ].filter(Boolean);

  console.log();
  console.log(pc.bold('Next steps:'));
  nextSteps.forEach((step, i) => {
    console.log(`  ${pc.cyan(`${i + 1}.`)} ${step}`);
  });

  console.log();
  console.log(pc.dim('──────────────────────────────────────────────────'));
  console.log(`⚡ ${pc.bold('Admin Panel:')} ${pc.green('http://localhost:3000/admin')}`);
  console.log(`🔑 ${pc.bold('Demo Login:')}  ${pc.yellow('admin')} / ${pc.yellow('admin')}`);
  console.log(pc.dim('──────────────────────────────────────────────────'));

  console.log();
  if (!isNonInteractive) {
    outro(pc.green('Happy building with AdminGen! 🚀'));
  } else {
    console.log(pc.green('✔ Happy building with AdminGen! 🚀\n'));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
