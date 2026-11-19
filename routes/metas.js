
const express = require('express')
const prisma = require('../lib/prisma')

const router = express.Router()

const tiposValidos = ['economia', 'despesa']

function autenticar(req, res, next) {
    if (!req.session?.usuarioId) {
        return res.status(401).json({
            mensagem: 'Você precisa entrar na sua conta.'
        })
    }

    next()
}

function validarId(id) {
    return /^\d+$/.test(String(id)) &&
        Number.isSafeInteger(Number(id)) &&
        Number(id) > 0
}

function validarData(data) {
    if (
        typeof data !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(data)
    ) {
        return false
    }

    const dataConvertida = new Date(`${data}T12:00:00.000Z`)

    return !Number.isNaN(dataConvertida.getTime()) &&
        dataConvertida.toISOString().slice(0, 10) === data
}

function validarDados(dados = {}) {
    const {
        titulo,
        tipo,
        valorAlvo,
        dataInicio,
        dataFim,
        caixaId
    } = dados

    if (
        typeof titulo !== 'string' ||
        !titulo.trim() ||
        titulo.trim().length > 100
    ) {
        return 'Informe um título com até 100 caracteres.'
    }

    if (!tiposValidos.includes(tipo)) {
        return 'Selecione um tipo de meta válido.'
    }

    if (
        valorAlvo === undefined ||
        valorAlvo === null ||
        String(valorAlvo).trim() === '' ||
        !Number.isFinite(Number(valorAlvo)) ||
        Number(valorAlvo) <= 0
    ) {
        return 'Informe um valor-alvo maior que zero.'
    }

    if (!validarData(dataInicio) || !validarData(dataFim)) {
        return 'Informe as datas inicial e final corretamente.'
    }

    if (dataInicio > dataFim) {
        return 'A data inicial não pode ser posterior à data final.'
    }

    if (!validarId(caixaId)) {
        return 'Selecione uma caixa válida.'
    }

    return null
}

function prepararDados(dados) {
    return {
        titulo: dados.titulo.trim(),
        tipo: dados.tipo,
        valorAlvo: Number(dados.valorAlvo),
        dataInicio: new Date(`${dados.dataInicio}T12:00:00.000Z`),
        dataFim: new Date(`${dados.dataFim}T12:00:00.000Z`),
        caixaId: Number(dados.caixaId)
    }
}

function inicioDoDia(data) {
    return new Date(
        `${data.toISOString().slice(0, 10)}T00:00:00.000Z`
    )
}

function fimDoPeriodo(data) {
    const final = new Date(data)
    final.setUTCDate(final.getUTCDate() + 1)
    final.setUTCHours(0, 0, 0, 0)

    return final
}

function arredondar(valor) {
    return Math.round((Number(valor || 0) + Number.EPSILON) * 100) / 100
}

async function buscarCaixaValida(caixaId, tipoMeta, usuarioId) {
    const tipoCaixa = tipoMeta === 'economia'
        ? 'reserva'
        : 'despesa'

    return prisma.caixas.findFirst({
        where: {
            id: Number(caixaId),
            usuarioId,
            tipo: tipoCaixa
        }
    })
}

async function calcularProgresso(meta, usuarioId) {
    let progresso = 0
    let saldoCaixa = 0

    const caixa = meta.caixaId
        ? await prisma.caixas.findFirst({
            where: {
                id: meta.caixaId,
                usuarioId
            }
        })
        : null

    if (
        caixa &&
        meta.tipo === 'economia' &&
        caixa.tipo === 'reserva'
    ) {
        const movimentacoes = await prisma.movimentacoesCaixas.findMany({
            where: {
                usuarioId,
                caixaId: caixa.id
            },
            select: {
                tipo: true,
                valor: true
            }
        })

        progresso = movimentacoes.reduce((saldo, movimentacao) => {
            const tipoMovimento = String(movimentacao.tipo || '')
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')

            const valor = Number(movimentacao.valor || 0)

            if (['deposito', 'entrada'].includes(tipoMovimento)) {
                return saldo + valor
            }

            if (['retirada', 'saque'].includes(tipoMovimento)) {
                return saldo - valor
            }

            return saldo
        }, 0)

        saldoCaixa = progresso
    }

    if (
        caixa &&
        meta.tipo === 'despesa' &&
        caixa.tipo === 'despesa'
    ) {
        const categorias = await prisma.categorias.findMany({
            where: {
                usuarioId,
                caixaId: caixa.id
            },
            select: {
                id: true
            }
        })

        const idsCategorias = categorias.map(categoria => categoria.id)

        if (idsCategorias.length > 0) {
            const movimentacoes = await prisma.movimentacoes.findMany({
                where: {
                    usuarioId,
                    categoriaId: {
                        in: idsCategorias
                    },
                    tipo: 'despesa',
                    data: {
                        gte: inicioDoDia(meta.dataInicio),
                        lt: fimDoPeriodo(meta.dataFim)
                    }
                },
                select: {
                    valor: true
                }
            })

            progresso = movimentacoes.reduce(
                (total, movimentacao) =>
                    total + Number(movimentacao.valor || 0),
                0
            )
        }
    }

    progresso = Math.max(0, arredondar(progresso))
    saldoCaixa = Math.max(0, arredondar(saldoCaixa))

    const valorAlvo = Number(meta.valorAlvo || 0)

    const percentual = valorAlvo > 0
        ? Math.min(100, Math.max(0, (progresso / valorAlvo) * 100))
        : 0

    const restante = Math.max(0, arredondar(valorAlvo - progresso))

    return {
        ...meta,
        caixa: caixa
            ? {
                id: caixa.id,
                nome: caixa.nome,
                tipo: caixa.tipo,
                saldo: meta.tipo === 'economia' ? saldoCaixa : null
            }
            : null,
        caixaNome: caixa?.nome || null,
        progresso,
        percentual: arredondar(percentual),
        restante
    }
}

