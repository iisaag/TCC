<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DatabaseController extends Controller
{
    public function backup(): StreamedResponse
    {
        $pdo    = DB::connection()->getPdo();
        // Sessões, tokens de senha, cache, filas e presença são temporários e sensíveis: ficam fora do backup.
        $ignoradas = ['sessions', 'password_reset_tokens', 'personal_access_tokens', 'cache', 'cache_locks', 'jobs', 'job_batches', 'failed_jobs', 'user_presences'];
        $tables = array_values(array_diff($pdo->query("SHOW TABLES")->fetchAll(\PDO::FETCH_COLUMN), $ignoradas));

        $filename = 'backup_' . now()->format('Y_m_d_H_i_s') . '.sql';

        return response()->streamDownload(function () use ($pdo, $tables) {
            // Desliga as chaves estrangeiras durante a restauração: as tabelas saem em ordem alfabética.
            echo "SET FOREIGN_KEY_CHECKS = 0;\n\n";

            foreach ($tables as $table) {
                $createTable = $pdo->query("SHOW CREATE TABLE `$table`")->fetch(\PDO::FETCH_ASSOC);
                echo "DROP TABLE IF EXISTS `$table`;\n";
                echo $createTable['Create Table'] . ";\n\n";

                $total = $pdo->query("SELECT COUNT(*) FROM `$table`")->fetchColumn();
                $limit = 1000;

                for ($offset = 0; $offset < $total; $offset += $limit) {
                    $stmt = $pdo->prepare("SELECT * FROM `$table` LIMIT :limit OFFSET :offset");
                    $stmt->bindValue(':limit',  $limit,  \PDO::PARAM_INT);
                    $stmt->bindValue(':offset', $offset, \PDO::PARAM_INT);
                    $stmt->execute();

                    foreach ($stmt->fetchAll(\PDO::FETCH_ASSOC) as $row) {
                        $columns = array_keys($row);
                        $values  = array_map(
                            fn ($valor) => $valor === null ? 'NULL' : $pdo->quote((string) $valor),
                            array_values($row)
                        );

                        echo sprintf(
                            "INSERT INTO `%s` (`%s`) VALUES (%s);\n",
                            $table,
                            implode('`, `', $columns),
                            implode(', ', $values)
                        );
                    }
                }

                echo "\n\n";
            }

            echo "SET FOREIGN_KEY_CHECKS = 1;\n";
        }, $filename, [
            'Content-Type'        => 'application/sql',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Pragma'              => 'no-cache',
            'Expires'             => '0',
        ]);
    }
}