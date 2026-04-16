<?php
// config/paths.php - Caminhos universais
$root_path = $_SERVER['DOCUMENT_ROOT'] . '/Estoque';

// Função para incluir arquivos de forma segura
function includeSafe($file) {
    global $root_path;
    $full_path = $root_path . '/' . $file;
    if (file_exists($full_path)) {
        include $full_path;
        return true;
    }
    return false;
}
?>