const express = require('express')
const prisma = require('../lib/prisma')

const router = express.Router()

const tiposValidos = ['economia', 'despesa']

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

function validarData(data) {
    if (typeof data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        return false
    }

    const convertida = new Date(`${data}T12:00:00.000Z`)

    return !Number.isNaN(convertida.getTime()) &&
        convertida.toISOString().slice(0, 10) === data
}

function validarDados(dados) {
    const { titulo, tipo, valorAlvo, dataInicio, dataFim } = dados

    if (
        typeof titulo !== 'string' ||
        !titulo.trim() ||
        titulo.trim().length > 100 ||
        !tiposValidos.includes(tipo) ||
        valorAlvo === undefined ||
        valorAlvo === null ||
        String(valorAlvo).trim() === '' ||
        !Number.isFinite(Number(valorAlvo)) ||
        Number(valorAlvo) <= 0 ||
        !validarData(dataInicio) ||
        !validarData(dataFim)
    ) {
        return 'Preencha os campos corretamente.'
    }

    if (dataInicio > dataFim) {
        return 'A data inicial não pode ser posterior à data final.'
    }

    return null
}

function prepararDados(dados) {
    return {
        titulo: dados.titulo.trim(),
        tipo: dados.tipo,
        valorAlvo: Number(dados.valorAlvo),
        dataInicio: new Date(`${dados.dataInicio}T12:00:00.000Z`),
        dataFim: new Date(`${dados.dataFim}T12:00:00.000Z`)
    }
}

async function calcularProgresso(meta, usuarioId) {
    const dataFinal = new Date(meta.dataFim)
    dataFinal.setUTCDate(dataFinal.getUTCDate() + 1)
    dataFinal.setUTCHours(0, 0, 0, 0)

    const movimentacoes = await prisma.movimentacoes.findMany({
        where: {
            usuarioId,
            data: {
                gte: new Date(`${meta.dataInicio.toISOString().slice(0, 10)}T00:00:00.000Z`),
                lt: dataFinal
            },
            tipo: meta.tipo === 'economia'
                ? { in: ['receita', 'despesa'] }
                : 'despesa'
        },
        select: {
            valor: true,
            tipo: true
        }
    })

    let progresso = 0

    if (meta.tipo === 'economia') {
        const receitas = movimentacoes
            .filter(m => m.tipo === 'receita')
            .reduce((total, m) => total + m.valor, 0)

        const despesas = movimentacoes
            .filter(m => m.tipo === 'despesa')
            .reduce((total, m) => total + m.valor, 0)

        progresso = receitas - despesas
    } else {
        progresso = movimentacoes.reduce((total, m) => total + m.valor, 0)
    }

    const percentual = meta.valorAlvo > 0
        ? (progresso / meta.valorAlvo) * 100
        : 0

    return {
        ...meta,
        progresso: Math.max(0, Number(progresso.toFixed(2))),
        percentual: Number(Math.max(0, percentual).toFixed(2)),
        restante: Number((meta.valorAlvo - progresso).toFixed(2))
    }
}

router.use(autenticar)

// Cadastrar meta
router.post('/', async (req, res) => {
    try {
        const erroValidacao = validarDados(req.body)

        if (erroValidacao) {
            return res.status(400).json({
                mensagem: erroValidacao
            })
        }

        const meta = await prisma.metas.create({
            data: {
                ...prepararDados(req.body),
                usuarioId: req.session.usuarioId
            }
        })

        return res.status(201).json(
            await calcularProgresso(meta, req.session.usuarioId)
        )
    } catch (erro) {
        console.error('Erro ao cadastrar meta:', erro)

        return res.status(500).json({
            mensagem: 'Erro ao cadastrar meta.'
        })
    }
})

// Listar metas
router.get('/', async (req, res) => {
    try {
        const metas = await prisma.metas.findMany({
            where: {
                usuarioId: req.session.usuarioId
            },
            orderBy: {
                criadaEm: 'desc'
            }
        })

        const metasComProgresso = await Promise.all(
            metas.map(meta => calcularProgresso(meta, req.session.usuarioId))
        )

        return res.json(metasComProgresso)
    } catch (erro) {
        console.error('Erro ao listar metas:', erro)

        return res.status(500).json({
            mensagem: 'Erro ao buscar metas.'
        })
    }
})

// Consultar uma meta
router.get('/:id', async (req, res) => {
    try {
        if (!validarId(req.params.id)) {
            return res.status(400).json({
                mensagem: 'ID inválido.'
            })
        }

        const meta = await prisma.metas.findFirst({
            where: {
                id: Number(req.params.id),
                usuarioId: req.session.usuarioId
            }
        })

        if (!meta) {
            return res.status(404).json({
                mensagem: 'Meta não encontrada.'
            })
        }

        return res.json(
            await calcularProgresso(meta, req.session.usuarioId)
        )
    } catch (erro) {
        console.error('Erro ao consultar meta:', erro)

        return res.status(500).json({
            mensagem: 'Erro ao buscar meta.'
        })
    }
})

// Editar meta
router.put('/:id', async (req, res) => {
    try {
        if (!validarId(req.params.id)) {
            return res.status(400).json({
                mensagem: 'ID inválido.'
            })
        }

        const erroValidacao = validarDados(req.body)

        if (erroValidacao) {
            return res.status(400).json({
                mensagem: erroValidacao
            })
        }

        const resultado = await prisma.metas.updateMany({
            where: {
                id: Number(req.params.id),
                usuarioId: req.session.usuarioId
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
                usuarioId: req.session.usuarioId
            }
        })

        return res.json(
            await calcularProgresso(meta, req.session.usuarioId)
        )
    } catch (erro) {
        console.error('Erro ao editar meta:', erro)

        return res.status(500).json({
            mensagem: 'Erro ao editar meta.'
        })
    }
})

// Excluir meta
router.delete('/:id', async (req, res) => {
    try {
        if (!validarId(req.params.id)) {
            return res.status(400).json({
                mensagem: 'ID inválido.'
            })
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