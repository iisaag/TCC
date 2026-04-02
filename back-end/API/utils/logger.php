<?php 
    class logger
    {
        private static string $LOG_FILE = __DIR__ . '/../../system/log.log';

        public static function log(Throwable $throwable):void 
        {
            $message = "throwable thrown:\n";
            $message .= "message: " . $throwable->getMessage() . "\n";
            $message .= "code: " . $throwable->getCode() . "\n";
            $message .= "file: " . $throwable->getFile() . "\n";
            $message .= "line: " . $throwable->getLine() . "\n";
            $message .= "trace: " . $throwable->getTraceAsString();
            self::writelog('Throwable', $message);
           
        } 


        public static function writelog(string $type, string $message): void 
        {
            $directoryPath = dirname(path: self::$LOG_FILE);
            if (!is_dir(filename: $directoryPath)) {
                mkdir(directory: $directoryPath, permissions: 0777, recursive:true);
            }
            $dateTime = date('Y-m-d H:i:s.v');
            $separador = str_repeat("*",100);
            $entry = "[$dateTime] [$type] \n $message \n $separador \n";
            file_put_contents(self::$LOG_FILE, $entry, FILE_APPEND | LOCK_EX);
        }
    }
?>