const { describe, it } = require('node:test');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

describe('Ticker shortcode', () => {
  it('renders a text marquee with manual items only', () => {
    const templatePath = path.join('themes', 'InterDead', 'layouts', 'shortcodes', 'ticker.html');
    const template = fs.readFileSync(templatePath, 'utf8');

    assert.ok(template.includes('data-marquee="text"'));
    assert.ok(!template.includes('data-marquee="scroll"'));
    assert.ok(template.includes('gm-ticker__textTrack'));
    assert.ok(template.includes('.Scratch.Set "tickerItems"'));
    assert.ok(template.includes('.Inner'));
  });

  it('does not include blog category feed logic anymore', () => {
    const templatePath = path.join('themes', 'InterDead', 'layouts', 'shortcodes', 'ticker.html');
    const template = fs.readFileSync(templatePath, 'utf8');

    assert.ok(!template.includes('Params.blogcategory'));
    assert.ok(!template.includes('.Get "category"'));
    assert.ok(!template.includes('where .Page.Site.RegularPages'));
  });
});
