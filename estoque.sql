-- Script SQL para criar o banco de dados 'estoque'
-- Execute este script no phpMyAdmin ou em um cliente MySQL

-- Criar o banco de dados
CREATE DATABASE IF NOT EXISTS estoque CHARACTER SET utf8 COLLATE utf8_general_ci;

-- Usar o banco de dados
USE estoque;

-- Criar tabela produtos
CREATE TABLE produtos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    preco_custo DECIMAL(10,2) NOT NULL,
    preco_venda DECIMAL(10,2) NOT NULL,
    qtd INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Criar tabela movimentos
CREATE TABLE movimentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    produto_id INT NOT NULL,
    tipo CHAR(1) NOT NULL COMMENT 'E para Entrada, S para Saída',
    qtd INT NOT NULL,
    data DATETIME NOT NULL,
    FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Inserir alguns dados de exemplo (opcional)
INSERT INTO produtos (nome, preco_custo, preco_venda, qtd) VALUES
('Produto Exemplo 1', 10.50, 15.00, 100),
('Produto Exemplo 2', 20.00, 30.00, 50);