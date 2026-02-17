const { describe, it } = require('node:test');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

describe('Article TOC marquee integration', () => {
  it('keeps text marquee hooks on post pages for current-heading label', () => {
    const templatePath = path.join('themes', 'InterDead', 'layouts', 'partials', 'components', 'article-toc.html');
    const template = fs.readFileSync(templatePath, 'utf8');

    assert.ok(template.includes('data-marquee="text"'));
    assert.ok(template.includes('data-marquee-media="(max-width: 979px)"'));
    assert.ok(template.includes('data-marquee-track'));
  });

  it('updates the current-heading label text that marquee uses for overflow scrolling', () => {
    const scriptPath = path.join('themes', 'InterDead', 'layouts', 'partials', 'components', 'article-toc-script.html');
    const script = fs.readFileSync(scriptPath, 'utf8');

    assert.ok(script.includes('currentText.textContent = activeText'));
    assert.ok(script.includes('currentText.setAttribute(\'data-text\', activeText)'));
  });
});
