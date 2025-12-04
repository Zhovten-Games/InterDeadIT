import assert from 'assert';
import fs from 'fs';
import path from 'path';

const templatePath = path.join('themes', 'InterDead', 'layouts', 'partials', 'menu-modal.html');
const template = fs.readFileSync(templatePath, 'utf8');

describe('Menu modal active state', () => {
  it('marks the current section with the same active styling as the language picker', () => {
    assert.ok(template.includes('gm-modal__option--current'), 'current option class missing');
    assert.ok(template.includes('aria-current="true"'), 'aria-current flag missing on active item');
    assert.ok(template.includes('gm-modal__badge'), 'current badge missing for active navigation');
  });
});
