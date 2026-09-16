<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\ClinicalProtocol;
use App\Models\Evolution;
use App\Models\Membership;
use App\Models\Patient;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;
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
        $isSimple = $request->input('evolution_type') === 'simple';

        $rules = [
            'paciente_id' => 'required|uuid|exists:patients,id',
            'agendamento_id' => 'nullable|uuid|exists:appointments,id',
            'data_atendimento' => 'required|date',
        ];

        if ($isSimple) {
            $rules['observacoes'] = 'required|string';
            $rules['tipo_atendimento'] = 'nullable|string';
        } else {
            $rules['clinical_protocol_id'] = 'nullable|uuid|exists:clinical_protocols,id';
            $rules['tipo_atendimento'] = 'required|in:avaliacao,reavaliacao,sessao';
            $rules['queixa_principal'] = 'nullable|string';
            $rules['relato_paciente'] = 'nullable|string';
            $rules['dor_eva'] = 'nullable|integer|min:0|max:10';
            $rules['localizacao_dor'] = 'nullable|string';
            $rules['tipo_dor'] = 'nullable|string';
            $rules['pressao_arterial'] = 'nullable|string';
            $rules['frequencia_cardiaca'] = 'nullable|string';
            $rules['saturacao'] = 'nullable|string';
            $rules['amplitude_movimento'] = 'nullable|string';
            $rules['forca_muscular'] = 'nullable|string';
            $rules['avaliacao_funcional'] = 'nullable|string';
            $rules['avaliacao_postural'] = 'nullable|string';
            $rules['condutas_realizadas'] = 'nullable|string';
            $rules['parametros_conduta'] = 'nullable|string';
            $rules['resposta_tratamento'] = 'nullable|string';
            $rules['evolucao_status'] = 'nullable|string';
            $rules['analise_profissional'] = 'nullable|string';
            $rules['conduta_planejada'] = 'nullable|string';
            $rules['orientacoes_domiciliares'] = 'nullable|string';
        }

        $validated = $request->validate($rules);

        if ($isSimple && empty($validated['tipo_atendimento'])) {
            $validated['tipo_atendimento'] = 'sessao';
        }

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
        $isSimple = $request->input('evolution_type') === 'simple';

        $rules = [
            'paciente_id' => 'required|uuid|exists:patients,id',
            'data_atendimento' => 'required|date',
        ];

        if ($isSimple) {
            $rules['observacoes'] = 'required|string';
            $rules['tipo_atendimento'] = 'nullable|string';
        } else {
            $rules['clinical_protocol_id'] = 'nullable|uuid|exists:clinical_protocols,id';
            $rules['tipo_atendimento'] = 'required|in:avaliacao,reavaliacao,sessao';
            $rules['queixa_principal'] = 'nullable|string';
            $rules['relato_paciente'] = 'nullable|string';
            $rules['dor_eva'] = 'nullable|integer|min:0|max:10';
            $rules['localizacao_dor'] = 'nullable|string';
            $rules['tipo_dor'] = 'nullable|string';
            $rules['pressao_arterial'] = 'nullable|string';
            $rules['frequencia_cardiaca'] = 'nullable|string';
            $rules['saturacao'] = 'nullable|string';
            $rules['amplitude_movimento'] = 'nullable|string';
            $rules['forca_muscular'] = 'nullable|string';
            $rules['avaliacao_funcional'] = 'nullable|string';
            $rules['avaliacao_postural'] = 'nullable|string';
            $rules['condutas_realizadas'] = 'nullable|string';
            $rules['parametros_conduta'] = 'nullable|string';
            $rules['resposta_tratamento'] = 'nullable|string';
            $rules['evolucao_status'] = 'nullable|string';
            $rules['analise_profissional'] = 'nullable|string';
            $rules['conduta_planejada'] = 'nullable|string';
            $rules['orientacoes_domiciliares'] = 'nullable|string';
        }

        $validated = $request->validate($rules);

        if ($isSimple) {
            if (empty($validated['tipo_atendimento'])) {
                $validated['tipo_atendimento'] = 'sessao';
            }
            // Simple (Pilates) evolutions carry only a free-text note; clear the
            // SOAP-specific fields so a type switch doesn't leave stale data.
            $validated['clinical_protocol_id'] = null;
        } else {
            // Full SOAP evolution: ensure the simple-note field is cleared.
            $validated['observacoes'] = null;
        }

        $evolution->update($validated);

        return back()->with('success', 'Evolução atualizada!');
    }

    public function destroy(Evolution $evolution)
    {
        $evolution->delete();

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
            .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #999; font-size: 11px; text-align: center; }
        </style></head><body>';

        $html .= '<div class="header">';
        $html .= '<h1>Evolução Clínica (SOAP)</h1>';
        $html .= '<p class="meta"><strong>Paciente:</strong> '.e($evolution->patient->name ?? 'N/A').' &nbsp; | &nbsp; ';
        $html .= '<strong>Data:</strong> '.$date.' &nbsp; | &nbsp; ';
        $html .= '<strong>Tipo:</strong> '.$tipo.'</p>';
        $html .= '</div>';

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

        $html .= '<div class="footer">Phisio &mdash; Gerado em '.now()->format('d/m/Y H:i').'</div>';
        $html .= '</body></html>';

        $filename = 'evolucao_'.($evolution->patient->name ?? 'paciente').'_'.\Str::slug($date).'.pdf';

        return Pdf::loadHTML($html)->download($filename);
    }
}
