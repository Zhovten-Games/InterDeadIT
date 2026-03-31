---
domains: []
emits: []
implements: []
imports: []
listens: []
owns: []
schemaVersion: 1
source: InterDeadIT/themes/InterDead/assets/js/app.js
used_by: []
source_exists: true
runtime_role: application_bootstrap
contour_primary: FPN-COMMAND
contour_secondary: none
role_group: executive_control
narrative_role: "front-end bootstrap coordinator"
---

# JavaScript module map

This page tracks the current front-end modules inside `themes/InterDead/assets/js` and links them to their responsibility boundaries. Keep this file updated whenever a new module is added or removed.

## Entry point and composition

- `app.js` bootstraps all presentation controllers and wires adapters/services.

## Domain layer

- `domain/age/AgeMode.js`
- `domain/modal/ModalEntity.js`
- `domain/slider/SlideEntity.js`
- `domain/slider/SliderModel.js`

## Application layer

- `application/age/AgeModeService.js`
- `application/auth/AuthStateService.js`
- `application/auth/AuthVisibilityService.js`
- `application/auth/DiscordAuthService.js`
- `application/config/FeatureFlagService.js`
- `application/cta/CtaLinkService.js`
- `application/efbd/EfbdScaleBridgeService.js`
- `application/events/EventBus.js`
- `application/info/InfoPanelService.js`
- `application/info/MarkdownRenderer.js`
- `application/minigame/MiniGameAssetLoader.js`
- `application/minigame/MiniGameLauncher.js`
- `application/minigame/runtime.js`
- `application/modal/ModalInstance.js`
- `application/modal/ModalService.js`
- `application/notification/NotificationService.js`
- `application/slider/SliderService.js`
- `application/timer/CountdownTimer.js`

## Ports

- `ports/IEfbdScaleWritePort.js`
- `ports/ModalViewPort.js`
- `ports/ScrollControllerPort.js`
- `ports/SliderViewPort.js`
- `ports/StoragePort.js`

## Infrastructure adapters

- Auth adapters:
  - `infrastructure/auth/AuthSessionAdapter.js`
  - `infrastructure/auth/DiscordOAuthAdapter.js`
  - `infrastructure/auth/ProfileCleanupAdapter.js`
- Storage adapter:
  - `infrastructure/storage/LocalStorageAdapter.js`
- Information adapters:
  - `infrastructure/info/InfoContentAdapter.js`
- UI adapters:
  - `infrastructure/ui/DocumentScrollController.js`
  - `infrastructure/ui/InfoPanelView.js`
  - `infrastructure/ui/ModalDomMapper.js`
  - `infrastructure/ui/ModalView.js`
  - `infrastructure/ui/SliderDomMapper.js`
  - `infrastructure/ui/SliderView.js`
- Mini-game adapters:
  - `infrastructure/efbd/EfbdApiAdapter.js`
  - `infrastructure/minigame/EfbdScaleTriggerPort.js`

## Presentation controllers

- `presentation/controllers/AgeGateController.js`
- `presentation/controllers/AppPreloaderController.js`
- `presentation/controllers/AuthBadgeController.js`
- `presentation/controllers/AuthButtonController.js`
- `presentation/controllers/CountdownController.js`
- `presentation/controllers/CtaController.js`
- `presentation/controllers/FaqController.js`
- `presentation/controllers/FrameworkBridgeController.js`
- `presentation/controllers/HeaderActionsController.js`
- `presentation/controllers/HeaderLogoController.js`
- `presentation/controllers/HomeAuthController.js`
- `presentation/controllers/InfoTriggerController.js`
- `presentation/controllers/MarqueeController.js`
- `presentation/controllers/MenuModalController.js`
- `presentation/controllers/MetadataController.js`
- `presentation/controllers/ModalCloseController.js`
- `presentation/controllers/ModalTriggerController.js`
- `presentation/controllers/ProfilePageController.js`
- `presentation/controllers/ScrollEffectsController.js`
- `presentation/controllers/ScrollRevealController.js`
- `presentation/controllers/SliderController.js`
- `presentation/controllers/TabsController.js`
- `presentation/controllers/TwemojiController.js`

## Integration scripts

- `static/js/interdead-proto-loader.js` loads `InterDeadProto` launcher modes on host pages.
- `assets/mini-games/efbd-poll/poll.js` runs the standalone EFBD poll mini-game widget.

## Update checklist

When adding a new JavaScript module:

1. Put it into the proper architectural layer.
2. Add an entry in this file.
3. Add or update related docs in `docs/ui`, `docs/architecture`, or `docs/mini-games`.
4. Add a test when behavior is non-trivial.
