<?php

namespace App\Http\Controllers;

use App\Models\FinancialTransaction;
use App\Models\Patient;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Carbon\Carbon;

class FinancialTransactionController extends Controller
{
    public function index(Request $request)
    {
        // Determine the month/year to display (default: current)
        $month = $request->input('month', now()->month);
        $year = $request->input('year', now()->year);

        $query = FinancialTransaction::with(['patient', 'membership.commercialPlan'])->orderBy('date', 'desc');

        // Monthly filter
        $query->whereMonth('date', $month)->whereYear('date', $year);

        // Additional filters
        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('status')) {
            if ($request->status === 'overdue') {
                $query->overdue();
            } else {
                $query->where('status', $request->status);
            }
        }

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('description', 'ilike', '%' . $request->search . '%')
                  ->orWhere('category', 'ilike', '%' . $request->search . '%')
                  ->orWhereHas('patient', fn($pq) => $pq->where('name', 'ilike', '%' . $request->search . '%'));
            });
        }

        $transactions = $query->paginate(20)->withQueryString();

        // Monthly summary
        $monthQuery = fn() => FinancialTransaction::whereMonth('date', $month)->whereYear('date', $year);

        $summary = [
            'income' => $monthQuery()->where('type', 'income')->where('status', 'paid')->sum('amount'),
            'expense' => $monthQuery()->where('type', 'expense')->where('status', 'paid')->sum('amount'),
            'pending_income' => $monthQuery()->where('type', 'income')->where('status', 'pending')->sum('amount'),
            'pending_expense' => $monthQuery()->where('type', 'expense')->where('status', 'pending')->sum('amount'),
            'overdue_count' => FinancialTransaction::overdue()->count(),
        ];
        $summary['balance'] = $summary['income'] - $summary['expense'];

        // Chart data: last 6 months of income vs expense
        $chartData = [];
        for ($i = 5; $i >= 0; $i--) {
            $d = Carbon::create($year, $month, 1)->subMonths($i);
            $m = $d->month;
            $y = $d->year;
            $chartData[] = [
                'label' => $d->translatedFormat('M/y'),
                'income' => (float) FinancialTransaction::where('type', 'income')
                    ->where('status', 'paid')
                    ->whereMonth('date', $m)->whereYear('date', $y)
                    ->sum('amount'),
                'expense' => (float) FinancialTransaction::where('type', 'expense')
                    ->where('status', 'paid')
                    ->whereMonth('date', $m)->whereYear('date', $y)
                    ->sum('amount'),
            ];
        }

        // Category breakdown for the current month
        $categoryBreakdown = [
            'income' => FinancialTransaction::where('type', 'income')
                ->whereMonth('date', $month)->whereYear('date', $year)
                ->select('category', DB::raw('SUM(amount) as total'))
                ->groupBy('category')
                ->orderByDesc('total')
                ->get()
                ->map(fn($row) => ['category' => $row->category ?: 'Sem categoria', 'total' => (float) $row->total])
                ->values(),
            'expense' => FinancialTransaction::where('type', 'expense')
                ->whereMonth('date', $month)->whereYear('date', $year)
                ->select('category', DB::raw('SUM(amount) as total'))
                ->groupBy('category')
                ->orderByDesc('total')
                ->get()
                ->map(fn($row) => ['category' => $row->category ?: 'Sem categoria', 'total' => (float) $row->total])
                ->values(),
        ];

        // Ganho por profissional: receita PAGA do mês atribuída ao profissional
        // que mais atendeu o paciente no mês (via agendamentos não cancelados).
        $professionalEarnings = $this->earningsByProfessional($month, $year);

        $patients = Patient::orderBy('name')->get(['id', 'name']);

        return Inertia::render('financial/index', [
            'transactions' => $transactions,
            'summary' => $summary,
            'chartData' => $chartData,
            'categoryBreakdown' => $categoryBreakdown,
            'professionalEarnings' => $professionalEarnings,
            'filters' => $request->only(['type', 'status', 'search', 'month', 'year']),
            'currentMonth' => (int) $month,
            'currentYear' => (int) $year,
            'patients' => $patients,
        ]);
    }

    /**
     * Sum the month's PAID income per professional. Each paid income charge is
     * attributed to the professional who attended that patient the most times
     * during the month (via non-cancelled appointments). Charges with no patient
     * or no sessions in the month fall under "Não atribuído".
     *
     * @return \Illuminate\Support\Collection<int, array{name:string, total:float, count:int}>
     */
    private function earningsByProfessional(int $month, int $year)
    {
        $paidIncome = FinancialTransaction::where('type', 'income')
            ->where('status', 'paid')
            ->whereMonth('date', $month)
            ->whereYear('date', $year)
            ->get(['amount', 'patient_id']);

        $patientIds = $paidIncome->pluck('patient_id')->filter()->unique()->values();

        // patient_id => user_id of the professional with most sessions that month.
        $dominantPro = [];
        if ($patientIds->isNotEmpty()) {
            DB::table('appointment_patient')
                ->join('appointments', 'appointments.id', '=', 'appointment_patient.appointment_id')
                ->whereIn('appointment_patient.patient_id', $patientIds)
                ->where('appointment_patient.status', '!=', 'cancelled')
                ->whereNotNull('appointments.user_id')
                ->whereMonth('appointments.appointment_date', $month)
                ->whereYear('appointments.appointment_date', $year)
                ->groupBy('appointment_patient.patient_id', 'appointments.user_id')
                ->select('appointment_patient.patient_id', 'appointments.user_id', DB::raw('count(*) as cnt'))
                ->get()
                ->groupBy('patient_id')
                ->each(function ($rows, $patientId) use (&$dominantPro) {
                    $dominantPro[$patientId] = $rows->sortByDesc('cnt')->first()->user_id;
                });
        }

        $names = \App\Models\User::whereIn('id', array_values(array_unique($dominantPro)))->pluck('name', 'id');

        $earnings = [];
        foreach ($paidIncome as $tx) {
            $userId = $tx->patient_id ? ($dominantPro[$tx->patient_id] ?? null) : null;
            $key = $userId ?? 'none';

            if (! isset($earnings[$key])) {
                $earnings[$key] = [
                    'name' => $userId ? ($names[$userId] ?? 'Profissional') : 'Não atribuído',
                    'total' => 0.0,
                    'count' => 0,
                ];
            }

            $earnings[$key]['total'] += (float) $tx->amount;
            $earnings[$key]['count']++;
        }

        return collect($earnings)->sortByDesc('total')->values();
    }


    public function receivables(Request $request)
    {
        $today = now()->toDateString();

        // All pending income (contas a receber)
        $pending = FinancialTransaction::with('patient')
            ->where('type', 'income')
            ->where('status', 'pending')
            ->orderBy('due_date')
            ->get();

        // Group by patient (transactions with no patient grouped under "Sem paciente")
        $byPatient = $pending->groupBy(fn($t) => $t->patient_id ?? 'none')
            ->map(function ($items) use ($today) {
                $first = $items->first();
                $overdue = $items->filter(fn($t) => $t->due_date && $t->due_date->toDateString() < $today);
                return [
                    'patient_id' => $first->patient_id,
                    'patient_name' => $first->patient?->name ?? 'Sem paciente vinculado',
                    'total_pending' => (float) $items->sum('amount'),
                    'overdue_amount' => (float) $overdue->sum('amount'),
                    'overdue_count' => $overdue->count(),
                    'count' => $items->count(),
                    'oldest_due' => optional($items->whereNotNull('due_date')->sortBy('due_date')->first())->due_date?->toDateString(),
                    'transactions' => $items->map(fn($t) => [
                        'id' => $t->id,
                        'description' => $t->description,
                        'amount' => (float) $t->amount,
                        'due_date' => $t->due_date?->toDateString(),
                        'date' => $t->date?->toDateString(),
                        'category' => $t->category,
                        'is_overdue' => $t->due_date && $t->due_date->toDateString() < $today,
                    ])->values(),
                ];
            })
            ->sortByDesc('overdue_amount')
            ->values();

        $totals = [
            'total_pending' => (float) $pending->sum('amount'),
            'overdue_amount' => (float) $pending->filter(fn($t) => $t->due_date && $t->due_date->toDateString() < $today)->sum('amount'),
            'patient_count' => $byPatient->count(),
        ];

        return Inertia::render('financial/receivables', [
            'groups' => $byPatient,
            'totals' => $totals,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'type' => 'required|in:income,expense',
            'amount' => 'required|numeric|min:0.01',
            'date' => 'required|date',
            'due_date' => 'nullable|date',
            'paid_at' => 'nullable|date',
            'description' => 'required|string|max:255',
            'category' => 'nullable|string|max:100',
            'status' => 'required|in:paid,pending',
            'patient_id' => 'nullable|uuid|exists:patients,id',
        ]);

        // Auto-set paid_at when marking as paid
        if ($validated['status'] === 'paid' && empty($validated['paid_at'])) {
            $validated['paid_at'] = $validated['date'];
        }

        $validated['created_by'] = auth()->id();
        if ($validated['status'] === 'paid') {
            $validated['paid_by'] = auth()->id();
        }

        $transaction = FinancialTransaction::create($validated);
        $transaction->logAction('created', null, $transaction->status);

        return redirect()->route('financial.index')->with('success', 'Transação registrada!');
    }


    public function update(Request $request, FinancialTransaction $financial)
    {
        $validated = $request->validate([
            'type' => 'required|in:income,expense',
            'amount' => 'required|numeric|min:0.01',
            'date' => 'required|date',
            'due_date' => 'nullable|date',
            'paid_at' => 'nullable|date',
            'description' => 'required|string|max:255',
            'category' => 'nullable|string|max:100',
            'status' => 'required|in:paid,pending',
            'patient_id' => 'nullable|uuid|exists:patients,id',
        ]);

        $oldStatus = $financial->status;

        // Auto-set paid_at when marking as paid
        if ($validated['status'] === 'paid' && empty($validated['paid_at'])) {
            $validated['paid_at'] = $financial->paid_at ?: $validated['date'];
        }

        // Clear payment info when reverting to pending
        if ($validated['status'] === 'pending') {
            $validated['paid_at'] = null;
            $validated['paid_by'] = null;
        } elseif ($validated['status'] === 'paid' && $oldStatus !== 'paid') {
            $validated['paid_by'] = auth()->id();
        }

        $financial->update($validated);

        if ($oldStatus !== $financial->status) {
            $financial->logAction('updated', $oldStatus, $financial->status);
        }

        return redirect()->route('financial.index')->with('success', 'Transação atualizada!');
    }

    public function destroy(FinancialTransaction $financial)
    {
        $financial->logAction('deleted', $financial->status, null);
        $financial->delete();
        return redirect()->route('financial.index')->with('success', 'Transação excluída.');
    }

    public function markAsPaid(FinancialTransaction $financial)
    {
        $oldStatus = $financial->status;

        $financial->update([
            'status' => 'paid',
            'paid_at' => now()->toDateString(),
            'paid_by' => auth()->id(),
        ]);

        $financial->logAction('marked_paid', $oldStatus, 'paid');

        return redirect()->back()->with('success', 'Pagamento confirmado!');
    }

    public function markAsPending(FinancialTransaction $financial)
    {
        $oldStatus = $financial->status;

        $financial->update([
            'status' => 'pending',
            'paid_at' => null,
            'paid_by' => null,
        ]);

        $financial->logAction('reverted', $oldStatus, 'pending');

        return redirect()->back()->with('success', 'Pagamento estornado. Voltou para pendente.');
    }

    /**
     * Generate a payment receipt (recibo) PDF for a paid income transaction.
     */
    public function receipt(FinancialTransaction $financial)
    {
        if ($financial->type !== 'income' || $financial->status !== 'paid') {
            return back()->with('error', 'O recibo só está disponível para pagamentos recebidos.');
        }

        $financial->loadMissing('patient');

        $patientName = $financial->patient?->name ?? 'Cliente';
        $amount = 'R$ '.number_format((float) $financial->amount, 2, ',', '.');
        $paidAt = ($financial->paid_at ?? $financial->date)->format('d/m/Y');
        $code = strtoupper(substr(str_replace('-', '', $financial->id), 0, 12));
        $description = $financial->description ?: ($financial->category ?: 'Serviços prestados');
        $issuedAt = now()->format('d/m/Y \à\s H:i');

        $html = '<!DOCTYPE html><html><head><meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; color: #1f2937; margin: 48px; font-size: 14px; }
            .header { border-bottom: 3px solid #10b981; padding-bottom: 16px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: flex-end; }
            .brand { font-size: 24px; font-weight: bold; color: #10b981; }
            .doc-title { font-size: 15px; font-weight: bold; color: #374151; letter-spacing: 1px; }
            .code { text-align: right; font-size: 12px; color: #6b7280; }
            .code strong { color: #111827; font-family: "Courier New", monospace; }
            .amount-box { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 16px 20px; margin: 28px 0; }
            .amount-box .label { font-size: 12px; text-transform: uppercase; color: #059669; letter-spacing: 0.5px; }
            .amount-box .value { font-size: 30px; font-weight: bold; color: #047857; margin-top: 2px; }
            .body-text { line-height: 1.7; margin: 20px 0; }
            .body-text strong { color: #111827; }
            .meta { margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 16px; font-size: 13px; color: #4b5563; }
            .meta div { margin-bottom: 6px; }
            .sign { margin-top: 64px; text-align: center; }
            .sign .line { width: 280px; border-top: 1px solid #9ca3af; margin: 0 auto 6px; }
            .sign .name { font-size: 13px; color: #374151; }
            .footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 11px; text-align: center; }
        </style></head><body>';

        $html .= '<div class="header">
            <div><div class="brand">Phisio</div><div class="doc-title">RECIBO DE PAGAMENTO</div></div>
            <div class="code">Código do pagamento<br><strong>'.$code.'</strong></div>
        </div>';

        $html .= '<div class="amount-box">
            <div class="label">Valor recebido</div>
            <div class="value">'.$amount.'</div>
        </div>';

        $html .= '<div class="body-text">Recebemos de <strong>'.e($patientName).'</strong> a importância de <strong>'.$amount.'</strong>, '
            .'referente a <strong>'.e($description).'</strong>, conforme detalhado abaixo.</div>';

        $html .= '<div class="meta">';
        $html .= '<div><strong>Pagador:</strong> '.e($patientName).'</div>';
        $html .= '<div><strong>Descrição:</strong> '.e($description).'</div>';
        if ($financial->category) {
            $html .= '<div><strong>Categoria:</strong> '.e($financial->category).'</div>';
        }
        $html .= '<div><strong>Data do pagamento:</strong> '.$paidAt.'</div>';
        $html .= '<div><strong>Código do pagamento:</strong> '.$code.'</div>';
        $html .= '</div>';

        $html .= '<div class="sign"><div class="line"></div><div class="name">Phisio</div></div>';

        $html .= '<div class="footer">Recibo gerado em '.$issuedAt.'</div>';
        $html .= '</body></html>';

        $filename = 'recibo_'.Str::slug($patientName).'_'.$code.'.pdf';

        return Pdf::loadHTML($html)->download($filename);
    }
}
