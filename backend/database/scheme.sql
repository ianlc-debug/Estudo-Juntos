USE estudo_juntos;

CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome_usuario VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE grupos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_unico VARCHAR(100) NOT NULL UNIQUE,
    nome VARCHAR(150) NOT NULL,
    materia VARCHAR(150) NOT NULL,
    privacidade VARCHAR(50) NOT NULL,
    codigo VARCHAR(20) NOT NULL,
    criador VARCHAR(50) NOT NULL,
    criador_id INT NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_grupos_criador FOREIGN KEY (criador_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_grupos_privacidade_criador (privacidade, criador_id)
);
