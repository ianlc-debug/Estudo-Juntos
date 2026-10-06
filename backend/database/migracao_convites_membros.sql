-- Execute uma única vez no banco existente, com a API parada.
CREATE TABLE grupo_membros (
    grupo_id INT NOT NULL,
    usuario_id INT NOT NULL,
    administrador TINYINT(1) NOT NULL DEFAULT 0,
    ingressou_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (grupo_id, usuario_id),
    CONSTRAINT fk_grupo_membros_grupo FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
    CONSTRAINT fk_grupo_membros_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE convites_grupo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    grupo_id INT NOT NULL,
    convidante_id INT NOT NULL,
    convidado_id INT NOT NULL,
    status ENUM('pendente', 'aceito', 'rejeitado') NOT NULL DEFAULT 'pendente',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    respondido_em TIMESTAMP NULL DEFAULT NULL,
    CONSTRAINT fk_convites_grupo FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
    CONSTRAINT fk_convites_convidante FOREIGN KEY (convidante_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_convites_convidado FOREIGN KEY (convidado_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_convites_destinatario_status (convidado_id, status)
) ENGINE=InnoDB;

-- Grupos antigos: o criador é migrado para participante administrador.
INSERT INTO grupo_membros (grupo_id, usuario_id, administrador)
SELECT id, criador_id, 1
FROM grupos
WHERE criador_id IS NOT NULL
ON DUPLICATE KEY UPDATE administrador = 1;
