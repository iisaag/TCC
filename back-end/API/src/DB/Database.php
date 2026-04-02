<?php
require_once __DIR__ . "/../../http/response.php";
require_once __DIR__ . "/../../utils/logger.php";

class Database
{
  private const HOST = '127.0.0.1';
  private const USER = 'root';
  private const PASSWORD = '';
  private const DATABASE = 'mydb';


  private static ?PDO $CONNECTION = null;

  public static function getConnection(): PDO|null
  {
    if (Database::$CONNECTION === null) {
      Database::connect();
    }
    return Database::$CONNECTION;
  }

  private static function connect(): PDO
  {
    $dsn = sprintf(
      'mysql:host=%s;port=%d;dbname=%s;charset=%s',
      Database::HOST,
      3306,
      Database::DATABASE,
      'utf8mb4'
    );

    Database::$CONNECTION = new PDO(
      $dsn,
      Database::USER,
      Database::PASSWORD,
      [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_OBJ
      ]
    );

    return Database::$CONNECTION;
  }

  public static function backup(): void
  {
    $backupPath = "system/backup_" . date('Y_m_d_H_i_s') . ".sql";

    $directory = dirname($backupPath);
    if (!is_dir($directory)) {
      mkdir($directory, 0777, true);
    }

    $pdo = self::getConnection();
    $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);

    $backupFile = fopen($backupPath, 'w');

    if ($backupFile === false) {
      Logger::log(new \Exception('Erro ao criar o arquivo de backup.'));
      (new Response(
        success: false,
        message: 'Erro ao criar o arquivo de backup.',
        httpCode: 500
      ))->send();
      return;
    }

    foreach ($tables as $table) {
      $createTableStmt = $pdo->query("SHOW CREATE TABLE `$table`")->fetch(PDO::FETCH_ASSOC);
      fwrite($backupFile, $createTableStmt['Create Table'] . ";\n\n");

      $total = $pdo->query("SELECT COUNT(*) FROM `$table`")->fetchColumn();
      $limit = 1000;

      for ($offset = 0; $offset < $total; $offset += $limit) {
        $stmt = $pdo->prepare("SELECT * FROM `$table` LIMIT :limit OFFSET :offset");
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($rows as $row) {
          $columns = array_keys($row);
          $values = array_map([$pdo, 'quote'], array_values($row));

          $insertStmt = sprintf(
            "INSERT INTO `%s` (`%s`) VALUES (%s);\n",
            $table,
            implode('`, `', $columns),
            implode(', ', $values)
          );
          fwrite($backupFile, $insertStmt);
        }
      }

      fwrite($backupFile, "\n\n");
    }

    fclose($backupFile);

    header('Content-Description: File Transfer');
    header('Content-Type: application/sql');
    header('Content-Disposition: attachment; filename="' . basename($backupPath) . '"');
    header('Content-Length: ' . filesize($backupPath));
    header('Pragma: no-cache');
    header('Expires: 0');
    readfile($backupPath);

    exit;
  }
  
}
?>