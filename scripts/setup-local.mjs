#!/usr/bin/env node
import { execSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);

const example = join(root, ".env.example");
const local = join(root, ".env.local");
if (!existsSync(local)) {
  copyFileSync(example, local);
}

function dockerReady() {
  try {
    execSync("docker info", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

if (!dockerReady()) {
  console.error("Docker Desktop tiene que estar en marcha para Supabase local.");
  console.error("Instálalo, ábrelo, espera a que arranque y vuelve a ejecutar: npm run setup:local");
  process.exit(1);
}

console.log("Arrancando Supabase local (primera vez descarga imágenes, tarda unos minutos)...");
execSync("npx supabase start", { stdio: "inherit" });

const envOut = execSync("npx supabase status -o env", { encoding: "utf8" });
const parsed = Object.fromEntries(
  envOut
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const i = line.indexOf("=");
      let value = line.slice(i + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      return [line.slice(0, i), value];
    })
);

const url = parsed.API_URL || parsed.SUPABASE_URL || "http://127.0.0.1:54321";
const anon = parsed.ANON_KEY || parsed.PUBLISHABLE_KEY || parsed.SUPABASE_ANON_KEY;
const service =
  parsed.SERVICE_ROLE_KEY || parsed.SECRET_KEY || parsed.SUPABASE_SERVICE_ROLE_KEY || "";

if (!anon) {
  console.error("No pude leer la anon key. Salida de supabase status:\n", envOut);
  process.exit(1);
}

function upsert(content, key, value) {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  return re.test(content) ? content.replace(re, line) : `${content.trimEnd()}\n${line}\n`;
}

let content = readFileSync(local, "utf8");
content = upsert(content, "NEXT_PUBLIC_SUPABASE_URL", url);
content = upsert(content, "NEXT_PUBLIC_SUPABASE_ANON_KEY", anon);
content = upsert(content, "SUPABASE_SERVICE_ROLE_KEY", service);
content = upsert(content, "NEXT_PUBLIC_APP_URL", "http://localhost:3000");
content = upsert(content, "NEXT_PUBLIC_DEV_LOGIN", "true");
writeFileSync(local, content);

console.log(`\nListo. .env.local apunta a ${url}`);
console.log("Cuentas de prueba (contraseña: crawleros)");
console.log("  Dungeon Master      dm@crawler.local");
console.log("  Crawler 1  crawler1@crawler.local  → unirse con FLOOR-TEST");
console.log("  Crawler 2  crawler2@crawler.local");
console.log("  Mesa TV    http://localhost:3000/table/FLOOR-TEST");
console.log("\nArranca la app: npm run dev");
