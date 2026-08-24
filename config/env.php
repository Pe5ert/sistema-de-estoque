<?php
// config/env.php
// Carrega variáveis de um arquivo .env para o ambiente (getenv/$_ENV), sem sobrescrever variáveis já definidas.

function loadEnv(string $path): void
{
    if (!file_exists($path)) {
        return;
    }

    $linhas = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($linhas as $linha) {
        $linha = trim($linha);
        if ($linha === '' || str_starts_with($linha, '#')) {
            continue;
        }
        if (!str_contains($linha, '=')) {
            continue;
        }

        [$chave, $valor] = explode('=', $linha, 2);
        $chave = trim($chave);
        $valor = trim($valor);
        $valor = trim($valor, "\"'");

        if (getenv($chave) === false) {
            putenv("$chave=$valor");
            $_ENV[$chave] = $valor;
        }
    }
}

function env(string $chave, $padrao = null)
{
    $valor = getenv($chave);
    return $valor !== false ? $valor : $padrao;
}
