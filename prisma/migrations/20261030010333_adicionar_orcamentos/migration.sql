-- CreateTable
CREATE TABLE "Orcamentos" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "limite" REAL NOT NULL,
    "mes" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" INTEGER NOT NULL,
    "categoriaId" INTEGER NOT NULL,
    CONSTRAINT "Orcamentos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuarios" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Orcamentos_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categorias" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Orcamentos_usuarioId_idx" ON "Orcamentos"("usuarioId");

-- CreateIndex
CREATE INDEX "Orcamentos_categoriaId_idx" ON "Orcamentos"("categoriaId");

-- CreateIndex
CREATE UNIQUE INDEX "Orcamentos_categoriaId_mes_ano_usuarioId_key" ON "Orcamentos"("categoriaId", "mes", "ano", "usuarioId");
