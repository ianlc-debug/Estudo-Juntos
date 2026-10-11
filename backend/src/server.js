const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
require('dotenv').config();

const db = require('./database');

const app = express();
const port = process.env.PORT || 3000;
// Conexões SSE mantidas por usuário para entregar mensagens sem polling.
const conexoesMensagens = new Map();
// UPLOADS_DIR pode apontar para um volume persistente em produção. Localmente,
// manter os arquivos ao lado do backend evita que a pasta pessoal do usuário
// mude entre processos e deixe anexos recém-enviados inacessíveis.
const pastaUploads = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads');
const pastasUploadsLegadas = [
  path.join(os.homedir(), '.estudo-juntos', 'uploads'),
  path.join(__dirname, '..', 'uploads'),
].filter((pasta) => path.resolve(pasta) !== path.resolve(pastaUploads));

async function localizarArquivoUpload(nomeArquivo) {
  const nomeSeguro = path.basename(nomeArquivo);
  const pastas = [pastaUploads, ...pastasUploadsLegadas];
  for (const pasta of pastas) {
    const caminho = path.join(pasta, nomeSeguro);
    try {
      await fs.access(caminho);
      return caminho;
    } catch (erro) {
      if (erro.code !== 'ENOENT') throw erro;
    }
  }
  return path.join(pastaUploads, nomeSeguro);
}

app.use(cors());
app.use(express.json());

// Sessões assinadas: o ID do usuário vem do token validado, nunca do corpo enviado pelo navegador.
const segredoSessao = process.env.SESSION_SECRET;
function criarToken(usuario) {
    const payload = Buffer.from(JSON.stringify({ id: usuario.id, nome: usuario.nome_usuario, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })).toString('base64url');
    const assinatura = crypto.createHmac('sha256', segredoSessao).update(payload).digest('base64url');
    return `${payload}.${assinatura}`;
}
function gerarIdPublico() {
    return crypto.randomInt(100000, 1000000).toString();
}
async function garantirIdPublico(usuarioId, idExistente) {
    if (idExistente) return idExistente;

    for (let tentativa = 0; tentativa < 10; tentativa++) {
        const novoId = gerarIdPublico();
        try {
            const [resultado] = await db.promise().query(
                'UPDATE usuarios SET id_publico = ? WHERE id = ? AND id_publico IS NULL',
                [novoId, usuarioId]
            );
            if (resultado.affectedRows > 0) return novoId;

            const [linhas] = await db.promise().query('SELECT id_publico FROM usuarios WHERE id = ?', [usuarioId]);
            if (linhas[0]?.id_publico) return linhas[0].id_publico;
        } catch (erro) {
            if (erro.code === 'ER_DUP_ENTRY') continue;
            throw erro;
        }
    }

    throw new Error('Não foi possível gerar um ID público único.');
}
function autenticar(req, res, next) {
    if (!segredoSessao) return res.status(500).json({ erro: 'SESSION_SECRET não foi configurado no servidor.' });
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const [payload, assinatura] = token.split('.');
    if (!payload || !assinatura) return res.status(401).json({ erro: 'Faça login para continuar.' });
    const esperada = crypto.createHmac('sha256', segredoSessao).update(payload).digest();
    let recebida;
    try { recebida = Buffer.from(assinatura, 'base64url'); } catch { return res.status(401).json({ erro: 'Sessão inválida.' }); }
    if (recebida.length !== esperada.length || !crypto.timingSafeEqual(recebida, esperada)) return res.status(401).json({ erro: 'Sessão inválida.' });
    try {
        const dados = JSON.parse(Buffer.from(payload, 'base64url').toString());
        if (!dados.id || dados.exp < Date.now()) return res.status(401).json({ erro: 'Sessão expirada. Entre novamente.' });
        req.usuario = dados;
        next();
    } catch { return res.status(401).json({ erro: 'Sessão inválida.' }); }
}

function notificarUsuarioMensagens(usuarioId, evento, dados) {
  const conexoes = conexoesMensagens.get(Number(usuarioId));
  if (!conexoes) return;
  const pacote = `event: ${evento}\ndata: ${JSON.stringify(dados)}\n\n`;
  for (const resposta of conexoes) {
    if (!resposta.writableEnded) resposta.write(pacote);
  }
}




async function usuarioTemContato(usuarioId, contatoId) {
  const [linhas] = await db.promise().query(
    'SELECT 1 FROM contatos_usuarios WHERE usuario_id = ? AND contato_id = ? LIMIT 1',
    [usuarioId, contatoId]
  );
  return linhas.length > 0;
}

function iniciarServidor() {
  const contexto = { db, autenticar, segredoSessao, criarToken, gerarIdPublico, garantirIdPublico, bcrypt, express, fs, crypto, path, pastaUploads, localizarArquivoUpload, notificarUsuarioMensagens, usuarioTemContato, conexoesMensagens };
  require('./routes/usuarios')(app, contexto);
  const helpersGrupos = require('./routes/grupos')(app, contexto);
  const contextoComGrupos = { ...contexto, ...helpersGrupos };
  require('./routes/participantes')(app, contextoComGrupos);
  require('./routes/agenda-comunidade')(app, contextoComGrupos);
  require('./routes/mensagens')(app, contextoComGrupos);
  require('./routes/atividades')(app, contextoComGrupos);
  app.use((erro, req, res, next) => {
  if (res.headersSent) return next(erro);
  if (erro.type === 'entity.too.large') {
    return res.status(413).json({ erro: 'O arquivo excede o limite permitido de 20 MB.' });
  }
  console.error('Erro ao processar requisição:', erro);
  return res.status(Number(erro.status) || 500).json({ erro: 'Não foi possível processar a requisição.' });
});
  app.listen(port, () => console.log(`Servidor rodando na porta ${port}`));
}

module.exports = { app, iniciarServidor };
