import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = resolve(rootDir, "assets");
const targetDir = resolve(rootDir, "src-tauri", "assets");
const checkOnly = process.argv.includes("--check");

function assertInsideRoot(path) {
  const relativePath = relative(rootDir, path);
  if (relativePath.startsWith("..") || relativePath === "" || resolve(path) === rootDir) {
    throw new Error(`Unsafe path: ${path}`);
  }
}

function listFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

function collect(dir) {
  if (!existsSync(dir)) {
    return new Map();
  }

  return new Map(
    listFiles(dir).map((file) => [
      relative(dir, file).replaceAll("\\", "/"),
      readFileSync(file),
    ]),
  );
}

function compareAssets() {
  const source = collect(sourceDir);
  const target = collect(targetDir);
  const names = new Set([...source.keys(), ...target.keys()]);
  const differences = [];

  for (const name of [...names].sort()) {
    const sourceFile = source.get(name);
    const targetFile = target.get(name);
    if (!sourceFile) {
      differences.push(`target-only ${name}`);
    } else if (!targetFile) {
      differences.push(`missing ${name}`);
    } else if (!sourceFile.equals(targetFile)) {
      differences.push(`changed ${name}`);
    }
  }

  return differences;
}

function copyDir(from, to) {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    const sourcePath = join(from, entry.name);
    const targetPath = join(to, entry.name);
    if (entry.isDirectory()) {
      copyDir(sourcePath, targetPath);
    } else if (entry.isFile()) {
      mkdirSync(dirname(targetPath), { recursive: true });
      writeFileSync(targetPath, readFileSync(sourcePath));
    }
  }
}

assertInsideRoot(sourceDir);
assertInsideRoot(targetDir);

if (!existsSync(sourceDir) || !statSync(sourceDir).isDirectory()) {
  throw new Error(`Missing source assets directory: ${sourceDir}`);
}

const differences = compareAssets();

if (checkOnly) {
  if (differences.length > 0) {
    console.error(`Assets are not synchronized:\n${differences.join("\n")}`);
    process.exit(1);
  }
  console.log("Assets are synchronized.");
  process.exit(0);
}

if (differences.length === 0) {
  console.log("Assets are already synchronized.");
  process.exit(0);
}

rmSync(targetDir, { recursive: true, force: true });
copyDir(sourceDir, targetDir);
console.log(`Synchronized ${differences.length} asset difference(s).`);
