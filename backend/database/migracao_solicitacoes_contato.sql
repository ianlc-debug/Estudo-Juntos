-- Execute uma vez em bancos que já receberam a migração de mensagens privadas.
USE estudo_juntos;

CREATE TABLE solicitacoes_contato (
    id INT AUTO_INCREMENT PRIMARY KEY,
    remetente_id INT NOT NULL,
    destinatario_id INT NOT NULL,
    status ENUM('pendente', 'aceita', 'recusada') NOT NULL DEFAULT 'pendente',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolvida_em TIMESTAMP NULL DEFAULT NULL,
    CONSTRAINT fk_solicitacoes_contato_remetente FOREIGN KEY (remetente_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_solicitacoes_contato_destinatario FOREIGN KEY (destinatario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_solicitacoes_contato_destinatario (destinatario_id, status, criado_em),
    INDEX idx_solicitacoes_contato_par (remetente_id, destinatario_id, status)
);
