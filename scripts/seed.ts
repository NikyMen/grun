/* Carga inicial: importa los Excel de ejemplo a la base de datos local.
   Uso: pnpm seed [ruta1.xlsx ruta2.xlsx ...]  (sin argumentos usa los del escritorio) */

import fs from "fs";
import path from "path";
import { importWorkbook } from "../src/lib/importers";

const DEFAULT_FILES = [
  "C:\\Users\\Invitado a usar\\Desktop\\reporte-1-15-06 .xlsx",
  "C:\\Users\\Invitado a usar\\Desktop\\Informe-jun-1-2026-al-jun-29-2026.xlsx",
];

async function main() {
  const files = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_FILES;
  for (const file of files) {
    if (!fs.existsSync(file)) {
      console.error(`✗ No existe: ${file}`);
      continue;
    }
    const buffer = fs.readFileSync(file);
    const results = await importWorkbook(buffer, path.basename(file));
    console.log(`\n📄 ${path.basename(file)}`);
    for (const r of results) {
      console.log(`   hoja "${r.sheet}" [${r.kind}]: ${r.inserted} nuevos, ${r.duplicates} duplicados omitidos`);
    }
    if (results.length === 0) console.log("   (sin hojas reconocidas)");
  }
  console.log("\n✔ Carga inicial terminada. Base: data/grun.db");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
