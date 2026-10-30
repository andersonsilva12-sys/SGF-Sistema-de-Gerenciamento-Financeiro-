const express = require('express')
const prisma = require('../lib/prisma')

const router = express.Router()

const tiposValidos = ['receita', 'despesa']

function autenticar(req, res, next) {
    if (!req.session || !req.session.usuarioId) {
        return res.status(401).json({
            mensagem: 'Você precisa entrar na sua conta.'
        })
    }

    next()
}

function validarDados(dados) {
    const { descricao, valor, tipo, categoriaId, data } = dados

    if (
        typeof descricao !== 'string' ||
        !descricao.trim() ||
        descricao.trim().length > 150 ||
        valor === undefined ||
        valor === null ||
        String(valor).trim() === '' ||
        !Number.isFinite(Number(valor)) ||
        Number(valor) <= 0 ||
        !tiposValidos.includes(tipo) ||
        !Number.isSafeInteger(Number(categoriaId)) ||
        Number(categoriaId) <= 0
    ) {
        return 'Preencha os campos corretamente.'
    }

    if (data !== undefined && data !== '') {
        if (
            typeof data !== 'string' ||
            !/^\d{4}-\d{2}-\d{2}$/.test(data)
        ) {
            return 'Informe uma data válida.'
        }

        const dataConvertida = new Date(`${data}T12:00:00.000Z`)

        if (
            Number.isNaN(dataConvertida.getTime()) ||
            dataConvertida.toISOString().slice(0, 10) !== data
        ) {
            return 'Informe uma data válida.'
        }
    }

    return null
}

function validarId(id) {
    return /^\d+$/.test(id) &&
        Number.isSafeInteger(Number(id)) &&
        Number(id) > 0
}

async function buscarCategoria(categoriaId, tipo, usuarioId) {
    return prisma.categorias.findFirst({
        where: {
            id: Number(categoriaId),
            tipo,
            usuarioId
        },
        include: {
            caixa: true
        }
    })
}

function prepararDados(dados, categoria) {
    const resultado = {
        descricao: dados.descricao.trim(),
        valor: Number(dados.valor),
        tipo: dados.tipo,
        categoria: categoria.nome,
        categoriaId: categoria.id
    }

    if (dados.data) {
        resultado.data = new Date(`${dados.data}T12:00:00.000Z`)
    }

    return resultado
}

const incluirCategoria = {
    categoriaRef: {
        select: {
            id: true,
            nome: true,
            tipo: true,
            caixa: {
                select: {
                    id: true,
                    nome: true,
                    tipo: true,
                    limiteMensal: true
                }
            }
        }
    }
}

router.use(autenticar)

// Cadastrar movimentação
router.post('/', async (req, res) => {
    try {
        const erroValidacao = validarDados(req.body)

        if (erroValidacao) {
            return res.status(400).json({
                mensagem: erroValidacao
            })
        }

        const usuarioId = req.session.usuarioId

        const categoria = await buscarCategoria(
            req.body.categoriaId,
            req.body.tipo,
            usuarioId
        )

        if (!categoria) {
            return res.status(400).json({
                mensagem: 'Categoria inválida ou incompatível com o tipo da movimentação.'
            })
        }

        const movimentacao = await prisma.movimentacoes.create({
            data: {
                ...prepararDados(req.body, categoria),
                usuarioId
            },
            include: incluirCategoria
        })

        return res.status(201).json(movimentacao)
    } catch (erro) {
        console.error('Erro ao cadastrar movimentação:', erro)

        return res.status(500).json({
            mensagem: 'Erro ao cadastrar movimentação.'
        })
    }
})

// Listar movimentações do usuário
router.get('/', async (req, res) => {
    try {
        const movimentacoes = await prisma.movimentacoes.findMany({
            where: {
                usuarioId: req.session.usuarioId
            },
            include: incluirCategoria,
            orderBy: {
                data: 'desc'
            }
        })

        return res.json(movimentacoes)
    } catch (erro) {
        console.error('Erro ao listar movimentações:', erro)

        return res.status(500).json({
            mensagem: 'Erro ao buscar movimentações.'
        })
    }
})

// Consultar uma movimentação
router.get('/:id', async (req, res) => {
    try {
        if (!validarId(req.params.id)) {
            return res.status(400).json({
                mensagem: 'ID inválido.'
            })
        }

        const movimentacao = await prisma.movimentacoes.findFirst({
            where: {
                id: Number(req.params.id),
                usuarioId: req.session.usuarioId
            },
            include: incluirCategoria
        })

        if (!movimentacao) {
            return res.status(404).json({
                mensagem: 'Movimentação não encontrada.'
            })
        }

        return res.json(movimentacao)
    } catch (erro) {
        console.error('Erro ao consultar movimentação:', erro)

        return res.status(500).json({
            mensagem: 'Erro ao buscar movimentação.'
        })
    }
})

// Editar movimentação
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

        const usuarioId = req.session.usuarioId

        const categoria = await buscarCategoria(
            req.body.categoriaId,
            req.body.tipo,
            usuarioId
        )

        if (!categoria) {
            return res.status(400).json({
                mensagem: 'Categoria inválida ou incompatível com o tipo da movimentação.'
            })
        }

        const resultado = await prisma.movimentacoes.updateMany({
            where: {
                id: Number(req.params.id),
                usuarioId
            },
            data: prepararDados(req.body, categoria)
        })

        if (resultado.count === 0) {
            return res.status(404).json({
                mensagem: 'Movimentação não encontrada.'
            })
        }

        const movimentacao = await prisma.movimentacoes.findFirst({
            where: {
                id: Number(req.params.id),
                usuarioId
            },
            include: incluirCategoria
        })

        return res.json(movimentacao)
    } catch (erro) {
        console.error('Erro ao editar movimentação:', erro)

        return res.status(500).json({
            mensagem: 'Erro ao editar movimentação.'
        })
    }
})

// Excluir movimentação
router.delete('/:id', async (req, res) => {
    try {
        if (!validarId(req.params.id)) {
            return res.status(400).json({
                mensagem: 'ID inválido.'
            })
        }

        const resultado = await prisma.movimentacoes.deleteMany({
            where: {
                id: Number(req.params.id),
                usuarioId: req.session.usuarioId
            }
        })

        if (resultado.count === 0) {
            return res.status(404).json({
                mensagem: 'Movimentação não encontrada.'
            })
        }

        return res.json({
            mensagem: 'Movimentação excluída com sucesso!'
        })
    } catch (erro) {
        console.error('Erro ao excluir movimentação:', erro)

        return res.status(500).json({
            mensagem: 'Erro ao excluir movimentação.'
        })
    }
})

module.exports = router
