const { describe, it } = require('node:test');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

describe('Posts informer shortcode', () => {
  it('uses reusable posts informer on every home page localization', () => {
    const homeFiles = [
      path.join('content', 'en', '_index.md'),
      path.join('content', 'ru', '_index.md'),
      path.join('content', 'uk', '_index.md'),
      path.join('content', 'ja', '_index.md'),
    ];

    for (const filePath of homeFiles) {
      const content = fs.readFileSync(filePath, 'utf8');
      assert.ok(content.includes('{{< posts-informer'));
      assert.ok(content.includes('section="blog"'));
      assert.ok(content.includes('category="/blog/artifacts/"'));
      assert.ok(content.includes('limit="6"'));
    }
  });

  it('delegates feed construction to shared informer core helper', () => {
    const templatePath = path.join('themes', 'InterDead', 'layouts', 'shortcodes', 'posts-informer.html');
    const template = fs.readFileSync(templatePath, 'utf8');

    assert.ok(template.includes('partial "helpers/posts-informer-feed.html"'));
  });

  it('keeps defaults and blog category filtering in shared helper', () => {
    const helperPath = path.join('themes', 'InterDead', 'layouts', 'partials', 'helpers', 'posts-informer-feed.html');
    const helper = fs.readFileSync(helperPath, 'utf8');

    assert.ok(helper.includes('default "blog"'));
    assert.ok(helper.includes('default "artifacts"'));
    assert.ok(helper.includes('Params.blogcategory'));
    assert.ok(helper.includes('first $limit'));
  });
});
