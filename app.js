
const express = require('express')
const app = express()
const path = require('path')
const session = require('express-session')

const usuariosRoutes = require('./routes/usuarios')
const movimentacoesRoutes = require('./routes/movimentacoes')
const categoriasRoutes = require('./routes/categorias')
const orcamentosRoutes = require('./routes/orcamentos')

const port = 3000

function Middleware(req, res, next) {
    console.log(`${req.method} ${req.url}`)
    next()
}

app.use(Middleware)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use(session({
    secret: process.env.SESSION_SECRET || 'segredo-temporario-desenvolvimento',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        maxAge: 1000 * 60 * 60 * 2
    }
}))

app.use(express.static(path.join(__dirname, 'templates')))

app.use('/auth', require('./routes/auth'))
app.use('/usuarios', usuariosRoutes)
app.use('/movimentacoes', movimentacoesRoutes)
app.use('/categorias', categoriasRoutes)
app.use('/orcamentos', orcamentosRoutes)


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'templates', 'html', 'login.html'))
})

app.get('/interface-usuarios', (req, res) => {
    res.sendFile(path.join(__dirname, 'templates', 'html', 'login.html'))
})

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`)
})
