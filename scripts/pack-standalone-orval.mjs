#!/usr/bin/env node
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const orvalDir = path.join(rootDir, 'packages', 'orval');
const stagingDir = path.join(rootDir, '.context', 'orval-standalone-package');

const args = process.argv.slice(2);
const options = {
  outDir: path.join(rootDir, '.context', 'artifacts'),
  skipBuild: false,
  version: undefined,
};

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];

  if (arg === '--out-dir') {
    options.outDir = path.resolve(rootDir, args[++index]);
  } else if (arg === '--version') {
    options.version = args[++index];
  } else if (arg === '--skip-build') {
    options.skipBuild = true;
  } else {
    throw new Error(`Unknown argument: ${arg}`);
  }
}

function run(command, commandArgs, cwd) {
  const result = spawnSync(command, commandArgs, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${commandArgs.join(' ')} failed`);
  }
}

function removeInternalOrvalDependencies(dependencies = {}) {
  return Object.fromEntries(
    Object.entries(dependencies).filter(
      ([name]) => !name.startsWith('@orval/'),
    ),
  );
}

function resolveCatalogDependencies(dependencies = {}, rootPackageJson) {
  return Object.fromEntries(
    Object.entries(dependencies).map(([name, version]) => {
      if (version === 'catalog:' || version === 'catalog:default') {
        return [name, rootPackageJson.catalog?.[name] ?? version];
      }

      if (typeof version === 'string' && version.startsWith('catalog:')) {
        const catalogName = version.slice('catalog:'.length);

        return [
          name,
          rootPackageJson.catalogs?.[catalogName]?.[name] ?? version,
        ];
      }

      return [name, version];
    }),
  );
}

async function patchBundledPackageVersion(distDir, fromVersion, toVersion) {
  if (!toVersion || fromVersion === toVersion) return;

  const files = await readdir(distDir);
  let patched = false;

  for (const file of files) {
    if (!file.endsWith('.mjs')) continue;

    const filePath = path.join(distDir, file);
    const source = await readFile(filePath, 'utf8');
    const nextSource = source.replace(
      `var version = ${JSON.stringify(fromVersion)};`,
      `var version = ${JSON.stringify(toVersion)};`,
    );

    if (nextSource !== source) {
      await writeFile(filePath, nextSource);
      patched = true;
    }
  }

  if (!patched) {
    throw new Error(`Unable to patch bundled Orval version to ${toVersion}`);
  }
}

if (!options.skipBuild) {
  run(
    'bun',
    [
      'run',
      'tsdown',
      '--config',
      'tsdown.standalone.config.ts',
      '--config-loader',
      'unrun',
    ],
    orvalDir,
  );
}

await rm(stagingDir, { force: true, recursive: true });
await mkdir(stagingDir, { recursive: true });
await mkdir(options.outDir, { recursive: true });

const packageJsonPath = path.join(orvalDir, 'package.json');
const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
const rootPackageJson = JSON.parse(
  await readFile(path.join(rootDir, 'package.json'), 'utf8'),
);
const originalVersion = packageJson.version;

packageJson.version = options.version ?? packageJson.version;
packageJson.bin = {
  orval: './dist/bin/orval.mjs',
};
packageJson.exports = {
  '.': {
    types: './dist/index.d.mts',
    default: './dist/index.mjs',
  },
  './bin/orval': './dist/bin/orval.mjs',
  './package.json': './package.json',
};
packageJson.dependencies = resolveCatalogDependencies(
  removeInternalOrvalDependencies(packageJson.dependencies),
  rootPackageJson,
);
delete packageJson.devDependencies;
delete packageJson.publishConfig;
delete packageJson.scripts;

await writeFile(
  path.join(stagingDir, 'package.json'),
  `${JSON.stringify(packageJson, null, 2)}\n`,
);
await cp(path.join(orvalDir, 'README.md'), path.join(stagingDir, 'README.md'));
await cp(path.join(orvalDir, 'dist'), path.join(stagingDir, 'dist'), {
  recursive: true,
});
await patchBundledPackageVersion(
  path.join(stagingDir, 'dist'),
  originalVersion,
  options.version,
);
await cp(
  path.join(rootDir, 'packages', 'hono', 'src', 'zValidator.ts'),
  path.join(stagingDir, 'dist', 'zValidator.ts'),
);

const fileName = `orval-${packageJson.version}.standalone.tgz`;
const outputPath = path.join(options.outDir, fileName);
run(
  'bun',
  ['pm', 'pack', '--ignore-scripts', '--filename', outputPath],
  stagingDir,
);

console.log(outputPath);
