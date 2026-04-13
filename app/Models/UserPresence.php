<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserPresence extends Model
{
    protected $table = 'user_presences';
    protected $primaryKey = 'session_id';
    public $incrementing = false;
    public $timestamps = false;
    protected $keyType = 'string';

    protected $fillable = [
        'session_id',
        'user_id',
        'last_seen',
    ];
}
