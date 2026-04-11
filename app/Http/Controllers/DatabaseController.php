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
        $tables = $pdo->query("SHOW TABLES")->fetchAll(\PDO::FETCH_COLUMN);

        $filename = 'backup_' . now()->format('Y_m_d_H_i_s') . '.sql';

        return response()->streamDownload(function () use ($pdo, $tables) {
            foreach ($tables as $table) {
                $createTable = $pdo->query("SHOW CREATE TABLE `$table`")->fetch(\PDO::FETCH_ASSOC);
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
                        $values  = array_map([$pdo, 'quote'], array_values($row));

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
        }, $filename, [
            'Content-Type'        => 'application/sql',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Pragma'              => 'no-cache',
            'Expires'             => '0',
        ]);
    }
}