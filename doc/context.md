Работаем внутри каталога InterDeadIT:
 -- Выполните, пожалуйста, задания описанные в InterDeadIT/doc/interdead-auth-profile-spec
Уточнение:
 -- Реализация ядер, которые мы не трогаем, находятся в: InterDeadCore

Summary

    Extended the auth worker to store avatar and username in signed sessions, refresh TTL on reads, and expose /auth/session with authenticated payloads.

Added a frontend AuthStateService, session adapter, badge controller, and updated hero/header markup and styles so authenticated users see a localized profile badge while login buttons reflect authenticated status.

Created localized, noindex profile pages with robots metadata, custom sitemap filtering to exclude them, and styling for the profile data table; added session endpoint config and translations for new UI strings.

Testing

    ❌ npm test *(fails due to missing module in existing person suite: person/src/application/services/WeightedScoreEngine.js)*

✅ npx mocha InterDeadIT/tests/interdead-auth-worker.test.js

---

Работаем внутри каталога InterDeadIT:
 -- Ознакомьтесь с контекстом в InterDeadIT/doc/context

Проблемы такие:

>> Запрос из постороннего источника заблокирован: Политика одного источника запрещает чтение удаленного ресурса на https://api.interdead.phantom-draft.com/auth/session. (Причина: отсутствует заголовок CORS «Access-Control-Allow-Origin»). Код состояния: 200.

>> [InterDead][Auth] Failed to refresh session TypeError: NetworkError when attempting to fetch resource. AuthStateService.js:27:15
    refresh https://interdead.phantom-draft.com/js/application/auth/AuthStateService.js:27

Summary

    Added a dedicated CORS service that whitelists configured site origins, handles preflight requests, and applies credential-aware headers to auth and EFBD routes so session reads are accessible from the site frontend.

Centralized site base URL resolution for the auth controller to keep redirects and origin validation consistent across environments.

Testing

    ✅ npx mocha InterDeadIT/tests/interdead-auth-worker.test.js

⚠️ git commit -am "Add CORS support to auth worker session endpoint" (pre-commit automation ran map tasks; optional map:preview step failed due to missing system library libatk-1.0.so.0)

---

