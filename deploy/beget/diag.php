<?php
/* Временная диагностика: открыть /diag.php, потом удалить файл */
header('Content-Type: text/plain; charset=utf-8');
echo 'PHP: ' . PHP_VERSION . "\n";
echo 'PDO drivers: ' . (implode(', ', PDO::getAvailableDrivers()) ?: 'НЕТ') . "\n";
echo 'str_starts_with: ' . (function_exists('str_starts_with') ? 'есть' : 'НЕТ (PHP < 8)') . "\n";
$d = __DIR__ . '/server/data';
echo 'server/data: ' . (is_dir($d) ? 'есть' : 'НЕТ') . ', запись: ' . (is_writable($d) ? 'да' : 'НЕТ') . "\n";
$db = $d . '/leads.db';
echo 'leads.db: ' . (is_file($db) ? 'есть (' . round(filesize($db) / 1024) . ' КБ)' : 'НЕТ') . "\n";
if (in_array('sqlite', PDO::getAvailableDrivers(), true)) {
    try {
        $pdo = new PDO('sqlite:' . $db);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        echo 'SQLite подключился, заявок в базе: ' . $pdo->query('SELECT COUNT(*) FROM leads')->fetchColumn() . "\n";
    } catch (Throwable $e) {
        echo 'Ошибка SQLite: ' . $e->getMessage() . "\n";
    }
} else {
    echo "Драйвер sqlite недоступен — включите pdo_sqlite в настройках PHP сайта\n";
}
