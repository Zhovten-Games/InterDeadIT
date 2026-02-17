import assert from 'assert';
import MarkdownRenderer from '../themes/InterDead/assets/js/application/info/MarkdownRenderer.js';

describe('MarkdownRenderer', () => {
  it('renders headings and paragraphs', () => {
    const renderer = new MarkdownRenderer();
    const html = renderer.render('# Title\n\nSome copy');
    assert.ok(html.includes('<h1>Title</h1>'));
    assert.ok(html.includes('<p>Some copy</p>'));
  });

  it('renders simple tables', () => {
    const renderer = new MarkdownRenderer();
    const html = renderer.render('| A | B |\n| --- | --- |\n| 1 | 2 |');
    assert.ok(html.includes('<table>'));
    assert.ok(html.includes('<th scope="col">A</th>'));
    assert.ok(html.includes('<td>1</td>'));
  });
});
