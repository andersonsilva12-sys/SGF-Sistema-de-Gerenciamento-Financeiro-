-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Movimentacoes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "descricao" TEXT NOT NULL,
    "valor" REAL NOT NULL,
    "tipo" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "data" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" INTEGER NOT NULL,
    "categoriaId" INTEGER,
    CONSTRAINT "Movimentacoes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuarios" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Movimentacoes_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categorias" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Movimentacoes" ("categoria", "criado_em", "data", "descricao", "id", "tipo", "usuarioId", "valor") SELECT "categoria", "criado_em", "data", "descricao", "id", "tipo", "usuarioId", "valor" FROM "Movimentacoes";
DROP TABLE "Movimentacoes";
ALTER TABLE "new_Movimentacoes" RENAME TO "Movimentacoes";
CREATE INDEX "Movimentacoes_usuarioId_idx" ON "Movimentacoes"("usuarioId");
CREATE INDEX "Movimentacoes_categoriaId_idx" ON "Movimentacoes"("categoriaId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
