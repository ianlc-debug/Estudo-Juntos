const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
require('dotenv').config();

const db = require('./src/database');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Rota de Teste Inicial
app.get('/', (req, res) => {
    res.json({ mensagem: 'API rodando com sucesso!' });
});

// Rota de Cadastro de Utilizadores
app.post('/api/registro', async (req, res) => {
    const { nome_usuario, email, senha } = req.body;

    // 1. Validação de campos obrigatórios
    if (!nome_usuario || !email || !senha) {
        return res.status(400).json({ erro: 'Todos os campos são obrigatórios.' });
    }

    // 2. Validação de formato de e-mail real usando Regex
    const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regexEmail.test(email)) {
        return res.status(400).json({ erro: 'Formato de e-mail inválido.' });
    }

    // 3. Validação de restrições do Nome de Usuário (3 a 20 caracteres, sem espaços ou símbolos especiais)
    const regexUsuario = /^[a-zA-Z0-9_]{3,20}$/;
    if (!regexUsuario.test(nome_usuario)) {
        return res.status(400).json({ 
            erro: 'O nome de usuário deve ter entre 3 e 20 caracteres e conter apenas letras, números e sublinhado (_).' 
        });
    }

    // 4. Validação de restrições da Senha (mínimo de 6 caracteres)
    if (senha.length < 6) {
        return res.status(400).json({ erro: 'A senha deve ter pelo menos 6 caracteres.' });
    }

    try {
        // 5. Criptografia segura da senha com bcrypt
        const saltRounds = 10;
        const senhaCriptografada = await bcrypt.hash(senha, saltRounds);

        // 6. Inserção na Base de Dados MySQL
        const query = 'INSERT INTO usuarios (nome_usuario, email, senha) VALUES (?, ?, ?)';
        
        db.query(query, [nome_usuario, email, senhaCriptografada], (err, resultado) => {
            if (err) {
                // Tratamento caso o e-mail ou nome de usuário já existam
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ erro: 'E-mail ou nome de usuário já estão em uso.' });
                }
                return res.status(500).json({ erro: 'Erro interno no servidor ao cadastrar usuário.' });
            }

            return res.status(201).json({ mensagem: 'Usuário cadastrado com sucesso!' });
        });

    } catch (error) {
        return res.status(500).json({ erro: 'Erro ao processar os dados de segurança.' });
    }
});

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});