<?php
$root = $_SERVER['DOCUMENT_ROOT'] . '/Estoque';
include_once $root . '/config/auth.php';
requireLogin();

header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="modelo_importacao_produtos.csv"');

$output = fopen('php://output', 'w');
// Cabeçalho
fputcsv($output, ['nome','preco_custo','preco_venda','qtd'], ';');
// Exemplos
fputcsv($output, ['Camiseta Branca', '10,00', '25,00', '100'], ';');
fputcsv($output, ['Caneca Azul', '5,50', '12,00', '50'], ';');
fputcsv($output, ['Caderno A5', '3.20', '8.00', '200'], ';');

fclose($output);
exit;
