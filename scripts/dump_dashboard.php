<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
// Bootstrap the kernel to initialize config, DB, etc.
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$request = Illuminate\Http\Request::createFromGlobals();
$app->instance('request', $request);
$kernel->bootstrap();
$controller = new App\Http\Controllers\DashboardController();
$response = $controller->index($request);

echo $response->getContent();
