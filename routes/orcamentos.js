const express = require('express')
const prisma = require('../lib/prisma')

const router = express.Router()

function autenticar(req, res, next) {
    if (!req.session || !req.session.usuarioId) {
        return res.status(401).json({
            mensagem: 'Você precisa entrar na sua conta.'
        })
    }
    next()
}

function validarId(valor) {
    return /^\d+$/.test(String(valor)) &&
        Number.isSafeInteger(Number(valor)) &&
        Number(valor) > 0
}

function validarDados(body) {
    const limite = Number(body.limite)
    const categoriaId = Number(body.categoriaId)
    const mes = Number(body.mes)
    const ano = Number(body.ano)

    if (
        body.limite === undefined || body.limite === null ||
        String(body.limite).trim() === '' ||
        !Number.isFinite(limite) || limite <= 0 ||
        !Number.isSafeInteger(categoriaId) || categoriaId <= 0 ||
        !Number.isInteger(mes) || mes < 1 || mes > 12 ||
        !Number.isInteger(ano) || ano < 2000 || ano > 2100
    ) {
        return { erro: 'Informe uma categoria, um limite positivo e um mês/ano válidos.' }
    }

    return { limite, categoriaId, mes, ano }
}

async function buscarCategoriaDespesa(categoriaId, usuarioId) {
    return prisma.categorias.findFirst({
        where: {
            id: categoriaId,
            usuarioId,
            tipo: 'despesa'
        }
    })
}

function intervaloMes(mes, ano) {
    return {
        inicio: new Date(Date.UTC(ano, mes - 1, 1, 0, 0, 0)),
        fim: new Date(Date.UTC(ano, mes, 1, 0, 0, 0))
    }
}

async function adicionarGastos(orcamento, usuarioId) {
    const { inicio, fim } = intervaloMes(orcamento.mes, orcamento.ano)

    const resultado = await prisma.movimentacoes.aggregate({
        where: {
            usuarioId,
            categoriaId: orcamento.categoriaId,
            tipo: 'despesa',
            data: { gte: inicio, lt: fim }
        },
        _sum: { valor: true }
    })

    const gasto = resultado._sum.valor || 0
    const restante = orcamento.limite - gasto

    return {
        ...orcamento,
        gasto,
        restante,
        percentual: Math.min((gasto / orcamento.limite) * 100, 100),
        ultrapassou: gasto > orcamento.limite
    }
}

router.use(autenticar)

// Criar orçamento
router.post('/', async (req, res) => {
    try {
        const dados = validarDados(req.body)
        if (dados.erro) return res.status(400).json({ mensagem: dados.erro })

        const usuarioId = req.session.usuarioId
        const categoria = await buscarCategoriaDespesa(dados.categoriaId, usuarioId)

        if (!categoria) {
            return res.status(400).json({
                mensagem: 'Selecione uma categoria de despesa pertencente à sua conta.'
            })
        }

        const existente = await prisma.orcamentos.findFirst({
            where: {
                usuarioId,
                categoriaId: dados.categoriaId,
                mes: dados.mes,
                ano: dados.ano
            }
        })

        if (existente) {
            return res.status(409).json({
                mensagem: 'Já existe um orçamento para essa categoria nesse mês.'
            })
        }

        const criado = await prisma.orcamentos.create({
            data: { ...dados, usuarioId },
            include: { categoria: true }
        })

        return res.status(201).json(await adicionarGastos(criado, usuarioId))
    } catch (erro) {
        console.error('Erro ao cadastrar orçamento:', erro)
        return res.status(500).json({ mensagem: 'Erro ao cadastrar orçamento.' })
    }
})

// Listar orçamentos do usuário
router.get('/', async (req, res) => {
    try {
        const usuarioId = req.session.usuarioId
        const orcamentos = await prisma.orcamentos.findMany({
            where: { usuarioId },
            include: { categoria: true },
            orderBy: [{ ano: 'desc' }, { mes: 'desc' }, { criado_em: 'desc' }]
        })

        const completos = await Promise.all(
            orcamentos.map(item => adicionarGastos(item, usuarioId))
        )
        return res.json(completos)
    } catch (erro) {
        console.error('Erro ao listar orçamentos:', erro)
        return res.status(500).json({ mensagem: 'Erro ao listar orçamentos.' })
    }
})

// Consultar orçamento
router.get('/:id', async (req, res) => {
    try {
        if (!validarId(req.params.id)) {
            return res.status(400).json({ mensagem: 'ID inválido.' })
        }

        const usuarioId = req.session.usuarioId
        const orcamento = await prisma.orcamentos.findFirst({
            where: { id: Number(req.params.id), usuarioId },
            include: { categoria: true }
        })

        if (!orcamento) {
            return res.status(404).json({ mensagem: 'Orçamento não encontrado.' })
        }

        return res.json(await adicionarGastos(orcamento, usuarioId))
    } catch (erro) {
        console.error('Erro ao consultar orçamento:', erro)
        return res.status(500).json({ mensagem: 'Erro ao consultar orçamento.' })
    }
})

// Editar orçamento
router.put('/:id', async (req, res) => {
    try {
        if (!validarId(req.params.id)) {
            return res.status(400).json({ mensagem: 'ID inválido.' })
        }

        const dados = validarDados(req.body)
        if (dados.erro) return res.status(400).json({ mensagem: dados.erro })

        const id = Number(req.params.id)
        const usuarioId = req.session.usuarioId
        const existente = await prisma.orcamentos.findFirst({
            where: { id, usuarioId }
        })

        if (!existente) {
            return res.status(404).json({ mensagem: 'Orçamento não encontrado.' })
        }

        const categoria = await buscarCategoriaDespesa(dados.categoriaId, usuarioId)
        if (!categoria) {
            return res.status(400).json({
                mensagem: 'Selecione uma categoria de despesa pertencente à sua conta.'
            })
        }

        const duplicado = await prisma.orcamentos.findFirst({
            where: {
                usuarioId,
                categoriaId: dados.categoriaId,
                mes: dados.mes,
                ano: dados.ano,
                NOT: { id }
            }
        })

        if (duplicado) {
            return res.status(409).json({
                mensagem: 'Já existe outro orçamento para essa categoria nesse mês.'
            })
        }

        const atualizado = await prisma.orcamentos.update({
            where: { id },
            data: dados,
            include: { categoria: true }
        })

        return res.json(await adicionarGastos(atualizado, usuarioId))
    } catch (erro) {
        console.error('Erro ao editar orçamento:', erro)
        return res.status(500).json({ mensagem: 'Erro ao editar orçamento.' })
    }
})

// Excluir orçamento
router.delete('/:id', async (req, res) => {
    try {
        if (!validarId(req.params.id)) {
            return res.status(400).json({ mensagem: 'ID inválido.' })
        }

        const resultado = await prisma.orcamentos.deleteMany({
            where: {
                id: Number(req.params.id),
                usuarioId: req.session.usuarioId
            }
        })

        if (resultado.count === 0) {
            return res.status(404).json({ mensagem: 'Orçamento não encontrado.' })
        }

        return res.json({ mensagem: 'Orçamento excluído com sucesso.' })
    } catch (erro) {
        console.error('Erro ao excluir orçamento:', erro)
        return res.status(500).json({ mensagem: 'Erro ao excluir orçamento.' })
    }
})

module.exports = router
