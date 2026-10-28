const express = require('express')
const app = express()
const usuariosRoutes = require('./routes/usuarios')
const port = 3000
const path = require("path")

function Middleware(req, res, next) {
    console.log(`${req.method} ${req.url}`)
    next()
}

app.use(Middleware)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use(express.static(path.join(__dirname, 'templates')))

app.use("/auth", require("./routes/auth"))

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'templates', 'html', 'login.html'))
})

app.use('/usuarios', usuariosRoutes)

app.get('/interface-usuarios', (req, res) => {
    res.sendFile(path.join(__dirname, 'templates', 'html', 'login.html'))
})

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`)
})
