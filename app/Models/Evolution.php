<?php

namespace App\Models;

use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Evolution extends Model
{
    use BelongsToTenant, HasUuids, SoftDeletes;

    protected $table = 'evolutions';

    /**
     * Medical records require an audit trail; keep created_at/updated_at so
     * every edit to a prontuário is timestamped.
     */
    public $timestamps = true;

    public const TYPE_SOAP = 'soap';

    public const TYPE_SIMPLE = 'simple';

    public const TYPE_PILATES = 'pilates';

    public const TYPES = [self::TYPE_SOAP, self::TYPE_SIMPLE, self::TYPE_PILATES];

    /**
     * Rating options for each Pilates movement quality, best to worst.
     * Mirrored in resources/js/lib/pilates-scales.ts.
     *
     * @var array<string, array<string, string>>
     */
    public const PILATES_SCALES = [
        'estabilidade' => ['excelente' => 'Excelente', 'boa' => 'Boa', 'regular' => 'Regular', 'comprometida' => 'Comprometida'],
        'mobilidade' => ['excelente' => 'Excelente', 'boa' => 'Boa', 'regular' => 'Regular', 'restrita' => 'Restrita'],
        'forca' => ['excelente' => 'Excelente', 'adequada' => 'Adequada', 'regular' => 'Regular', 'baixa' => 'Baixa'],
        'coordenacao' => ['excelente' => 'Excelente', 'boa' => 'Boa', 'regular' => 'Regular', 'insuficiente' => 'Insuficiente'],
    ];

    /**
     * Columns each form fills in. When a record switches form, the columns
     * that only the previous form used are cleared so no stale data is left.
     *
     * @var array<string, list<string>>
     */
    public const FIELDS_BY_TYPE = [
        self::TYPE_SOAP => [
            'clinical_protocol_id', 'queixa_principal', 'relato_paciente', 'dor_eva', 'localizacao_dor',
            'tipo_dor', 'pressao_arterial', 'frequencia_cardiaca', 'saturacao', 'amplitude_movimento',
            'forca_muscular', 'avaliacao_funcional', 'avaliacao_postural', 'condutas_realizadas',
            'parametros_conduta', 'resposta_tratamento', 'evolucao_status', 'analise_profissional',
            'conduta_planejada', 'orientacoes_domiciliares',
        ],
        self::TYPE_SIMPLE => ['observacoes'],
        self::TYPE_PILATES => [
            'estabilidade', 'mobilidade', 'forca', 'coordenacao', 'tem_dor', 'dor_eva', 'localizacao_dor',
            'tem_limitacao', 'limitacao_detalhe', 'tem_contraindicacao', 'contraindicacao_detalhe', 'observacoes',
        ],
    ];

    protected $fillable = [
        'tenant_id',
        'paciente_id',
        'agendamento_id',
        'clinical_protocol_id',
        'profissional_id',
        'data_atendimento',
        'tipo_atendimento',
        'dor_eva',
        'localizacao_dor',
        'tipo_dor',
        'queixa_principal',
        'relato_paciente',
        'intercorrencias',
        'pressao_arterial',
        'frequencia_cardiaca',
        'saturacao',
        'amplitude_movimento',
        'forca_muscular',
        'avaliacao_funcional',
        'avaliacao_postural',
        'condutas_realizadas',
        'parametros_conduta',
        'resposta_tratamento',
        'evolucao_status',
        'analise_profissional',
        'conduta_planejada',
        'orientacoes_domiciliares',
        'proxima_sessao',
        'assinatura_digital',
        'observacoes',
        'evolution_type',
        'estabilidade',
        'mobilidade',
        'forca',
        'coordenacao',
        'tem_dor',
        'tem_limitacao',
        'limitacao_detalhe',
        'tem_contraindicacao',
        'contraindicacao_detalhe',
    ];

    protected function casts(): array
    {
        return [
            'data_atendimento' => 'datetime',
            'proxima_sessao' => 'date',
            'tem_dor' => 'boolean',
            'tem_limitacao' => 'boolean',
            'tem_contraindicacao' => 'boolean',
        ];
    }

    /**
     * Columns that the given form does not use, to be cleared on a type switch.
     *
     * @return list<string>
     */
    public static function fieldsOutsideType(string $type): array
    {
        $all = array_unique(array_merge(...array_values(self::FIELDS_BY_TYPE)));

        return array_values(array_diff($all, self::FIELDS_BY_TYPE[$type] ?? []));
    }

    /**
     * Human label for a Pilates rating, e.g. ('forca', 'adequada') => 'Adequada'.
     */
    public static function pilatesLabel(string $field, ?string $value): ?string
    {
        return $value === null ? null : (self::PILATES_SCALES[$field][$value] ?? $value);
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class, 'paciente_id');
    }

    public function appointment()
    {
        return $this->belongsTo(Appointment::class, 'agendamento_id');
    }

    public function professional()
    {
        return $this->belongsTo(User::class, 'profissional_id');
    }

    public function photos()
    {
        return $this->hasMany(EvolutionPhoto::class, 'evolucao_id');
    }

    public function clinicalProtocol()
    {
        return $this->belongsTo(ClinicalProtocol::class);
    }
}
