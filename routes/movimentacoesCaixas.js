
const express = require('express')
const prisma = require('../lib/prisma')

const router = express.Router()

const tiposValidos = ['deposito', 'retirada']

function autenticar(req, res, next) {
    if (!req.session || !req.session.usuarioId) {
        return res.status(401).json({
            mensagem: 'Você precisa entrar na sua conta.'
        })
    }

    next()
}

function validarId(id) {
    return /^\d+$/.test(id) &&
        Number.isSafeInteger(Number(id)) &&
        Number(id) > 0
}

function prepararData(data) {
    if (data) {
        return new Date(`${data}T12:00:00.000Z`)
    }

    const agora = new Date()

    return new Date(Date.UTC(
        agora.getFullYear(),
        agora.getMonth(),
        agora.getDate(),
        12
    ))
}

function validarDados(dados) {
    const { tipo, valor, descricao, data } = dados

    if (
        !tiposValidos.includes(tipo) ||
        valor === undefined ||
        valor === null ||
        String(valor).trim() === '' ||
        !Number.isFinite(Number(valor)) ||
        Number(valor) <= 0
    ) {
        return 'Informe um tipo e um valor válido.'
    }

    if (
        descricao !== undefined &&
        descricao !== null &&
        (
            typeof descricao !== 'string' ||
            descricao.trim().length > 150
        )
    ) {
        return 'A descrição deve ter no máximo 150 caracteres.'
    }

    if (data !== undefined && data !== '') {
        if (
            typeof data !== 'string' ||
            !/^\d{4}-\d{2}-\d{2}$/.test(data)
        ) {
            return 'Informe uma data válida.'
        }

        const dataConvertida = prepararData(data)

        if (
            Number.isNaN(dataConvertida.getTime()) ||
            dataConvertida.toISOString().slice(0, 10) !== data
        ) {
            return 'Informe uma data válida.'
        }
    }

    return null
}

async function buscarCaixa(caixaId, usuarioId) {
    return prisma.caixas.findFirst({
        where: {
            id: Number(caixaId),
            usuarioId,
            tipo: 'reserva'
        }
    })
}

async function calcularSaldo(tx, caixaId, usuarioId) {
    const depositos = await tx.movimentacoesCaixas.aggregate({
        where: {
            caixaId,
            usuarioId,
            tipo: 'deposito'
        },
        _sum: {
            valor: true
        }
    })

    const retiradas = await tx.movimentacoesCaixas.aggregate({
        where: {
            caixaId,
            usuarioId,
            tipo: 'retirada'
        },
        _sum: {
            valor: true
        }
    })

    const totalDepositado = depositos._sum.valor || 0
    const totalRetirado = retiradas._sum.valor || 0

    return Number(
        (totalDepositado - totalRetirado).toFixed(2)
    )
}

router.use(autenticar)

// Registrar depósito ou retirada
router.post('/:caixaId/movimentacoes', async (req, res) => {
    try {
        if (!validarId(req.params.caixaId)) {
            return res.status(400).json({
                mensagem: 'ID da caixa inválido.'
            })
        }

        const erroValidacao = validarDados(req.body)

        if (erroValidacao) {
            return res.status(400).json({
                mensagem: erroValidacao
            })
        }

        const usuarioId = req.session.usuarioId
        const caixaId = Number(req.params.caixaId)

        const caixa = await buscarCaixa(caixaId, usuarioId)

        if (!caixa) {
            return res.status(404).json({
                mensagem: 'Caixa de reserva não encontrada.'
            })
        }

        const valor = Number(req.body.valor)

        const movimentacao = await prisma.$transaction(async (tx) => {
            const saldoAtual = await calcularSaldo(tx, caixaId, usuarioId)

            if (req.body.tipo === 'retirada' && valor > saldoAtual) {
                return null
            }

            return tx.movimentacoesCaixas.create({
                data: {
                    tipo: req.body.tipo,
                    valor,
                    descricao: req.body.descricao?.trim() || null,
                    data: prepararData(req.body.data),
                    caixaId,
                    usuarioId
                }
            })
        })

        if (!movimentacao) {
            return res.status(400).json({
                mensagem: 'Saldo insuficiente para realizar essa retirada.'
            })
        }

        return res.status(201).json(movimentacao)
    } catch (erro) {
        console.error('Erro ao registrar movimentação da caixa:', erro)

        return res.status(500).json({
            mensagem: 'Erro ao registrar movimentação da caixa.'
        })
    }
})

// Listar histórico da caixa
router.get('/:caixaId/movimentacoes', async (req, res) => {
    try {
        if (!validarId(req.params.caixaId)) {
            return res.status(400).json({
                mensagem: 'ID da caixa inválido.'
            })
        }

        const usuarioId = req.session.usuarioId
        const caixaId = Number(req.params.caixaId)

        const caixa = await buscarCaixa(caixaId, usuarioId)

        if (!caixa) {
            return res.status(404).json({
                mensagem: 'Caixa de reserva não encontrada.'
            })
        }

        const movimentacoes = await prisma.movimentacoesCaixas.findMany({
            where: {
                caixaId,
                usuarioId
            },
            orderBy: [
                { data: 'desc' },
                { id: 'desc' }
            ]
        })

        return res.json(movimentacoes)
    } catch (erro) {
        console.error('Erro ao listar movimentações da caixa:', erro)

        return res.status(500).json({
            mensagem: 'Erro ao buscar movimentações da caixa.'
        })
    }
})

module.exports = router
