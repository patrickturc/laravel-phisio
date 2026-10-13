<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\ClinicalProtocol;
use App\Models\Evolution;
use App\Models\Membership;
use App\Models\Patient;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class EvolutionController extends Controller
{
    public function index(Request $request)
    {
        $query = Patient::whereHas('evolutions')
            ->with(['evolutions' => function ($q) {
                $q->orderBy('data_atendimento', 'desc')->take(1);
            }]);

        if ($request->filled('search')) {
            $query->whereLike('name', '%'.$request->search.'%');
        }

        if ($request->filled('tipo')) {
            $query->whereHas('evolutions', function ($q) use ($request) {
                $q->where('tipo_atendimento', $request->tipo);
            });
        }

        if ($request->filled('tab')) {
            if ($request->tab === 'pilates') {
                $query->where('type', 'pilates');
            } elseif ($request->tab === 'fisio') {
                $query->where('type', 'physiotherapy');
            }
        }

        $query->orderByRaw('(SELECT MAX(data_atendimento) FROM evolutions WHERE evolutions.paciente_id = patients.id) DESC');

        $evolutions = $query->paginate(15)->withQueryString();

        // Calculate pending evolutions (past appointments without an evolution)
        $now = now();
        $today = $now->toDateString();

        $recentAppointments = Appointment::with(['patients' => function ($q) {
            $q->wherePivotIn('status', ['scheduled', 'attended']);
        }, 'groupClass'])
            ->where('appointment_date', '>=', $now->copy()->subDays(14)->toDateString())
            ->where('appointment_date', '<=', $today)
            ->get();

        $pendingEvolutions = [];

        foreach ($recentAppointments as $appointment) {
            // Only consider past appointments based on start_time + duration
            $endTimeStr = $appointment->appointment_date->format('Y-m-d').' '.$appointment->start_time;
            try {
                $endTime = Carbon::parse($endTimeStr)->addMinutes($appointment->duration_minutes);
                if (! $endTime->isPast()) {
                    continue;
                }
            } catch (\Exception $e) {
                continue;
            }

            foreach ($appointment->patients as $patient) {
                // Check if evolution exists for this patient + appointment
                $hasEvolution = Evolution::where('agendamento_id', $appointment->id)
                    ->where('paciente_id', $patient->id)
                    ->exists();

                if (! $hasEvolution) {
                    $pendingEvolutions[] = [
                        'id' => $appointment->id.'_'.$patient->id,
                        'appointment_id' => $appointment->id,
                        'patient_id' => $patient->id,
                        'patient_name' => $patient->name,
                        'patient_type' => $patient->type,
                        'appointment_date' => $appointment->appointment_date->format('Y-m-d'),
                        'start_time' => Carbon::parse($appointment->start_time)->format('H:i'),
                        'title' => $appointment->type === 'group' ? ($appointment->groupClass->name ?? $appointment->title ?? 'Turma de Pilates') : 'Pilates/Individual',
                    ];
                }
            }
        }

        // Sort pending by date descending
        usort($pendingEvolutions, function ($a, $b) {
            $dateA = $a['appointment_date'].' '.$a['start_time'];
            $dateB = $b['appointment_date'].' '.$b['start_time'];

            return strcmp($dateB, $dateA);
        });

        $patients = Patient::orderBy('name')->get(['id', 'name', 'type']);
        $protocols = ClinicalProtocol::orderBy('name')->get(['id', 'name']);

        return Inertia::render('evolutions/index', [
            'evolutions' => $evolutions,
            'pendingEvolutions' => $pendingEvolutions,
            'patients' => $patients,
            'protocols' => $protocols,
            'filters' => $request->only(['search', 'tipo', 'tab']),
        ]);
    }

    public function create(Request $request)
    {
        $patients = Patient::orderBy('name')->get(['id', 'name', 'type']);

        // Load all available clinical protocols
        $protocols = ClinicalProtocol::orderBy('name')->get(['id', 'name', 'total_sessions']);

        return Inertia::render('evolutions/create', [
            'patients' => $patients,
            'selectedPatientId' => $request->query('paciente_id'),
            'selectedAppointmentId' => $request->query('agendamento_id'),
            'selectedClinicalProtocolId' => $request->query('clinical_protocol_id'),
            'protocols' => $protocols,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validateEvolution($request, creating: true);

        $linkedAuto = false;
        if (empty($validated['agendamento_id'])) {
            $appointment = Appointment::whereHas('patients', function ($q) use ($validated) {
                $q->where('patients.id', $validated['paciente_id']);
            })
                ->where('appointment_date', $validated['data_atendimento'])
                ->where('status', '!=', 'cancelled')
                ->whereDoesntHave('evolutions', function ($q) use ($validated) {
                    $q->where('paciente_id', $validated['paciente_id']);
                })
                ->first();

            if ($appointment) {
                $validated['agendamento_id'] = $appointment->id;
                $linkedAuto = true;
            }
        }

        $validated['profissional_id'] = auth()->id();
        $evolution = Evolution::create($validated);

        // Mark linked appointment as completed
        if ($evolution->agendamento_id) {
            $appointment = Appointment::find($evolution->agendamento_id);
            if ($appointment) {
                $appointment->update(['status' => 'completed']);
                // Mark the patient present and record the membership consumed.
                $membershipId = Membership::activeForAttendance(
                    $evolution->paciente_id,
                    $appointment->appointment_date->toDateString(),
                )?->id;
                $appointment->patients()->updateExistingPivot($evolution->paciente_id, [
                    'status' => 'attended',
                    'membership_id' => $membershipId,
                ]);
            }
        }

        $msg = $linkedAuto
            ? 'Evolução registrada e vinculada automaticamente à aula pendente do dia!'
            : 'Evolução registrada com sucesso!';

        return redirect()->back()->with('success', $msg);
    }

    public function show(Evolution $evolution)
    {
        $evolution->load(['patient', 'professional']);
        $protocols = ClinicalProtocol::orderBy('name')->get(['id', 'name']);

        return Inertia::render('evolutions/show', [
            'evolution' => $evolution,
            'protocols' => $protocols,
        ]);
    }

    public function patientEvolutions(Patient $patient)
    {
        $evolutions = Evolution::with('professional')
            ->where('paciente_id', $patient->id)
            ->orderBy('data_atendimento', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        $protocols = ClinicalProtocol::orderBy('name')->get(['id', 'name']);

        return Inertia::render('evolutions/patient-evolutions', [
            'patient' => $patient,
            'evolutions' => $evolutions,
            'protocols' => $protocols,
        ]);
    }

    public function edit(Evolution $evolution)
    {
        $patients = Patient::orderBy('name')->get(['id', 'name', 'type']);
        $protocols = ClinicalProtocol::orderBy('name')->get(['id', 'name']);

        return Inertia::render('evolutions/edit', [
            'evolution' => $evolution,
            'patients' => $patients,
            'protocols' => $protocols,
        ]);
    }

    public function update(Request $request, Evolution $evolution)
    {
        $validated = $this->validateEvolution($request, creating: false);

        // Clear whatever the previous form filled in that this one does not
        // use, so switching type never leaves stale data behind.
        foreach (Evolution::fieldsOutsideType($validated['evolution_type']) as $field) {
            $validated[$field] = null;
        }

        $evolution->update($validated);

        return back()->with('success', 'Evolução atualizada!');
    }

    /**
     * Latest evolutions of a patient, for the "Histórico recente" panel of
     * the evolution form.
     */
    public function recent(Patient $patient): JsonResponse
    {
        $evolutions = Evolution::with('professional:id,name')
            ->where('paciente_id', $patient->id)
            ->orderBy('data_atendimento', 'desc')
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get([
                'id', 'paciente_id', 'profissional_id', 'data_atendimento', 'evolution_type', 'tipo_atendimento',
                'estabilidade', 'mobilidade', 'forca', 'coordenacao', 'observacoes', 'queixa_principal',
            ]);

        return response()->json($evolutions);
    }

    /**
     * Validate an evolution against the rules of the form it came from and
     * normalize the defaults each form relies on.
     *
     * @return array<string, mixed>
     */
    private function validateEvolution(Request $request, bool $creating): array
    {
        $type = $request->input('evolution_type') ?: Evolution::TYPE_SOAP;

        // Heart rate and SpO2 are integer columns; people type "72 bpm" or
        // "98%", so keep only the number before validating it.
        foreach (['frequencia_cardiaca', 'saturacao'] as $field) {
            if (is_string($request->input($field))) {
                $request->merge([$field => preg_replace('/\D/', '', $request->input($field)) ?: null]);
            }
        }

        $rules = [
            'evolution_type' => ['nullable', Rule::in(Evolution::TYPES)],
            'paciente_id' => 'required|uuid|exists:patients,id',
            'data_atendimento' => 'required|date',
            ...$this->rulesForType($type),
        ];

        if ($creating) {
            $rules['agendamento_id'] = 'nullable|uuid|exists:appointments,id';
        }

        $validated = $request->validate($rules);
        $validated['evolution_type'] = $type;

        if ($type !== Evolution::TYPE_SOAP && empty($validated['tipo_atendimento'])) {
            $validated['tipo_atendimento'] = 'sessao';
        }

        if ($type === Evolution::TYPE_PILATES) {
            // Details only make sense when the matching question was "Sim".
            if (! $validated['tem_dor']) {
                $validated['dor_eva'] = null;
                $validated['localizacao_dor'] = null;
            }
            if (! $validated['tem_limitacao']) {
                $validated['limitacao_detalhe'] = null;
            }
            if (! $validated['tem_contraindicacao']) {
                $validated['contraindicacao_detalhe'] = null;
            }
        }

        return $validated;
    }

    /**
     * @return array<string, mixed>
     */
    private function rulesForType(string $type): array
    {
        if ($type === Evolution::TYPE_SIMPLE) {
            return [
                'observacoes' => 'required|string',
                'tipo_atendimento' => 'nullable|string',
            ];
        }

        if ($type === Evolution::TYPE_PILATES) {
            $scaleRules = [];
            foreach (Evolution::PILATES_SCALES as $field => $options) {
                $scaleRules[$field] = ['required', Rule::in(array_keys($options))];
            }

            return [
                ...$scaleRules,
                'tipo_atendimento' => 'nullable|in:avaliacao,reavaliacao,sessao',
                'tem_dor' => 'required|boolean',
                'dor_eva' => 'nullable|integer|min:0|max:10',
                'localizacao_dor' => 'nullable|string|max:255',
                'tem_limitacao' => 'required|boolean',
                'limitacao_detalhe' => 'nullable|string|max:1000',
                'tem_contraindicacao' => 'required|boolean',
                'contraindicacao_detalhe' => 'nullable|string|max:1000',
                'observacoes' => 'nullable|string',
            ];
        }

        return [
            'clinical_protocol_id' => 'nullable|uuid|exists:clinical_protocols,id',
            'tipo_atendimento' => 'required|in:avaliacao,reavaliacao,sessao',
            'queixa_principal' => 'nullable|string',
            'relato_paciente' => 'nullable|string',
            'dor_eva' => 'nullable|integer|min:0|max:10',
            'localizacao_dor' => 'nullable|string',
            'tipo_dor' => 'nullable|string',
            'pressao_arterial' => 'nullable|string',
            'frequencia_cardiaca' => 'nullable|integer|between:20,250',
            'saturacao' => 'nullable|integer|between:50,100',
            'amplitude_movimento' => 'nullable|string',
            'forca_muscular' => 'nullable|string',
            'avaliacao_funcional' => 'nullable|string',
            'avaliacao_postural' => 'nullable|string',
            'condutas_realizadas' => 'nullable|string',
            'parametros_conduta' => 'nullable|string',
            'resposta_tratamento' => 'nullable|string',
            'evolucao_status' => 'nullable|string',
            'analise_profissional' => 'nullable|string',
            'conduta_planejada' => 'nullable|string',
            'orientacoes_domiciliares' => 'nullable|string',
        ];
    }

    public function destroy(Request $request, Evolution $evolution)
    {
        $evolution->delete();

        // The "Histórico recente" panel deletes in place and must not navigate.
        if ($request->wantsJson()) {
            return response()->noContent();
        }

        return redirect()->route('evolutions.index')
            ->with('success', 'Evolução excluída!');
    }

    public function pdf(Evolution $evolution)
    {
        $evolution->load(['patient', 'professional']);

        $tipo = ['avaliacao' => 'Avaliação', 'reavaliacao' => 'Reavaliação', 'sessao' => 'Sessão'][$evolution->tipo_atendimento] ?? $evolution->tipo_atendimento;
        $date = Carbon::parse($evolution->data_atendimento)->format('d/m/Y');

        $html = '<!DOCTYPE html><html><head><meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; color: #333; margin: 40px; font-size: 14px; }
            h1 { color: #6366f1; font-size: 22px; margin-bottom: 4px; }
            h2 { color: #6366f1; font-size: 16px; margin-top: 24px; border-bottom: 2px solid #e5e7eb; padding-bottom: 4px; }
            .header { border-bottom: 3px solid #6366f1; padding-bottom: 16px; margin-bottom: 24px; }
            .meta { color: #666; font-size: 13px; }
            .field { margin-bottom: 12px; }
            .field-label { font-weight: bold; font-size: 12px; text-transform: uppercase; color: #888; letter-spacing: 0.5px; }
            .field-value { margin-top: 2px; }
            .vitals { display: flex; gap: 24px; }
            .vital-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 16px; }
            .scores { width: 100%; border-collapse: collapse; }
            .scores td { width: 25%; padding: 8px; border: 1px solid #e5e7eb; vertical-align: top; }
            .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #999; font-size: 11px; text-align: center; }
        </style></head><body>';

        $title = [
            Evolution::TYPE_SIMPLE => 'Evolução da Sessão',
            Evolution::TYPE_PILATES => 'Evolução de Pilates',
        ][$evolution->evolution_type] ?? 'Evolução Clínica (SOAP)';

        $html .= '<div class="header">';
        $html .= '<h1>'.$title.'</h1>';
        $html .= '<p class="meta"><strong>Paciente:</strong> '.e($evolution->patient->name ?? 'N/A').' &nbsp; | &nbsp; ';
        $html .= '<strong>Data:</strong> '.$date.' &nbsp; | &nbsp; ';
        $html .= '<strong>Tipo:</strong> '.$tipo.'</p>';
        $html .= '</div>';

        $html .= match ($evolution->evolution_type) {
            Evolution::TYPE_SIMPLE => $this->pdfSimpleBody($evolution),
            Evolution::TYPE_PILATES => $this->pdfPilatesBody($evolution),
            default => $this->pdfSoapBody($evolution),
        };

        $html .= '<div class="footer">Phisio &mdash; Gerado em '.now()->format('d/m/Y H:i').'</div>';
        $html .= '</body></html>';

        $filename = 'evolucao_'.($evolution->patient->name ?? 'paciente').'_'.\Str::slug($date).'.pdf';

        return Pdf::loadHTML($html)->download($filename);
    }

    private function pdfField(string $label, ?string $value): string
    {
        if ($value === null || $value === '') {
            return '';
        }

        return '<div class="field"><div class="field-label">'.$label.'</div><div class="field-value">'.nl2br(e($value)).'</div></div>';
    }

    private function pdfSimpleBody(Evolution $evolution): string
    {
        return '<h2>Observações da Aula</h2>'.$this->pdfField('Anotações', $evolution->observacoes);
    }

    private function pdfPilatesBody(Evolution $evolution): string
    {
        $labels = ['estabilidade' => 'Estabilidade', 'mobilidade' => 'Mobilidade', 'forca' => 'Força', 'coordenacao' => 'Coordenação'];

        $html = '<h2>1. Execução do Movimento</h2><table class="scores"><tr>';
        foreach ($labels as $field => $label) {
            $html .= '<td><div class="field-label">'.$label.'</div><div class="field-value">'
                .e(Evolution::pilatesLabel($field, $evolution->{$field}) ?? '—').'</div></td>';
        }
        $html .= '</tr></table>';

        $yesNo = fn (?bool $value): string => $value ? 'Sim' : 'Não';

        $pain = $yesNo($evolution->tem_dor);
        if ($evolution->tem_dor && $evolution->dor_eva !== null) {
            $pain .= ' — EVA '.$evolution->dor_eva.'/10';
        }
        if ($evolution->tem_dor && $evolution->localizacao_dor) {
            $pain .= ' ('.$evolution->localizacao_dor.')';
        }

        $limitation = $yesNo($evolution->tem_limitacao)
            .($evolution->tem_limitacao && $evolution->limitacao_detalhe ? ' — '.$evolution->limitacao_detalhe : '');
        $contraindication = $yesNo($evolution->tem_contraindicacao)
            .($evolution->tem_contraindicacao && $evolution->contraindicacao_detalhe ? ' — '.$evolution->contraindicacao_detalhe : '');

        $html .= '<h2>2. Queixas e Cuidados</h2>';
        $html .= $this->pdfField('Dor', $pain);
        $html .= $this->pdfField('Limitação', $limitation);
        $html .= $this->pdfField('Contraindicação', $contraindication);

        if ($evolution->observacoes) {
            $html .= '<h2>3. Observações Gerais</h2>'.$this->pdfField('Anotações', $evolution->observacoes);
        }

        return $html;
    }

    private function pdfSoapBody(Evolution $evolution): string
    {
        $html = '';

        // S - Subjetivo
        $html .= '<h2>S — Subjetivo</h2>';
        if ($evolution->queixa_principal) {
            $html .= '<div class="field"><div class="field-label">Queixa Principal</div><div class="field-value">'.e($evolution->queixa_principal).'</div></div>';
        }
        if ($evolution->relato_paciente) {
            $html .= '<div class="field"><div class="field-label">Relato do Paciente</div><div class="field-value">'.e($evolution->relato_paciente).'</div></div>';
        }
        if ($evolution->dor_eva !== null) {
            $html .= '<div class="field"><div class="field-label">EVA da Dor</div><div class="field-value">'.$evolution->dor_eva.'/10</div></div>';
        }
        if ($evolution->localizacao_dor) {
            $html .= '<div class="field"><div class="field-label">Localização</div><div class="field-value">'.e($evolution->localizacao_dor).'</div></div>';
        }
        if ($evolution->tipo_dor) {
            $html .= '<div class="field"><div class="field-label">Tipo de Dor</div><div class="field-value">'.e($evolution->tipo_dor).'</div></div>';
        }

        // O - Objetivo
        $html .= '<h2>O — Objetivo</h2>';
        $vitals = [];
        if ($evolution->pressao_arterial) {
            $vitals[] = '<strong>PA:</strong> '.e($evolution->pressao_arterial);
        }
        if ($evolution->frequencia_cardiaca) {
            $vitals[] = '<strong>FC:</strong> '.e($evolution->frequencia_cardiaca);
        }
        if ($evolution->saturacao) {
            $vitals[] = '<strong>SpO2:</strong> '.e($evolution->saturacao);
        }
        if (! empty($vitals)) {
            $html .= '<p>'.implode(' &nbsp; | &nbsp; ', $vitals).'</p>';
        }
        if ($evolution->condutas_realizadas) {
            $html .= '<div class="field"><div class="field-label">Condutas Realizadas</div><div class="field-value">'.nl2br(e($evolution->condutas_realizadas)).'</div></div>';
        }

        // A - Avaliação
        $html .= '<h2>A — Avaliação</h2>';
        if ($evolution->analise_profissional) {
            $html .= '<div class="field"><div class="field-label">Análise Profissional</div><div class="field-value">'.nl2br(e($evolution->analise_profissional)).'</div></div>';
        }
        if ($evolution->resposta_tratamento) {
            $html .= '<div class="field"><div class="field-label">Resposta ao Tratamento</div><div class="field-value">'.nl2br(e($evolution->resposta_tratamento)).'</div></div>';
        }

        // P - Plano
        $html .= '<h2>P — Plano</h2>';
        if ($evolution->conduta_planejada) {
            $html .= '<div class="field"><div class="field-label">Conduta Planejada</div><div class="field-value">'.nl2br(e($evolution->conduta_planejada)).'</div></div>';
        }
        if ($evolution->orientacoes_domiciliares) {
            $html .= '<div class="field"><div class="field-label">Orientações Domiciliares</div><div class="field-value">'.nl2br(e($evolution->orientacoes_domiciliares)).'</div></div>';
        }

        return $html;
    }
}
