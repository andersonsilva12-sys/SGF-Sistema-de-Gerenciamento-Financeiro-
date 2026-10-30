const express = require('express')
const prisma = require('../lib/prisma')

const router = express.Router()

const tiposValidos = ['despesa', 'reserva']

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
    const nome = typeof body.nome === 'string' ? body.nome.trim() : ''
    const tipo = typeof body.tipo === 'string' ? body.tipo.trim().toLowerCase() : ''
    const limiteMensal = body.limiteMensal === '' || body.limiteMensal === null
        ? null
        : Number(body.limiteMensal)

    if (!nome || nome.length > 100) {
        return { erro: 'Informe um nome de até 100 caracteres.' }
    }

    if (!tiposValidos.includes(tipo)) {
        return { erro: 'Tipo de caixa inválido.' }
    }

    if (tipo === 'despesa') {
        if (
            limiteMensal === null ||
            !Number.isFinite(limiteMensal) ||
            limiteMensal <= 0
        ) {
            return { erro: 'Informe um limite mensal positivo.' }
        }
    }

    return {
        nome,
        tipo,
        limiteMensal: tipo === 'despesa' ? limiteMensal : null
    }
}

async function calcularCaixa(caixa, usuarioId) {
    const agora = new Date()

    const inicio = new Date(Date.UTC(
        agora.getFullYear(),
        agora.getMonth(),
        1
    ))

    const fim = new Date(Date.UTC(
        agora.getFullYear(),
        agora.getMonth() + 1,
        1
    ))

    if (caixa.tipo === 'despesa') {
        const resultado = await prisma.movimentacoes.aggregate({
            where: {
                usuarioId,
                categoriaId: {
                    in: caixa.categorias.map(categoria => categoria.id)
                },
                tipo: 'despesa',
                data: {
                    gte: inicio,
                    lt: fim
                }
            },
            _sum: {
                valor: true
            }
        })

        const gasto = resultado._sum.valor || 0

        return {
            ...caixa,
            gasto,
            restante: caixa.limiteMensal - gasto,
            percentual: Math.min(
                (gasto / caixa.limiteMensal) * 100,
                100
            ),
            ultrapassou: gasto > caixa.limiteMensal
        }
    }

    const depositos = await prisma.movimentacoesCaixas.aggregate({
        where: {
            usuarioId,
            caixaId: caixa.id,
            tipo: 'deposito'
        },
        _sum: {
            valor: true
        }
    })

    const retiradas = await prisma.movimentacoesCaixas.aggregate({
        where: {
            usuarioId,
            caixaId: caixa.id,
            tipo: 'retirada'
        },
        _sum: {
            valor: true
        }
    })

    const totalDepositado = depositos._sum.valor || 0
    const totalRetirado = retiradas._sum.valor || 0

    const saldo = Number(
        (totalDepositado - totalRetirado).toFixed(2)
    )

    return {
        ...caixa,
        saldo,
        totalDepositado,
        totalRetirado
    }
}

// Cadastrar caixa
router.post('/', async (req, res) => {
    try {
        const dados = validarDados(req.body)

        if (dados.erro) {
            return res.status(400).json({ mensagem: dados.erro })
        }

        const existente = await prisma.caixas.findFirst({
            where: {
                nome: dados.nome,
                usuarioId: req.session.usuarioId
            }
        })

        if (existente) {
            return res.status(409).json({
                mensagem: 'Você já possui uma caixa com esse nome.'
            })
        }

        const caixa = await prisma.caixas.create({
            data: {
                ...dados,
                usuarioId: req.session.usuarioId
            },
            include: {
                categorias: true
            }
        })

        return res.status(201).json(await calcularCaixa(
            caixa,
            req.session.usuarioId
        ))
    } catch (erro) {
        console.error('Erro ao cadastrar caixa:', erro)
        return res.status(500).json({
            mensagem: 'Erro ao cadastrar caixa.'
        })
    }
})

// Listar caixas
router.get('/', async (req, res) => {
    try {
        const usuarioId = req.session.usuarioId

        const caixas = await prisma.caixas.findMany({
            where: { usuarioId },
            include: {
                categorias: true
            },
            orderBy: {
                criado_em: 'desc'
            }
        })

        const resultado = await Promise.all(
            caixas.map(caixa => calcularCaixa(caixa, usuarioId))
        )

        return res.json(resultado)
    } catch (erro) {
        console.error('Erro ao listar caixas:', erro)
        return res.status(500).json({
            mensagem: 'Erro ao listar caixas.'
        })
    }
})

// Consultar caixa
router.get('/:id', async (req, res) => {
    try {
        if (!validarId(req.params.id)) {
            return res.status(400).json({ mensagem: 'ID inválido.' })
        }

        const caixa = await prisma.caixas.findFirst({
            where: {
                id: Number(req.params.id),
                usuarioId: req.session.usuarioId
            },
            include: {
                categorias: true
            }
        })

        if (!caixa) {
            return res.status(404).json({
                mensagem: 'Caixa não encontrada.'
            })
        }

        return res.json(await calcularCaixa(
            caixa,
            req.session.usuarioId
        ))
    } catch (erro) {
        console.error('Erro ao consultar caixa:', erro)
        return res.status(500).json({
            mensagem: 'Erro ao consultar caixa.'
        })
    }
})

// Editar caixa
router.put('/:id', async (req, res) => {
    try {
        if (!validarId(req.params.id)) {
            return res.status(400).json({ mensagem: 'ID inválido.' })
        }

        const dados = validarDados(req.body)

        if (dados.erro) {
            return res.status(400).json({ mensagem: dados.erro })
        }

        const id = Number(req.params.id)
        const usuarioId = req.session.usuarioId

        const existente = await prisma.caixas.findFirst({
            where: { id, usuarioId }
        })

        if (!existente) {
            return res.status(404).json({
                mensagem: 'Caixa não encontrada.'
            })
        }

        const duplicada = await prisma.caixas.findFirst({
            where: {
                nome: dados.nome,
                usuarioId,
                NOT: { id }
            }
        })

        if (duplicada) {
            return res.status(409).json({
                mensagem: 'Já existe uma caixa com esse nome.'
            })
        }

        const caixa = await prisma.caixas.update({
            where: { id },
            data: dados,
            include: {
                categorias: true
            }
        })

        return res.json(await calcularCaixa(caixa, usuarioId))
    } catch (erro) {
        console.error('Erro ao editar caixa:', erro)
        return res.status(500).json({
            mensagem: 'Erro ao editar caixa.'
        })
    }
})

// Excluir caixa
router.delete('/:id', async (req, res) => {
    try {
        if (!validarId(req.params.id)) {
            return res.status(400).json({ mensagem: 'ID inválido.' })
        }

        const resultado = await prisma.caixas.deleteMany({
            where: {
                id: Number(req.params.id),
                usuarioId: req.session.usuarioId
            }
        })

        if (resultado.count === 0) {
            return res.status(404).json({
                mensagem: 'Caixa não encontrada.'
            })
        }

        return res.json({
            mensagem: 'Caixa excluída com sucesso.'
        })
    } catch (erro) {
        console.error('Erro ao excluir caixa:', erro)
        return res.status(500).json({
            mensagem: 'Erro ao excluir caixa.'
        })
    }
})

module.exports = router
