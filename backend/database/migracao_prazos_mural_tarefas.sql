-- Execute uma única vez no banco existente para habilitar prazos,
-- anexos no mural, conclusão por usuário e ocultação de tarefas vencidas.
ALTER TABLE grupo_atividades ADD COLUMN prazo DATE NULL;

ALTER TABLE grupo_recados
    ADD COLUMN nome_arquivo VARCHAR(255) NULL,
    ADD COLUMN caminho_arquivo VARCHAR(100) NULL,
    ADD COLUMN tipo_arquivo VARCHAR(150) NULL,
    ADD COLUMN tamanho_arquivo BIGINT UNSIGNED NULL;

ALTER TABLE eventos_particulares
    ADD COLUMN concluida TINYINT NOT NULL DEFAULT 0;

CREATE TABLE grupo_atividade_estado (
    atividade_id INT NOT NULL,
    usuario_id INT NOT NULL,
    concluida TINYINT NOT NULL DEFAULT 0,
    ocultar_calendario TINYINT NOT NULL DEFAULT 0,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (atividade_id, usuario_id),
    CONSTRAINT fk_atividade_estado_atividade FOREIGN KEY (atividade_id) REFERENCES grupo_atividades(id) ON DELETE CASCADE,
    CONSTRAINT fk_atividade_estado_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);
