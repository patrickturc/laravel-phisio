<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Foundation\Vite;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Baseline security headers, missing entirely before this middleware existed.
 *
 * The CSP nonce is generated here (via Vite::useCspNonce(), before the view
 * renders) so every <script>/<link> tag @vite() and @viteReactRefresh emit
 * gets it automatically, and the two hand-written inline <script> blocks in
 * app.blade.php can use the same value via Vite::cspNonce().
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $nonce = app(Vite::class)->useCspNonce();

        /** @var Response $response */
        $response = $next($request);

        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'SAMEORIGIN');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');

        // Ignored by browsers on plain HTTP per the HSTS spec, so this is safe
        // to send unconditionally rather than trying to detect production.
        $response->headers->set(
            'Strict-Transport-Security',
            'max-age=31536000; includeSubDomains'
        );

        $response->headers->set('Content-Security-Policy', $this->contentSecurityPolicy($nonce));

        return $response;
    }

    private function contentSecurityPolicy(string $nonce): string
    {
        $scriptSrc = "'self' 'nonce-{$nonce}'";
        $connectSrc = "'self'";

        // The Vite dev server (npm run dev) serves unbundled ES modules and
        // keeps an HMR websocket open; only reachable in local development,
        // never in a deployed build, so this widening never applies there.
        if (app()->environment('local')) {
            // IPv6 literals ([::1]) are not valid CSP host-source syntax per
            // spec and get silently dropped by browsers anyway — Vite's dev
            // server is reached through localhost here regardless.
            $scriptSrc .= ' http://localhost:5173';
            $connectSrc .= ' http://localhost:5173 ws://localhost:5173';
        }

        $directives = [
            "default-src 'self'",
            "script-src {$scriptSrc}",
            // Left permissive: components (framer-motion animations, inline
            // chart styles) write to element.style directly at runtime, which
            // a locked-down style-src would silently break. Tightening this
            // to nonces/hashes is a separate follow-up that needs each of
            // those call sites audited first.
            "style-src 'self' 'unsafe-inline' https://fonts.bunny.net",
            "img-src 'self' data: blob:",
            "font-src 'self' https://fonts.bunny.net data:",
            "connect-src {$connectSrc}",
            // The patient document preview page embeds its own same-origin
            // preview endpoint in an <iframe>.
            "frame-src 'self'",
            "frame-ancestors 'self'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
        ];

        return implode('; ', $directives);
    }
}
