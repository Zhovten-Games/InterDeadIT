# Governance

The [Founding Profile](PROFILE.md) and [ecosystem legislation](legislation/ECOSYSTEM.md) are adopted under the owner mandate of 2026-11-07. The [register](ecosystem.json) selects technical scopes and complete check commands; [adoption hashes](adoption-2026-11-07.json) bind the exact normative bytes. Existing product-specific acts remain local sources within their scope.

Run `node tools/warden.mjs`. Generated reports are written to `.warden/report.json`.

## Amendment of 2026-11-10

The [2026-11-10 amendment](adoption-2026-11-10.json) records the owner-requested editorial and interoperability scope. The [initial adoption](adoption-2026-11-07.json) remains available with its original hashes.

## Source references and reader editions

The [current reference decision](decisions/2026-11-19-source-references.md) and [adoption record](adoption-2026-11-19.json) select pinned [source references](SOURCES.json). Local Profile and legislation retain their authority and technical overrides. Universal source texts are read directly from the submodules:

- Constitution: [English](../.code-constitution/locales/en/CONSTITUTION_CODE.md), [Русский](../.code-constitution/locales/ru/CONSTITUTION_CODE.md), [Українська](../.code-constitution/locales/uk/CONSTITUTION_CODE.md), [Беларуская](../.code-constitution/locales/be/CONSTITUTION_CODE.md).
- Licensing policy and reference terms: [pinned policy](../.licensing-policy/README.md).
- Project Profile, legislation and licensing: [Ukrainian reader edition](locales/uk/README.md).

Initialize the declared sources before verification:

```bash
git submodule update --init --recursive
```
