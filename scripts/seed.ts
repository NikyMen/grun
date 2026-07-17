/* Carga inicial: importa los Excel de ejemplo a la base de datos local, todos
   dentro de un mismo bloque.
   Uso: pnpm seed [--bloque "Nombre"] [ruta1.xlsx ruta2.xlsx ...]
        (sin rutas usa los archivos del escritorio) */

import fs from "fs";
import path from "path";
import { importWorkbook } from "../src/lib/importers";
import { createBlock } from "../src/lib/db";

const DEFAULT_FILES = [
  "C:\\Users\\Invitado a usar\\Desktop\\reporte-1-15-06 .xlsx",
  "C:\\Users\\Invitado a usar\\Desktop\\Informe-jun-1-2026-al-jun-29-2026.xlsx",
];

async function main() {
  const args = process.argv.slice(2);
  const flag = args.indexOf("--bloque");
  const blockName = flag >= 0 ? args[flag + 1] || "Carga inicial" : "Carga inicial";
  if (flag >= 0) args.splice(flag, 2);

  const files = args.length ? args : DEFAULT_FILES;
  const blockId = createBlock(blockName);
  console.log(`Bloque: ${blockName}`);

  for (const file of files) {
    if (!fs.existsSync(file)) {
      console.error(`✗ No existe: ${file}`);
      continue;
    }
    const buffer = fs.readFileSync(file);
    const results = await importWorkbook(buffer, path.basename(file), blockId);
    console.log(`\n📄 ${path.basename(file)}`);
    for (const r of results) {
      console.log(`   hoja "${r.sheet}" [${r.kind}]: ${r.inserted} nuevos, ${r.duplicates} duplicados omitidos`);
    }
    if (results.length === 0) console.log("   (sin hojas reconocidas)");
  }
  console.log(`\n✔ Carga terminada en el bloque "${blockName}". Base: data/grun.db`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
