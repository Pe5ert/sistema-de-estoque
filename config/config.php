<?php
// config/config.php
if (!defined('ESTOQUE_BAIXO_LIMITE')) {
    define('ESTOQUE_BAIXO_LIMITE', 10); // Alerta quando estoque estiver abaixo de 10 unidades
}

if (!defined('SITE_NOME')) {
    define('SITE_NOME', 'Sistema de Estoque');
}
?>