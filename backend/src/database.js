const mysql = require('mysql2');
require('dotenv').config();

// Cria um Pool de conexões padrão (compatível com callbacks)
const connection = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    // TiDB Cloud exige TLS em conexões pelo endpoint público. Ele usa uma CA
    // pública confiável pelo Node.js, então não é necessário enviar o .pem no Render.
    ssl: process.env.DB_SSL === 'true' ? { minVersion: 'TLSv1.2' } : undefined,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Testa a conexão
connection.getConnection((err, conn) => {
    if (err) {
        console.error('Erro ao conectar ao MySQL:', err);
        return;
    }
    console.log('Conectado ao banco de dados MySQL com sucesso!');
    conn.release();
});

module.exports = connection;
