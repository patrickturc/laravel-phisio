<?php

namespace App\Models;

use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class ClinicalProtocol extends Model
{
    use BelongsToTenant, HasUuids;

    public $timestamps = false;

    protected $fillable = [
        'tenant_id',
        'name',
        'description',
        'total_sessions',
        'notes',
    ];

    public function evolutions()
    {
        return $this->hasMany(Evolution::class);
    }
}
