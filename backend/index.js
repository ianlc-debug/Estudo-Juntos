const express = require('express');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
    res.json({ mensagem: 'API rodando com sucesso!' });
});

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});