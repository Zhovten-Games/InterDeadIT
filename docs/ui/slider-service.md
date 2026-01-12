# Slider service

The slider uses a service + view port split so that the slide logic remains separate from DOM specifics.

## Key classes

- **SliderService**: owns ordering, navigation, and scoreboard updates.
- **SliderCollection / SlideEntity**: normalize and present slide data to the service.
- **SliderViewPort**: contract for view adapters (rendering, navigation binding, scoreboard hooks).
- **SliderView**: DOM adapter that maps slides to elements, binds events, and manages transitions.

## Initialization flow

1. `SliderService.init()` sorts and normalizes slides.
2. The view prepares slides, renders dots, and binds navigation and swipe gestures.
3. The service syncs the transform and scoreboard state, then triggers fade timing.

## Scoreboard behavior

`SliderService` calls `updateScoreboard` on each slide change. The view is responsible for:

- Updating base text and counts.
- Providing an aria announcement for accessibility.
- Animating the count when moving forward.

## Usage guidance

When adding a new slider variation:

- Extend or replace the `SliderViewPort` implementation rather than rewriting `SliderService`.
- Keep DOM selectors and class names inside the view adapter.
- Use the mapper to keep entity-to-element mapping consistent.
