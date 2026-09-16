<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Preço por usuário adicional
    |--------------------------------------------------------------------------
    |
    | Valor mensal cobrado por cada assento comprado além dos que o plano já
    | inclui. Vale para todos os planos pagos.
    |
    */

    'extra_user_price' => (float) env('PLAN_EXTRA_USER_PRICE', 5.00),

    /*
    |--------------------------------------------------------------------------
    | Máximo de usuários adicionais
    |--------------------------------------------------------------------------
    |
    | Teto de assentos extras que uma organização pode solicitar de uma vez.
    |
    */

    'max_extra_users' => (int) env('PLAN_MAX_EXTRA_USERS', 50),

    /*
    |--------------------------------------------------------------------------
    | Recursos incluídos
    |--------------------------------------------------------------------------
    |
    | Todo plano dá acesso ao sistema inteiro — o que muda entre eles é apenas
    | quantos usuários e quanto armazenamento cabem. Esta lista é exibida uma
    | única vez na tela de assinatura, abaixo dos planos.
    |
    | Para desligar um módulo em uma organização específica, use os switches de
    | funcionalidades no cadastro dela pelo dev admin. Isso é um ajuste pontual,
    | não uma regra de plano.
    |
    */

    'included_features' => [
        'Agenda com visualização semanal e reagendamento',
        'Prontuário do paciente com documentos anexados',
        'Evoluções SOAP com fotos e exportação em PDF',
        'Protocolos clínicos e planos de tratamento',
        'Turmas de Pilates em grupo',
        'Matrículas, planos e pacotes comerciais',
        'Financeiro, contas a receber e gastos recorrentes',
        'Relatórios gerenciais completos',
        'Perfis de acesso e autenticação em duas etapas',
        'Acesso pelo celular e sincronização de calendário',
    ],

    /*
    |--------------------------------------------------------------------------
    | Planos
    |--------------------------------------------------------------------------
    |
    | "users" e "storage_mb" são os limites efetivamente aplicados pelo sistema.
    | "price" em null aparece como "sob consulta" na tela de assinatura — defina
    | os valores em PLAN_PRICE_* no .env quando a tabela estiver fechada.
    | "free" é o período de teste e não pode ser contratado.
    |
    */

    'plans' => [

        'free' => [
            'name' => 'Teste',
            'tagline' => 'Avaliação gratuita, com o sistema completo.',
            'users' => 3,
            'storage_mb' => 1024,
            'price' => 0.0,
            'selectable' => false,
            'allows_extra_users' => false,
        ],

        'basic' => [
            'name' => 'Básico',
            'tagline' => 'Para quem atende sozinho ou em equipe pequena.',
            'users' => 5,
            'storage_mb' => 1024,
            'price' => env('PLAN_PRICE_BASIC') !== null ? (float) env('PLAN_PRICE_BASIC') : null,
            'selectable' => true,
            'allows_extra_users' => true,
        ],

        'intermediate' => [
            'name' => 'Intermediário',
            'tagline' => 'Para clínicas com equipe e turmas em andamento.',
            'users' => 15,
            'storage_mb' => 5120,
            'price' => env('PLAN_PRICE_INTERMEDIATE') !== null ? (float) env('PLAN_PRICE_INTERMEDIATE') : null,
            'selectable' => true,
            'allows_extra_users' => true,
        ],

        'pro' => [
            'name' => 'Avançado',
            'tagline' => 'Para operações maiores, com várias salas e profissionais.',
            'users' => 30,
            'storage_mb' => 20480,
            'price' => env('PLAN_PRICE_PRO') !== null ? (float) env('PLAN_PRICE_PRO') : null,
            'selectable' => true,
            'allows_extra_users' => true,
        ],

    ],

];
