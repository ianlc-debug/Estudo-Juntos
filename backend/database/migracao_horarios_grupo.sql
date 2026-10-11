-- Execute uma vez em bancos existentes para habilitar horários semanais dos grupos.
CREATE TABLE grupo_horarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    grupo_id INT NOT NULL,
    dia VARCHAR(20) NOT NULL,
    inicio TIME NOT NULL,
    fim TIME NOT NULL,
    descricao VARCHAR(200) NOT NULL DEFAULT '',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_grupo_horarios_grupo FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
    CONSTRAINT uq_grupo_horarios UNIQUE (grupo_id, dia, inicio, fim),
    INDEX idx_grupo_horarios_grupo_dia (grupo_id, dia)
);
