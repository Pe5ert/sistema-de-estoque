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
<link rel="stylesheet" href="https://cdn.datatables.net/responsive/2.5.0/css/responsive.bootstrap5.min.css">
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script src="https://cdn.datatables.net/1.13.4/js/jquery.dataTables.min.js"></script>
<script src="https://cdn.datatables.net/1.13.4/js/dataTables.bootstrap5.min.js"></script>
<script src="https://cdn.datatables.net/responsive/2.5.0/js/dataTables.responsive.min.js"></script>
<script src="https://cdn.datatables.net/responsive/2.5.0/js/responsive.bootstrap5.min.js"></script>

<!-- Scripts Customizados -->
<script>
$(document).ready(function() {
    var table = $('#dataTable');
    var tableOptions = {
        "language": {
            "url": "//cdn.datatables.net/plug-ins/1.13.4/i18n/pt-BR.json"
        },
        "responsive": true,
        "ordering": true,
        "searching": true,
        "pageLength": 25,
        "lengthMenu": [10, 25, 50, 100]
    };

    if (table.attr('data-server-side') === 'true') {
        var isMovementsTable = table.data('table-type') === 'movimentos';
        tableOptions.serverSide = true;
        tableOptions.processing = true;
        tableOptions.ajax = table.data('table-endpoint');
        tableOptions.columns = isMovementsTable
            ? [{ data: 0 }, { data: 1 }, { data: 2 }, { data: 3 }, { data: 4 }, { data: 5 }]
            : [{ data: 0 }, { data: 1 }, { data: 2 }, { data: 3 }, { data: 4 }, { data: 5 }, { data: 6 }];
    }

    table.DataTable(tableOptions);

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