router.use(autenticar)

// CADASTRAR META
router.post('/', async (req, res) => {
    try {
        const erro = validarDados(req.body)

        if (erro) {
            return res.status(400).json({ mensagem: erro })
        }

        const usuarioId = req.session.usuarioId

        const caixa = await buscarCaixaValida(
            req.body.caixaId,
            req.body.tipo,
            usuarioId
        )

        if (!caixa) {
            return res.status(400).json({
                mensagem: req.body.tipo === 'economia'
                    ? 'Selecione uma reserva financeira sua.'
                    : 'Selecione uma caixa de despesas sua.'
            })
        }

        const meta = await prisma.metas.create({
            data: {
                ...prepararDados(req.body),
                usuarioId
            }
        })

        return res.status(201).json(
            await calcularProgresso(meta, usuarioId)
        )
    } catch (erro) {
        console.error('Erro ao cadastrar meta:', erro)

        return res.status(500).json({
            mensagem: 'Erro ao cadastrar meta.'
        })
    }
})

// LISTAR METAS
router.get('/', async (req, res) => {
    try {
        const usuarioId = req.session.usuarioId

        const metas = await prisma.metas.findMany({
            where: { usuarioId },
            orderBy: { criadaEm: 'desc' }
        })

        const resultado = await Promise.all(
            metas.map(meta => calcularProgresso(meta, usuarioId))
        )

        return res.json(resultado)
    } catch (erro) {
        console.error('Erro ao listar metas:', erro)

        return res.status(500).json({
            mensagem: 'Erro ao buscar metas.'
        })
    }
})

// CONSULTAR UMA META
router.get('/:id', async (req, res) => {
    try {
        if (!validarId(req.params.id)) {
            return res.status(400).json({ mensagem: 'ID inválido.' })
        }

        const usuarioId = req.session.usuarioId

        const meta = await prisma.metas.findFirst({
            where: {
                id: Number(req.params.id),
                usuarioId
            }
        })

        if (!meta) {
            return res.status(404).json({
                mensagem: 'Meta não encontrada.'
            })
        }

        return res.json(await calcularProgresso(meta, usuarioId))
    } catch (erro) {
        console.error('Erro ao consultar meta:', erro)

        return res.status(500).json({
            mensagem: 'Erro ao buscar meta.'
        })
    }
})

// EDITAR META
router.put('/:id', async (req, res) => {
    try {
        if (!validarId(req.params.id)) {
            return res.status(400).json({ mensagem: 'ID inválido.' })
        }

        const erro = validarDados(req.body)

        if (erro) {
            return res.status(400).json({ mensagem: erro })
        }

        const usuarioId = req.session.usuarioId

        const caixa = await buscarCaixaValida(
            req.body.caixaId,
            req.body.tipo,
            usuarioId
        )

        if (!caixa) {
            return res.status(400).json({
                mensagem: req.body.tipo === 'economia'
                    ? 'Selecione uma reserva financeira sua.'
                    : 'Selecione uma caixa de despesas sua.'
            })
        }

        const resultado = await prisma.metas.updateMany({
            where: {
                id: Number(req.params.id),
                usuarioId
            },
            data: prepararDados(req.body)
        })

        if (resultado.count === 0) {
            return res.status(404).json({
                mensagem: 'Meta não encontrada.'
            })
        }

        const meta = await prisma.metas.findFirst({
            where: {
                id: Number(req.params.id),
                usuarioId
            }
        })

        return res.json(await calcularProgresso(meta, usuarioId))
    } catch (erro) {
        console.error('Erro ao editar meta:', erro)

        return res.status(500).json({
            mensagem: 'Erro ao editar meta.'
        })
    }
})

// EXCLUIR META
router.delete('/:id', async (req, res) => {
    try {
        if (!validarId(req.params.id)) {
            return res.status(400).json({ mensagem: 'ID inválido.' })
        }

        const resultado = await prisma.metas.deleteMany({
            where: {
                id: Number(req.params.id),
                usuarioId: req.session.usuarioId
            }
        })

        if (resultado.count === 0) {
            return res.status(404).json({
                mensagem: 'Meta não encontrada.'
            })
        }

        return res.json({
            mensagem: 'Meta excluída com sucesso!'
        })
    } catch (erro) {
        console.error('Erro ao excluir meta:', erro)

        return res.status(500).json({
            mensagem: 'Erro ao excluir meta.'
        })
    }
})

module.exports = router
