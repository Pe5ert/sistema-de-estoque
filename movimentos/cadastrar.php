<?php
$root = $_SERVER['DOCUMENT_ROOT'] . '/Estoque';
include_once $root . '/config/conexao.php';
include_once $root . '/config/auth.php';
requireLogin();

// Buscar produtos para o select
$stmt = $pdo->query("SELECT id, nome, qtd FROM produtos ORDER BY nome");
$produtos = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Verificar se há produto_id e quantidade sugerida na URL
$produto_id_sugerido = isset($_GET['produto_id']) ? $_GET['produto_id'] : '';
$qtd_sugerido = isset($_GET['qtd_sugerido']) ? $_GET['qtd_sugerido'] : '';

if ($_POST) {
    csrfCheck();
    $produto_id = $_POST['produto_id'];
    $tipo = $_POST['tipo'];
    $qtd = $_POST['qtd'];
    
    // Validações
    if ($qtd <= 0) {
        $erro = "A quantidade deve ser maior que zero!";
    } else {
        // Verificar estoque para saídas
        if ($tipo == 'S') {
            $stmt = $pdo->prepare("SELECT qtd FROM produtos WHERE id = ?");
            $stmt->execute([$produto_id]);
            $produto = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($produto['qtd'] < $qtd) {
                $erro = "Estoque insuficiente! Disponível: " . $produto['qtd'] . " unidades";
            }
        }
        
        if (!isset($erro)) {
            // Inserir movimento
            $stmt = $pdo->prepare("INSERT INTO movimentos (produto_id, tipo, qtd, data) VALUES (?, ?, ?, NOW())");
            
            if ($stmt->execute([$produto_id, $tipo, $qtd])) {
                // Atualizar estoque do produto
                if ($tipo == 'E') {
                    $stmt = $pdo->prepare("UPDATE produtos SET qtd = qtd + ? WHERE id = ?");
                } else {
                    $stmt = $pdo->prepare("UPDATE produtos SET qtd = qtd - ? WHERE id = ?");
                }
                $stmt->execute([$qtd, $produto_id]);
                
                header('Location: index.php?sucesso=movimentacao_registrada');
                exit;
            } else {
                $erro = "Erro ao registrar movimentação!";
            }
        }
    }
}
?>

<?php include '../includes/header.php'; ?>

<h1>Nova Movimentação</h1>

<?php if (isset($erro)): ?>
    <div class="alert alert-danger"><?php echo $erro; ?></div>
<?php endif; ?>

<form method="POST">
    <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars(csrfToken()); ?>">
    <div class="mb-3">
        <label for="produto_id" class="form-label">Produto</label>
        <select class="form-control" id="produto_id" name="produto_id" required>
            <option value="">Selecione um produto</option>
            <?php foreach ($produtos as $produto): ?>
            <option value="<?php echo $produto['id']; ?>" 
                    data-estoque="<?php echo $produto['qtd']; ?>"
                    <?php echo ($produto['id'] == $produto_id_sugerido) ? 'selected' : ''; ?>>
                <?php echo htmlspecialchars($produto['nome']); ?> 
                (Estoque: <?php echo $produto['qtd']; ?>)
            </option>
            <?php endforeach; ?>
        </select>
    </div>
    
    <div class="mb-3">
        <label for="tipo" class="form-label">Tipo de Movimentação</label>
        <select class="form-control" id="tipo" name="tipo" required>
            <option value="E">Entrada (Aumenta estoque)</option>
            <option value="S">Saída (Diminui estoque)</option>
        </select>
    </div>
    
    <div class="mb-3">
        <label for="qtd" class="form-label">Quantidade</label>
        <input type="number" class="form-control" id="qtd" name="qtd" min="1" 
               value="<?php echo $qtd_sugerido ? $qtd_sugerido : ''; ?>" required>
        <small class="form-text text-muted" id="estoque-info"></small>
    </div>
    
    <button type="submit" class="btn btn-primary">Registrar Movimentação</button>
    <a href="index.php" class="btn btn-secondary">Cancelar</a>
</form>

<script>
document.addEventListener('DOMContentLoaded', function() {
    const produtoSelect = document.getElementById('produto_id');
    const tipoSelect = document.getElementById('tipo');
    const qtdInput = document.getElementById('qtd');
    const estoqueInfo = document.getElementById('estoque-info');
    
    function atualizarInfoEstoque() {
        const selectedOption = produtoSelect.options[produtoSelect.selectedIndex];
        const estoque = selectedOption.getAttribute('data-estoque') || 0;
        
        if (tipoSelect.value === 'S') {
            qtdInput.max = estoque;
            estoqueInfo.textContent = 'Estoque atual: ' + estoque + ' unidades (Máximo para saída: ' + estoque + ')';
        } else {
            qtdInput.removeAttribute('max');
            estoqueInfo.textContent = 'Estoque atual: ' + estoque + ' unidades';
        }
    }
    
    produtoSelect.addEventListener('change', atualizarInfoEstoque);
    tipoSelect.addEventListener('change', atualizarInfoEstoque);
    
    // Inicializar
    atualizarInfoEstoque();
});
</script>

<?php include '../includes/footer.php'; ?>