<?php

namespace App\Http\Controllers;

use App\Models\FinancialTransaction;
use App\Models\Patient;
use App\Models\Tenant;
use App\Models\User;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

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
                $q->whereLike('description', '%'.$request->search.'%')
                    ->orWhereLike('category', '%'.$request->search.'%')
                    ->orWhereHas('patient', fn ($pq) => $pq->whereLike('name', '%'.$request->search.'%'));
            });
        }

        $transactions = $query->paginate(20)->withQueryString();

        // Monthly summary
        $monthQuery = fn () => FinancialTransaction::whereMonth('date', $month)->whereYear('date', $year);

        $summary = [
            'income' => $monthQuery()->where('type', 'income')->where('status', 'paid')->sum('amount'),
            'expense' => $monthQuery()->where('type', 'expense')->where('status', 'paid')->sum('amount'),
            'pending_income' => $monthQuery()->where('type', 'income')->open()->sum('amount'),
            'pending_expense' => $monthQuery()->where('type', 'expense')->open()->sum('amount'),
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
                ->map(fn ($row) => ['category' => $row->category ?: 'Sem categoria', 'total' => (float) $row->total])
                ->values(),
            'expense' => FinancialTransaction::where('type', 'expense')
                ->whereMonth('date', $month)->whereYear('date', $year)
                ->select('category', DB::raw('SUM(amount) as total'))
                ->groupBy('category')
                ->orderByDesc('total')
                ->get()
                ->map(fn ($row) => ['category' => $row->category ?: 'Sem categoria', 'total' => (float) $row->total])
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
     * split EQUALLY among the distinct professionals who attended that patient
     * during the month (via non-cancelled appointments) — e.g. two professionals
     * → 50% each, regardless of how many sessions each gave. Charges with no
     * patient or no sessions in the month fall under "Não atribuído".
     *
     * @return Collection<int, array{name:string, total:float, count:int}>
     */
    private function earningsByProfessional(int $month, int $year)
    {
        $paidIncome = FinancialTransaction::where('type', 'income')
            ->where('status', 'paid')
            ->whereMonth('date', $month)
            ->whereYear('date', $year)
            ->get(['amount', 'patient_id']);

        $patientIds = $paidIncome->pluck('patient_id')->filter()->unique()->values();

        // patient_id => [distinct user_ids who attended that patient this month]
        $prosByPatient = [];
        if ($patientIds->isNotEmpty()) {
            DB::table('appointment_patient')
                ->join('appointments', 'appointments.id', '=', 'appointment_patient.appointment_id')
                ->whereIn('appointment_patient.patient_id', $patientIds)
                ->where('appointment_patient.status', '!=', 'cancelled')
                ->whereNotNull('appointments.user_id')
                ->whereMonth('appointments.appointment_date', $month)
                ->whereYear('appointments.appointment_date', $year)
                ->distinct()
                ->get(['appointment_patient.patient_id', 'appointments.user_id'])
                ->groupBy('patient_id')
                ->each(function ($rows, $patientId) use (&$prosByPatient) {
                    $prosByPatient[$patientId] = $rows->pluck('user_id')->unique()->values()->all();
                });
        }

        $names = User::whereIn('id', collect($prosByPatient)->flatten()->unique()->values())
            ->pluck('name', 'id');

        $earnings = [];
        $add = function (string $key, string $name, float $amount) use (&$earnings) {
            if (! isset($earnings[$key])) {
                $earnings[$key] = ['name' => $name, 'total' => 0.0, 'count' => 0];
            }
            $earnings[$key]['total'] += $amount;
            $earnings[$key]['count']++;
        };

        foreach ($paidIncome as $tx) {
            $amount = (float) $tx->amount;
            $pros = $tx->patient_id ? ($prosByPatient[$tx->patient_id] ?? []) : [];

            if (empty($pros)) {
                $add('none', 'Não atribuído', $amount);

                continue;
            }

            // Equal split among the professionals who attended the patient.
            $share = $amount / count($pros);
            foreach ($pros as $userId) {
                $add((string) $userId, $names[$userId] ?? 'Profissional', $share);
            }
        }

        return collect($earnings)->sortByDesc('total')->values();
    }

    public function receivables(Request $request)
    {
        $today = now()->toDateString();
        $isOverdue = fn (FinancialTransaction $t): bool => $t->status === 'pending'
            && $t->due_date && $t->due_date->toDateString() < $today;

        // Income still waiting for the money (contas a receber), including
        // charges the patient says were paid and are waiting to be checked.
        $pending = FinancialTransaction::with('patient')
            ->where('type', 'income')
            ->open()
            ->orderBy('due_date')
            ->get();

        // Group by patient (transactions with no patient grouped under "Sem paciente")
        $byPatient = $pending->groupBy(fn ($t) => $t->patient_id ?? 'none')
            ->map(function ($items) use ($isOverdue) {
                $first = $items->first();
                $overdue = $items->filter($isOverdue);

                return [
                    'patient_id' => $first->patient_id,
                    'patient_name' => $first->patient?->name ?? 'Sem paciente vinculado',
                    'total_pending' => (float) $items->sum('amount'),
                    'overdue_amount' => (float) $overdue->sum('amount'),
                    'overdue_count' => $overdue->count(),
                    'count' => $items->count(),
                    'oldest_due' => optional($items->whereNotNull('due_date')->sortBy('due_date')->first())->due_date?->toDateString(),
                    'transactions' => $items->map(fn ($t) => [
                        'id' => $t->id,
                        'description' => $t->description,
                        'amount' => (float) $t->amount,
                        'due_date' => $t->due_date?->toDateString(),
                        'date' => $t->date?->toDateString(),
                        'category' => $t->category,
                        'status' => $t->status,
                        'payment_method' => $t->payment_method,
                        'is_overdue' => $isOverdue($t),
                    ])->values(),
                ];
            })
            ->sortByDesc('overdue_amount')
            ->values();

        $totals = [
            'total_pending' => (float) $pending->sum('amount'),
            'overdue_amount' => (float) $pending->filter($isOverdue)->sum('amount'),
            'patient_count' => $byPatient->count(),
        ];

        $tenant = $request->user()->tenant;

        return Inertia::render('financial/receivables', [
            'groups' => $byPatient,
            'totals' => $totals,
            'reminders' => $this->billingReminders($tenant),
            'billingTemplates' => collect($tenant?->messageTemplates() ?? [])
                ->only(['billing_before', 'billing_due', 'billing_overdue']),
            'clinicName' => $tenant?->name ?? config('app.name'),
            'hasPix' => (bool) $tenant?->pix_key,
        ]);
    }

    /**
     * Charges to remind by WhatsApp: due within the next 3 days, due today
     * or overdue — only patients' charges still pending (not in review).
     *
     * @return Collection<int, array<string, mixed>>
     */
    private function billingReminders(?Tenant $tenant): Collection
    {
        $today = Carbon::today();

        return FinancialTransaction::with(['patient', 'membership.commercialPlan'])
            ->where('type', 'income')
            ->where('status', 'pending')
            ->whereNotNull('patient_id')
            ->whereNotNull('due_date')
            ->whereDate('due_date', '<=', $today->copy()->addDays(3)->toDateString())
            ->orderBy('due_date')
            ->get()
            ->map(function (FinancialTransaction $t) use ($today, $tenant): array {
                $days = (int) $today->diffInDays($t->due_date, false);

                return [
                    'id' => $t->id,
                    'patient_id' => $t->patient_id,
                    'patient_name' => $t->patient?->name,
                    'nickname' => $t->patient?->nickname,
                    'phone' => $t->patient?->phone,
                    'amount' => (float) $t->amount,
                    'due_date' => $t->due_date->toDateString(),
                    'stage' => $days > 0 ? 'before' : ($days === 0 ? 'due' : 'overdue'),
                    'days' => abs($days),
                    'reference' => $t->membership?->commercialPlan?->name
                        ?? $t->membership?->plan_name
                        ?? $t->description,
                    'pix' => $tenant?->pixPayload((float) $t->amount),
                    'reminded_at' => $t->whatsapp_reminder_at?->toIso8601String(),
                ];
            })
            ->values();
    }

    /**
     * Record that the WhatsApp billing reminder was sent.
     */
    public function whatsappReminder(FinancialTransaction $financial): JsonResponse
    {
        $financial->update(['whatsapp_reminder_at' => now()]);

        return response()->json(['reminded_at' => $financial->whatsapp_reminder_at->toIso8601String()]);
    }

    /**
     * PIX "copia e cola" and QR Code for an unpaid charge, with its amount.
     */
    public function pix(Request $request, FinancialTransaction $financial): JsonResponse
    {
        $tenant = $request->user()->tenant;

        if (! $tenant?->pix_key) {
            return response()->json(['message' => 'Cadastre a chave PIX da clínica no Perfil da Clínica.'], 422);
        }

        if ($financial->type !== 'income' || ! in_array($financial->status, FinancialTransaction::OPEN_STATUSES, true)) {
            return response()->json(['message' => 'Só cobranças em aberto têm PIX.'], 422);
        }

        $payload = $tenant->pixPayload((float) $financial->amount);
        $svg = (new Writer(new ImageRenderer(new RendererStyle(220, 1), new SvgImageBackEnd)))->writeString($payload);

        return response()->json([
            'payload' => $payload,
            // Without the XML declaration, so it can be placed inline.
            'qr_svg' => trim(substr($svg, strpos($svg, "\n") + 1)),
            'amount' => (float) $financial->amount,
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
            'status' => ['required', Rule::in(FinancialTransaction::STATUSES)],
            'payment_method' => ['nullable', Rule::in(array_keys(FinancialTransaction::PAYMENT_METHODS))],
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
            'status' => ['required', Rule::in(FinancialTransaction::STATUSES)],
            'payment_method' => ['nullable', Rule::in(array_keys(FinancialTransaction::PAYMENT_METHODS))],
            'patient_id' => 'nullable|uuid|exists:patients,id',
        ]);

        $oldStatus = $financial->status;

        // Auto-set paid_at when marking as paid
        if ($validated['status'] === 'paid' && empty($validated['paid_at'])) {
            $validated['paid_at'] = $financial->paid_at ?: $validated['date'];
        }

        // Clear payment info when it is no longer paid
        if ($validated['status'] !== 'paid') {
            $validated['paid_at'] = null;
            $validated['paid_by'] = null;
        } elseif ($oldStatus !== 'paid') {
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

    public function markAsPaid(Request $request, FinancialTransaction $financial)
    {
        $validated = $request->validate([
            'payment_method' => ['nullable', Rule::in(array_keys(FinancialTransaction::PAYMENT_METHODS))],
        ]);

        $oldStatus = $financial->status;

        $financial->update([
            'status' => 'paid',
            'paid_at' => now()->toDateString(),
            'paid_by' => auth()->id(),
            'payment_method' => $validated['payment_method'] ?? $financial->payment_method,
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
            'payment_method' => null,
        ]);

        $financial->logAction('reverted', $oldStatus, 'pending');

        return redirect()->back()->with('success', 'Voltou para pendente.');
    }

    /**
     * The patient says they paid (e.g. sent a PIX receipt): waiting for the
     * clinic to check it.
     */
    public function markInReview(Request $request, FinancialTransaction $financial)
    {
        $validated = $request->validate([
            'payment_method' => ['nullable', Rule::in(array_keys(FinancialTransaction::PAYMENT_METHODS))],
        ]);

        $oldStatus = $financial->status;

        $financial->update([
            'status' => 'in_review',
            'payment_method' => $validated['payment_method'] ?? $financial->payment_method,
        ]);

        $financial->logAction('in_review', $oldStatus, 'in_review');

        return redirect()->back()->with('success', 'Pagamento em análise.');
    }

    /**
     * Give up on a charge (perda / inadimplente). It leaves "a receber" but
     * stays in the history, and can go back to pending.
     */
    public function writeOff(Request $request, FinancialTransaction $financial)
    {
        $validated = $request->validate(['note' => 'nullable|string|max:255']);

        $oldStatus = $financial->status;

        $financial->update(['status' => 'written_off', 'paid_at' => null, 'paid_by' => null]);
        $financial->logAction('written_off', $oldStatus, 'written_off', $validated['note'] ?? null);

        return redirect()->back()->with('success', 'Cobrança marcada como perda.');
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
        if ($financial->payment_method) {
            $html .= '<div><strong>Forma de pagamento:</strong> '.e(FinancialTransaction::PAYMENT_METHODS[$financial->payment_method] ?? $financial->payment_method).'</div>';
        }
        $html .= '<div><strong>Código do pagamento:</strong> '.$code.'</div>';
        $html .= '</div>';

        $html .= '<div class="sign"><div class="line"></div><div class="name">Phisio</div></div>';

        $html .= '<div class="footer">Recibo gerado em '.$issuedAt.'</div>';
        $html .= '</body></html>';

        $filename = 'recibo_'.Str::slug($patientName).'_'.$code.'.pdf';

        return Pdf::loadHTML($html)->download($filename);
    }
}
