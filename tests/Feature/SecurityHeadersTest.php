<?php

test('every response carries the baseline security headers', function () {
    $response = $this->get('/login');

    $response->assertOk()
        ->assertHeader('X-Content-Type-Options', 'nosniff')
        ->assertHeader('X-Frame-Options', 'SAMEORIGIN')
        ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    expect($response->headers->get('Strict-Transport-Security'))->toContain('max-age=');
});

test('the CSP nonce is identical on the header and every inline/module script tag', function () {
    $response = $this->get('/login');
    $csp = $response->headers->get('Content-Security-Policy');

    expect($csp)->not->toBeNull()
        ->and($csp)->toContain("default-src 'self'")
        ->and($csp)->toContain("object-src 'none'");

    preg_match("/'nonce-([^']+)'/", $csp, $match);
    $nonce = $match[1] ?? null;

    expect($nonce)->not->toBeNull();

    $scriptTags = [];
    preg_match_all('/<script\b[^>]*>/', $response->getContent(), $scriptTags);

    // Every executable <script> tag must carry the same nonce as the header
    // — a tag without it, or with a different one, would be silently blocked
    // by the browser (or worse, mean the CSP isn't actually protecting it).
    // Inertia's own <script type="application/json" data-page="..."> is inert
    // data, not executable, and CSP's script-src does not govern it.
    $executableScriptTags = array_filter(
        $scriptTags[0],
        fn (string $tag): bool => ! str_contains($tag, 'type="application/json"')
    );

    expect($executableScriptTags)->not->toBeEmpty();

    foreach ($executableScriptTags as $tag) {
        expect($tag)->toContain("nonce=\"{$nonce}\"");
    }
});

test('a fresh nonce is generated on every request', function () {
    preg_match(
        "/'nonce-([^']+)'/",
        $this->get('/login')->headers->get('Content-Security-Policy'),
        $first
    );
    preg_match(
        "/'nonce-([^']+)'/",
        $this->get('/login')->headers->get('Content-Security-Policy'),
        $second
    );

    expect($first[1])->not->toBe($second[1]);
});
