-- Execute uma única vez no banco estudo_juntos, depois da migração de convites e membros.
USE estudo_juntos;

CREATE TABLE solicitacoes_grupo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    grupo_id INT NOT NULL,
    solicitante_id INT NOT NULL,
    status ENUM('pendente', 'aceito', 'rejeitado') NOT NULL DEFAULT 'pendente',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    respondido_em TIMESTAMP NULL DEFAULT NULL,
    CONSTRAINT fk_solicitacoes_grupo FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
    CONSTRAINT fk_solicitacoes_usuario FOREIGN KEY (solicitante_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_solicitacoes_status_grupo (status, grupo_id),
    INDEX idx_solicitacoes_usuario (solicitante_id, grupo_id, status)
) ENGINE=InnoDB;
