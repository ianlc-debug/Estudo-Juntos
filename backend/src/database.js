const mysql = require('mysql2');
require('dotenv').config();

// Cria um Pool de conexões padrão (compatível com callbacks)
const connection = mysql.createPool({
    host: process.env.DB_HOST || process.env.MYSQLHOST,
    port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306),
    user: process.env.DB_USER || process.env.MYSQLUSER,
    password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD,
    database: process.env.DB_NAME || process.env.MYSQLDATABASE,
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
