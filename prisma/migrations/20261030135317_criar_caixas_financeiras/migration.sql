-- CreateTable
CREATE TABLE "Caixas" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "limiteMensal" REAL,
    "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" INTEGER NOT NULL,
    CONSTRAINT "Caixas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuarios" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MovimentacoesCaixas" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tipo" TEXT NOT NULL,
    "valor" REAL NOT NULL,
    "descricao" TEXT,
    "data" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" INTEGER NOT NULL,
    "caixaId" INTEGER NOT NULL,
    CONSTRAINT "MovimentacoesCaixas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuarios" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MovimentacoesCaixas_caixaId_fkey" FOREIGN KEY ("caixaId") REFERENCES "Caixas" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Categorias" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" INTEGER NOT NULL,
    "caixaId" INTEGER,
    CONSTRAINT "Categorias_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuarios" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Categorias_caixaId_fkey" FOREIGN KEY ("caixaId") REFERENCES "Caixas" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Categorias" ("criado_em", "id", "nome", "tipo", "usuarioId") SELECT "criado_em", "id", "nome", "tipo", "usuarioId" FROM "Categorias";
DROP TABLE "Categorias";
ALTER TABLE "new_Categorias" RENAME TO "Categorias";
CREATE INDEX "Categorias_usuarioId_idx" ON "Categorias"("usuarioId");
CREATE INDEX "Categorias_caixaId_idx" ON "Categorias"("caixaId");
CREATE UNIQUE INDEX "Categorias_nome_tipo_usuarioId_key" ON "Categorias"("nome", "tipo", "usuarioId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Caixas_usuarioId_idx" ON "Caixas"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Caixas_nome_usuarioId_key" ON "Caixas"("nome", "usuarioId");

-- CreateIndex
CREATE INDEX "MovimentacoesCaixas_usuarioId_idx" ON "MovimentacoesCaixas"("usuarioId");

-- CreateIndex
CREATE INDEX "MovimentacoesCaixas_caixaId_idx" ON "MovimentacoesCaixas"("caixaId");
