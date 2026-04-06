import { HugoConfigSourceAdapter } from '@interdead/framework';

const FALLBACK_MEMBRANE_COLOR = '#e53935';

class LinkColorPaletteResolver {
  constructor({
    windowRef = window,
    documentRef = document,
    fallbackColor = FALLBACK_MEMBRANE_COLOR,
  } = {}) {
    this.windowRef = windowRef;
    this.documentRef = documentRef;
    this.fallbackColor = fallbackColor;
  }

  resolveMembraneColor() {
    const rootElement = this.documentRef.documentElement;

    if (!rootElement || !this.windowRef?.getComputedStyle) {
      return this.fallbackColor;
    }

    const styles = this.windowRef.getComputedStyle(rootElement);
    const tokenColor = styles.getPropertyValue('--color-link').trim();

    return tokenColor || this.fallbackColor;
  }
}

export default class HostMembraneConfigSourceAdapter extends HugoConfigSourceAdapter {
  constructor({ documentRef = document, paletteResolver } = {}) {
    super(documentRef);
    this.paletteResolver = paletteResolver || new LinkColorPaletteResolver({ documentRef });
  }

  load() {
    const baseConfig = super.load();
    const membraneColor = this.paletteResolver.resolveMembraneColor();

    return {
      ...baseConfig,
      featureOptions: {
        ...baseConfig.featureOptions,
        membrane: {
          ...baseConfig.featureOptions?.membrane,
          lineColor: membraneColor,
          pulseColor: membraneColor,
        },
      },
    };
  }
}
