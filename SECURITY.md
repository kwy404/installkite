# Security policy

## Supported versions

| Version | Supported |
| --- | --- |
| 0.1.x | Yes |

## Reporting a vulnerability

Please do not open a public issue for security problems. Report them privately through [GitHub security advisories](https://github.com/kwy404/installkite/security/advisories/new). You will get an answer within a few days, and a fix and a release as soon as the problem is confirmed.

## Scope notes

- The service worker only handles GET requests inside its scope, never caches opaque cross origin responses, and only deletes caches with the `installkite-` prefix.
- Pages that depend on the visitor (accounts, carts, admin areas) should be listed in `sw.exclude` so they are never stored in a shared cache.
- The CLI reads and writes files only inside the project folder you run it in, and `doctor --url` only fetches the URLs it finds on the audited site.
