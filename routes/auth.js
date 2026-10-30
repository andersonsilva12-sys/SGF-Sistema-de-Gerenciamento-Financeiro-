const express = require('express')
const bcrypt = require('bcryptjs')
const prisma = require('../lib/prisma')

const router = express.Router()

router.post('/login', async (req, res) => {
    try {
        const { email, senha } = req.body

        if (!email || !senha) {
            return res.status(400).json({
                mensagem: 'Informe o e-mail e a senha.'
            })
        }

        const usuario = await prisma.usuarios.findUnique({
            where: { email }
        })

        if (!usuario) {
            return res.status(401).json({
                mensagem: 'E-mail ou senha inválidos.'
            })
        }

        const senhaValida = await bcrypt.compare(
            senha,
            usuario.senha_hash
        )

        if (!senhaValida) {
            return res.status(401).json({
                mensagem: 'E-mail ou senha inválidos.'
            })
        }

        req.session.regenerate((erro) => {
            if (erro) {
                console.error('Erro ao criar sessão:', erro)
                return res.status(500).json({
                    mensagem: 'Não foi possível iniciar a sessão.'
                })
            }

            req.session.usuarioId = usuario.id

            req.session.save((erro) => {
                if (erro) {
                    console.error('Erro ao salvar sessão:', erro)
                    return res.status(500).json({
                        mensagem: 'Não foi possível iniciar a sessão.'
                    })
                }

                return res.json({
                    mensagem: 'Login realizado com sucesso!',
                    usuario: {
                        id: usuario.id,
                        nome: usuario.nome,
                        email: usuario.email
                    }
                })
            })
        })
    } catch (erro) {
        console.error('Erro no login:', erro)

        return res.status(500).json({
            mensagem: 'Erro ao realizar login.'
        })
    }
})

router.post('/logout', (req, res) => {
    req.session.destroy((erro) => {
        if (erro) {
            console.error('Erro ao encerrar sessão:', erro)

            return res.status(500).json({
                mensagem: 'Erro ao sair da conta.'
            })
        }

        res.clearCookie('connect.sid')

        return res.json({
            mensagem: 'Logout realizado com sucesso!'
        })
    })
})

module.exports = router
