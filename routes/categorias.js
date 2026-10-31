
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

function validarDados(body) {
    const nome = typeof body.nome === 'string' ? body.nome.trim() : ''
    const tipo = typeof body.tipo === 'string' ? body.tipo.trim().toLowerCase() : ''

    let caixaId = null

    if (body.caixaId !== undefined && body.caixaId !== null && body.caixaId !== '') {
        caixaId = Number(body.caixaId)

        if (!Number.isSafeInteger(caixaId) || caixaId <= 0) {
            return { erro: 'Selecione uma caixa válida.' }
        }
    }

    if (!nome || nome.length > 100) {
        return {
            erro: 'Informe um nome de até 100 caracteres.'
        }
    }

    if (!tiposValidos.includes(tipo)) {
        return {
            erro: 'O tipo deve ser receita ou despesa.'
        }
    }

    if (tipo === 'receita' && caixaId !== null) {
        return {
            erro: 'Categorias de receita não podem ser vinculadas a caixas de despesas.'
        }
    }

    if (tipo === 'despesa' && caixaId === null) {
        return {
            erro: 'Selecione uma caixa de despesas para esta categoria.'
        }
    }

    return { nome, tipo, caixaId }
}

function validarId(valor) {
    const id = Number(valor)

    return Number.isInteger(id) && id > 0 ? id : null
}

async function buscarCaixa(caixaId, usuarioId) {
    if (caixaId === null) return true

    return prisma.caixas.findFirst({
        where: {
            id: caixaId,
            usuarioId,
            tipo: 'despesa'
        }
    })
}

router.use(autenticar)

// Cadastrar categoria
router.post('/', async (req, res) => {
    try {
        const dados = validarDados(req.body)

        if (dados.erro) {
            return res.status(400).json({ mensagem: dados.erro })
        }

        const usuarioId = req.session.usuarioId

        const existente = await prisma.categorias.findFirst({
            where: {
                nome: dados.nome,
                tipo: dados.tipo,
                usuarioId
            }
        })

        if (existente) {
            return res.status(409).json({
                mensagem: 'Você já possui uma categoria com esse nome e tipo.'
            })
        }

        const caixa = await buscarCaixa(dados.caixaId, usuarioId)

        if (!caixa) {
            return res.status(400).json({
                mensagem: 'Selecione uma caixa de despesas pertencente à sua conta.'
            })
        }

        const categoria = await prisma.categorias.create({
            data: {
                nome: dados.nome,
                tipo: dados.tipo,
                caixaId: dados.caixaId,
                usuarioId
            },
            include: {
                caixa: true
            }
        })

        return res.status(201).json(categoria)
    } catch (erro) {
        console.error('Erro ao cadastrar categoria:', erro)
        return res.status(500).json({
            mensagem: 'Erro ao cadastrar categoria.'
        })
    }
})

// Listar categorias do usuário
router.get('/', async (req, res) => {
    try {
        const categorias = await prisma.categorias.findMany({
            where: {
                usuarioId: req.session.usuarioId
            },
            include: {
                caixa: true
            },
            orderBy: {
                nome: 'asc'
            }
        })

        return res.json(categorias)
    } catch (erro) {
        console.error('Erro ao listar categorias:', erro)
        return res.status(500).json({
            mensagem: 'Erro ao listar categorias.'
        })
    }
})

// Consultar uma categoria
router.get('/:id', async (req, res) => {
    try {
        const id = validarId(req.params.id)

        if (!id) {
            return res.status(400).json({
                mensagem: 'ID inválido.'
            })
        }

        const categoria = await prisma.categorias.findFirst({
            where: {
                id,
                usuarioId: req.session.usuarioId
            },
            include: {
                caixa: true
            }
        })

        if (!categoria) {
            return res.status(404).json({
                mensagem: 'Categoria não encontrada.'
            })
        }

        return res.json(categoria)
    } catch (erro) {
        console.error('Erro ao consultar categoria:', erro)
        return res.status(500).json({
            mensagem: 'Erro ao consultar categoria.'
        })
    }
})

// Editar categoria
router.put('/:id', async (req, res) => {
    try {
        const id = validarId(req.params.id)

        if (!id) {
            return res.status(400).json({
                mensagem: 'ID inválido.'
            })
        }

        const dados = validarDados(req.body)

        if (dados.erro) {
            return res.status(400).json({ mensagem: dados.erro })
        }

        const usuarioId = req.session.usuarioId

        const categoria = await prisma.categorias.findFirst({
            where: {
                id,
                usuarioId
            }
        })

        if (!categoria) {
            return res.status(404).json({
                mensagem: 'Categoria não encontrada.'
            })
        }

        const duplicada = await prisma.categorias.findFirst({
            where: {
                nome: dados.nome,
                tipo: dados.tipo,
                usuarioId,
                NOT: { id }
            }
        })

        if (duplicada) {
            return res.status(409).json({
                mensagem: 'Já existe uma categoria com esse nome e tipo.'
            })
        }

        const caixa = await buscarCaixa(dados.caixaId, usuarioId)

        if (!caixa) {
            return res.status(400).json({
                mensagem: 'Selecione uma caixa de despesas pertencente à sua conta.'
            })
        }

        const atualizada = await prisma.categorias.update({
            where: { id },
            data: {
                nome: dados.nome,
                tipo: dados.tipo,
                caixaId: dados.caixaId
            },
            include: {
                caixa: true
            }
        })

        return res.json(atualizada)
    } catch (erro) {
        console.error('Erro ao editar categoria:', erro)
        return res.status(500).json({
            mensagem: 'Erro ao editar categoria.'
        })
    }
})

// Excluir categoria
router.delete('/:id', async (req, res) => {
    try {
        const id = validarId(req.params.id)

        if (!id) {
            return res.status(400).json({
                mensagem: 'ID inválido.'
            })
        }

        const usuarioId = req.session.usuarioId

        const categoria = await prisma.categorias.findFirst({
            where: { id, usuarioId }
        })

        if (!categoria) {
            return res.status(404).json({
                mensagem: 'Categoria não encontrada.'
            })
        }

        await prisma.categorias.delete({
            where: { id }
        })

        return res.json({
            mensagem: 'Categoria excluída com sucesso.'
        })
    } catch (erro) {
        console.error('Erro ao excluir categoria:', erro)

        if (erro.code === 'P2003') {
            return res.status(409).json({
                mensagem: 'Não é possível excluir uma categoria que possui movimentações ou orçamentos vinculados.'
            })
        }

        return res.status(500).json({
            mensagem: 'Erro ao excluir categoria.'
        })
    }
})

module.exports = router
