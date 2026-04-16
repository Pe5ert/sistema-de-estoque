<!-- Footer -->
<footer class="footer mt-auto py-3 bg-light border-top">
    <div class="container-fluid">
        <div class="row align-items-center">
            <div class="col-md-6 text-center text-md-start">
                <span class="text-muted">
                    <i class="fas fa-boxes text-primary"></i> 
                    <strong class="text-dark">Sistema de Estoque</strong> &copy; <?php echo date('Y'); ?>
                </span>
            </div>
            <div class="col-md-6 text-center text-md-end">
                <span class="text-muted">
                    <i class="fas fa-cube text-primary"></i> 
                    Gestão Inteligente
                </span>
            </div>
        </div>
    </div>
</footer>

<!-- Scripts do Bootstrap -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>

<!-- DataTables -->
<script src="https://cdn.datatables.net/1.13.4/js/jquery.dataTables.min.js"></script>
<script src="https://cdn.datatables.net/1.13.4/js/dataTables.bootstrap5.min.js"></script>

<!-- Scripts Customizados -->
<script>
$(document).ready(function() {
    // Inicializar DataTable
    $('#dataTable').DataTable({
        "language": {
            "url": "//cdn.datatables.net/plug-ins/1.13.4/i18n/pt-BR.json"
        },
        "responsive": true,
        "ordering": true,
        "searching": true,
        "pageLength": 10,
        "lengthMenu": [10, 25, 50, 100]
    });

    // Auto-hide alerts após 5 segundos
    setTimeout(function() {
        $('.alert').alert('close');
    }, 5000);

    // Tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[title]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
});
</script>

</body>
</html>