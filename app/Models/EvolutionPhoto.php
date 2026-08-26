<?php

namespace App\Models;

use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class EvolutionPhoto extends Model
{
    use BelongsToTenant, HasUuids;

    protected $table = 'evolution_photos';
    
    public $timestamps = false; // Supabase only uses data_upload instead of created_at/updated_at here

    protected $fillable = [
        'tenant_id',
        'evolucao_id',
        'caminho_arquivo',
        'descricao',
        'data_upload'
    ];
    
    protected function casts(): array
    {
        return [
            'data_upload' => 'datetime',
        ];
    }

    public function evolution()
    {
        return $this->belongsTo(Evolution::class, 'evolucao_id');
    }
}
