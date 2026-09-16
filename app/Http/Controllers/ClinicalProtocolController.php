<?php

namespace App\Http\Controllers;

use App\Models\ClinicalProtocol;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ClinicalProtocolController extends Controller
{
    public function index(Request $request)
    {
        $query = ClinicalProtocol::orderBy('name', 'asc');

        if ($request->filled('search')) {
            $query->whereLike('name', '%'.$request->search.'%');
        }

        $protocols = $query->paginate(15)->withQueryString();

        return Inertia::render('clinical-protocols/index', [
            'protocols' => $protocols,
            'filters' => $request->only(['search']),
        ]);
    }

    public function create()
    {
        // Creation happens via a sheet on the index; keep the URL from 404ing.
        return redirect()->route('clinical-protocols.index');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'total_sessions' => 'nullable|integer|min:1|max:200',
            'notes' => 'nullable|string',
        ]);

        ClinicalProtocol::create($validated);

        return redirect()->route('clinical-protocols.index')
            ->with('success', 'Protocolo clínico criado com sucesso!');
    }

    public function show(ClinicalProtocol $clinicalProtocol)
    {
        // Evolutions that used this protocol
        $clinicalProtocol->load(['evolutions.patient' => fn ($q) => $q->select('id', 'name')]);

        return Inertia::render('clinical-protocols/show', [
            'protocol' => $clinicalProtocol,
        ]);
    }

    public function edit(ClinicalProtocol $clinicalProtocol)
    {
        // Editing happens via a sheet on the index; keep the URL from 404ing.
        return redirect()->route('clinical-protocols.index');
    }

    public function update(Request $request, ClinicalProtocol $clinicalProtocol)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'total_sessions' => 'nullable|integer|min:1|max:200',
            'notes' => 'nullable|string',
        ]);

        $clinicalProtocol->update($validated);

        return redirect()->route('clinical-protocols.show', $clinicalProtocol)
            ->with('success', 'Protocolo clínico atualizado!');
    }

    public function destroy(ClinicalProtocol $clinicalProtocol)
    {
        $clinicalProtocol->delete();

        return redirect()->route('clinical-protocols.index')
            ->with('success', 'Protocolo clínico excluído!');
    }
}
