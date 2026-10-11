import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";

import ts from "typescript";

export async function findModelTypeViolations(sourceRoot: string): Promise<string[]> {
  const violations: string[] = [];
  for await (const file of new Bun.Glob("**/model/**/*.{ts,tsx}").scan(sourceRoot)) {
    if (file.split(/[\\/]/).includes("__tests__") || /\.(test|spec|typecheck)\./.test(file))
      continue;
    const ast = ts.createSourceFile(
      file,
      readFileSync(resolve(sourceRoot, file), "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    for (const statement of ast.statements) {
      const declaration =
        ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement);
      if (declaration && basename(file) !== "types.ts")
        violations.push(`${file}: model type declared outside types.ts`);
      if (
        basename(file) === "types.ts" &&
        ts.isImportDeclaration(statement) &&
        !statement.importClause?.isTypeOnly
      )
        violations.push(`${file}: types.ts must use import type`);
      if (
        basename(file) === "types.ts" &&
        !declaration &&
        !ts.isImportDeclaration(statement) &&
        !(ts.isExportDeclaration(statement) && statement.isTypeOnly)
      )
        violations.push(`${file}: runtime implementation in types.ts`);
    }
  }
  return violations;
}
