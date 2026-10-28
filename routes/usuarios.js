
const express = require('express')
const router = express.Router()
const prisma = require('../lib/prisma')
const bcrypt = require('bcryptjs')

router.post('/', async (req, res) => {
    try {
        const { nome, email, senha } = req.body

        if (!nome || !email || !senha) {
            return res.json({ mensagem: 'Preencha todos os campos.' })
        }

        const senha_hash = await bcrypt.hash(senha, 10)

        const usuario = await prisma.usuarios.create({
            data: {
                nome,
                email,
                senha_hash
            },
            select: {
                id: true,
                nome: true,
                email: true,
                criado_em: true
            }
        })

        res.json(usuario)
    } catch (erro) {
        console.error(erro)
        res.json({ mensagem: 'Erro ao cadastrar usuário.' })
    }
})

router.get('/', async (req, res) => {
    try {
        const usuarios = await prisma.usuarios.findMany({
            select: {
                id: true,
                nome: true,
                email: true,
                criado_em: true
            }
        })

        res.json(usuarios)
    } catch (erro) {
        console.error(erro)
        res.json({ mensagem: 'Erro ao listar usuários.' })
    }
})

router.get('/:id', async (req, res) => {
    try {
        const id = Number(req.params.id)

        const usuario = await prisma.usuarios.findUnique({
            where: { id },
            select: {
                id: true,
                nome: true,
                email: true,
                criado_em: true
            }
        })

        if (!usuario) {
            return res.json({ mensagem: 'Usuário não encontrado.' })
        }

        res.json(usuario)
    } catch (erro) {
        console.error(erro)
        res.json({ mensagem: 'Erro ao consultar usuário.' })
    }
})

router.put('/:id', async (req, res) => {
    try {
        const id = Number(req.params.id)
        const { nome, email, senha } = req.body
        const dados = {}

        if (nome !== undefined) dados.nome = nome
        if (email !== undefined) dados.email = email

        if (senha) {
            dados.senha_hash = await bcrypt.hash(senha, 10)
        }

        if (Object.keys(dados).length === 0) {
            return res.json({
                mensagem: 'Informe algum dado para atualizar.'
            })
        }

        const usuario = await prisma.usuarios.update({
            where: { id },
            data: dados,
            select: {
                id: true,
                nome: true,
                email: true,
                criado_em: true
            }
        })

        res.json(usuario)
    } catch (erro) {
        console.error(erro)
        res.json({ mensagem: 'Erro ao atualizar usuário.' })
    }
})

router.delete('/:id', async (req, res) => {
    try {
        const id = Number(req.params.id)

        await prisma.usuarios.delete({
            where: { id }
        })

        res.json({ mensagem: 'Usuário excluído com sucesso.' })
    } catch (erro) {
        console.error(erro)
        res.json({ mensagem: 'Erro ao excluir usuário.' })
    }
})

module.exports = router
