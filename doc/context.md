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

Работаем внутри каталога InterDeadIT:
 -- Выполните, пожалуйста, задания описанные в InterDeadIT/doc/interdead-efbd-profile-enhancements-spec
Уточнение:
 -- Реализация ядер, которые мы не трогаем, находятся в: InterDeadCore

Summary

    Added a session-bound EFBD summary endpoint with query support, refreshed server wiring, and exposed the new /efbd/summary path through client adapters and feature bridge logic.

Rebuilt the profile page into a dossier layout with EFBD axis rendering, updated controller behavior, and new styling for avatars and scale metadata.

Introduced breadcrumbs and homepage auth/countdown visibility tweaks, including sticky header actions, equal-height CTAs, and countdown hiding after authentication.

Expanded localization with EFBD strings, breadcrumb labels, and removal of “Nostalgia” plan references, plus added coverage for the EFBD summary adapter.

Testing

    ❌ npm test *(fails: missing module /workspace/testerer-deploy.github.io/person/src/application/services/WeightedScoreEngine.js)*

---

Ознакомьтесь, пожалуйста со старым ТЗ:

InterDeadIT/doc/interdead-efbd-profile-enhancements-spec

Не было сделано/не получилось:

1. Обратный отсчет по прежнему доступен для тех, кто авторизовался. Нужно исправить.
2. Контент: у нас есть блок "Stories that should never have happened", а следующий "Outcomes that were meant to happen". Во всех локалях название второго блока должно начинаться с того же слова, что название предыдущего, в случае с англ "Stories".
3. “Nostalgia” plan -- не убрано из отзывов, у нас нет планов, нужно убрать во всех локалях этот момент.

Это нужно доработать. Также:

4. На странице профиля сейчас "You are not authenticated. Please sign in from the home page to view your profile." на этом месте пусть будет нижний блок "EFBD dossier" (в мобильной версии, пусть они друг под другом), а саму надпись:

>> You are not authenticated. Please sign in from the home page to view your profile.

... оставьте только для НЕавторизованных вместо всего юзерского контента на странице.

5. Дублирующиеся данные:

>>

Display name
Username

... под блоком с аватаром просто уберите, пусть будет только ID.

Следуйте нашим идеалам в /README (в корне репозитория).

Summary

    Home hero countdown now reacts to authentication by toggling visibility and stopping the timer for signed-in sessions while leaving it active for guests.

Profile page hides EFBD and identity content when unauthenticated, fills all repeated identity fields consistently, and leaves only the Profile ID in the details table to avoid duplicate display of names.

Localization tweaks align the “inevitable” stories block headings with the preceding stories title across locales and remove “Nostalgia” plan wording from Marina’s reviews in every language variant.

Testing

    ⚠️ map:preview (fails in container: missing libatk for Puppeteer)

✅ map:test

---

...