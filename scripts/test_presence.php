<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

$request = Illuminate\Http\Request::create('/presence/users', 'GET');
$app->instance('request', $request);
$kernel->bootstrap();

// Ensure session store is available and set auth.user
$sessionManager = $app->make('session');
$store = $app->make('session.store');
$store->start();
$request->setLaravelSession($store);
$request->session()->put('auth.user', ['id' => 1]);

$controller = new App\Http\Controllers\PresenceController();
try {
    $response = $controller->users($request);
    var_dump($response instanceof \Illuminate\Http\JsonResponse);
    var_dump($response->getContent());
} catch (\Exception $e) {
    echo "Exception: " . get_class($e) . " - " . $e->getMessage() . "\n";
    echo $e->getTraceAsString();
}
