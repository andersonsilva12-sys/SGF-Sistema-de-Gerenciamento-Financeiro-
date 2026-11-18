
require('dotenv').config()

const express = require('express')
const prisma = require('../lib/prisma')

const router = express.Router()

const paginasPermitidas = [
    'dashboard',
    'transacoes',
    'categorias',
    'contas',
    'orcamentos',
    'metas'
]

async function obterContextoFinanceiro(usuarioId) {
    const agora = new Date()

    // Considera o início e o fim do mês no horário local do servidor.
    const inicioMes = new Date(
        agora.getFullYear(),
        agora.getMonth(),
        1
    )

    const inicioProximoMes = new Date(
        agora.getFullYear(),
        agora.getMonth() + 1,
        1
    )

    const periodo = {
        usuarioId,
        data: {
            gte: inicioMes,
            lt: inicioProximoMes
        }
    }

    const [
        receitas,
        despesas,
        totalMovimentacoes,
        movimentacoes,
        categorias,
        caixas,
        movimentacoesCaixas,
        orcamentos,
        metas
    ] = await Promise.all([

        prisma.movimentacoes.aggregate({
            where: {
                ...periodo,
                tipo: 'receita'
            },
            _sum: {
                valor: true
            }
        }),

        prisma.movimentacoes.aggregate({
            where: {
                ...periodo,
                tipo: 'despesa'
            },
            _sum: {
                valor: true
            }
        }),

        prisma.movimentacoes.count({
            where: { usuarioId }
        }),

        prisma.movimentacoes.findMany({
            where: { usuarioId },
            include: {
                categoriaRef: {
                    select: {
                        nome: true,
                        tipo: true
                    }
                }
            },
            orderBy: [
                { data: 'desc' },
                { id: 'desc' }
            ],
            take: 30
        }),

        prisma.categorias.findMany({
            where: { usuarioId },
            include: {
                caixa: {
                    select: {
                        nome: true,
                        tipo: true
                    }
                }
            },
            orderBy: {
                nome: 'asc'
            }
        }),

        prisma.caixas.findMany({
            where: { usuarioId },
            orderBy: {
                nome: 'asc'
            }
        }),

        prisma.movimentacoesCaixas.findMany({
            where: { usuarioId },
            include: {
                caixa: {
                    select: {
                        nome: true,
                        tipo: true
                    }
                }
            },
            orderBy: [
                { data: 'desc' },
                { id: 'desc' }
            ],
            take: 30
        }),

        prisma.orcamentos.findMany({
            where: { usuarioId },
            include: {
                categoria: {
                    select: {
                        nome: true,
                        tipo: true
                    }
                }
            },
            orderBy: [
                { ano: 'desc' },
                { mes: 'desc' }
            ]
        }),

        prisma.metas.findMany({
            where: { usuarioId },
            orderBy: {
                criadaEm: 'desc'
            }
        })
    ])

    const totalReceitas = receitas._sum.valor || 0
    const totalDespesas = despesas._sum.valor || 0

    return {
        referencia: {
            mes: agora.getMonth() + 1,
            ano: agora.getFullYear()
        },

        resumo_mensal: {
            total_receitas: totalReceitas,
            total_despesas: totalDespesas,
            saldo_mes: totalReceitas - totalDespesas
        },

        movimentacoes: {
            quantidade_total: totalMovimentacoes,
            registros_enviados: movimentacoes.length,
            limite: 30,
            dados: movimentacoes
        },

        categorias: {
            quantidade: categorias.length,
            dados: categorias
        },

        caixas: {
            quantidade: caixas.length,
            dados: caixas
        },

        movimentacoes_caixas: {
            registros_enviados: movimentacoesCaixas.length,
            limite: 30,
            dados: movimentacoesCaixas
        },

        orcamentos: {
            quantidade: orcamentos.length,
            dados: orcamentos
        },

        metas: {
            quantidade: metas.length,
            dados: metas
        }
    }
}

router.post('/mensagem', async (req, res) => {
    try {
        // O usuário sempre é identificado pela sessão autenticada.
        const usuarioId = Number(req.session?.usuarioId)

        if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
            return res.status(401).json({
                mensagem: 'Você precisa estar autenticado para utilizar o assistente.'
            })
        }

        const { mensagem, pagina } = req.body

        if (
            typeof mensagem !== 'string' ||
            !mensagem.trim() ||
            mensagem.length > 4000 ||
            typeof pagina !== 'string' ||
            !paginasPermitidas.includes(pagina)
        ) {
            return res.status(400).json({
                mensagem: 'Mensagem ou página inválida.'
            })
        }

        if (!process.env.SGF_INTERNAL_TOKEN) {
            console.error('SGF_INTERNAL_TOKEN não configurado.')

            return res.status(500).json({
                mensagem: 'Configuração interna do assistente não encontrada.'
            })
        }

        // Busca exclusivamente os dados pertencentes ao usuário autenticado.
        const contextoFinanceiro = await obterContextoFinanceiro(usuarioId)

        console.log('Contexto financeiro preparado:', {
            usuarioId,
            movimentacoes: contextoFinanceiro.movimentacoes.quantidade_total,
            movimentacoesEnviadas: contextoFinanceiro.movimentacoes.registros_enviados,
            categorias: contextoFinanceiro.categorias.quantidade,
            caixas: contextoFinanceiro.caixas.quantidade,
            movimentacoesCaixas: contextoFinanceiro.movimentacoes_caixas.registros_enviados,
            orcamentos: contextoFinanceiro.orcamentos.quantidade,
            metas: contextoFinanceiro.metas.quantidade
        })

        // Encaminha a mensagem e os dados financeiros ao FastAPI.
        const respostaIA = await fetch('http://127.0.0.1:8000/chat', {
            method: 'POST',

            headers: {
                'Content-Type': 'application/json',
                'X-SGF-Internal-Token': process.env.SGF_INTERNAL_TOKEN
            },

            body: JSON.stringify({
                mensagem: mensagem.trim(),
                pagina,
                usuario_id: usuarioId,
                contexto_financeiro: contextoFinanceiro
            }),

            signal: AbortSignal.timeout(120000)
        })

        const dados = await respostaIA.json()

        if (!respostaIA.ok) {
            console.error('Erro retornado pelo FastAPI:', dados)

            return res.status(502).json({
                mensagem: 'Não foi possível obter uma resposta do assistente.'
            })
        }

        if (typeof dados.resposta !== 'string') {
            console.error('Resposta inválida recebida do FastAPI:', dados)

            return res.status(502).json({
                mensagem: 'O assistente retornou uma resposta inválida.'
            })
        }

        return res.json({
            resposta: dados.resposta
        })

    } catch (erro) {
        console.error('Erro na comunicação com o assistente:', erro)

        return res.status(503).json({
            mensagem: 'O assistente está temporariamente indisponível.'
        })
    }
})

module.exports = router
