export default class MarkdownRenderer {
  constructor({ marked = null } = {}) {
    this.marked = marked;
  }

  render(markdown) {
    if (typeof markdown !== 'string') {
      return '';
    }
    if (this.marked?.parse) {
      return this.marked.parse(markdown);
    }
    return this._renderFallback(markdown);
  }

  _renderFallback(markdown) {
    const lines = markdown.replace(/\r\n/g, '\n').split('\n');
    const blocks = [];
    let index = 0;

    while (index < lines.length) {
      const line = lines[index];
      if (!line.trim()) {
        index += 1;
        continue;
      }

      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        blocks.push(`<h${level}>${this._escapeHtml(headingMatch[2])}</h${level}>`);
        index += 1;
        continue;
      }

      if (this._isTableHeader(line, lines[index + 1])) {
        const { tableHtml, nextIndex } = this._parseTable(lines, index);
        blocks.push(tableHtml);
        index = nextIndex;
        continue;
      }

      if (line.trim().startsWith('- ')) {
        const { listHtml, nextIndex } = this._parseList(lines, index);
        blocks.push(listHtml);
        index = nextIndex;
        continue;
      }

      blocks.push(`<p>${this._escapeHtml(line.trim())}</p>`);
      index += 1;
    }

    return blocks.join('\n');
  }

  _parseList(lines, startIndex) {
    const items = [];
    let index = startIndex;

    while (index < lines.length) {
      const line = lines[index];
      if (!line.trim().startsWith('- ')) {
        break;
      }
      items.push(`<li>${this._escapeHtml(line.trim().slice(2))}</li>`);
      index += 1;
    }

    return { listHtml: `<ul>${items.join('')}</ul>`, nextIndex: index };
  }

  _parseTable(lines, startIndex) {
    const headerCells = this._splitTableRow(lines[startIndex]);
    const columnCount = headerCells.length;
    const bodyRows = [];
    let index = startIndex + 2;

    while (index < lines.length && lines[index].includes('|')) {
      const rowCells = this._normalizeTableRow(this._splitTableRow(lines[index]), columnCount);
      if (rowCells.length) {
        const rowHtml = rowCells.map((cell) => `<td>${this._escapeHtml(cell)}</td>`).join('');
        bodyRows.push(`<tr>${rowHtml}</tr>`);
      }
      index += 1;
    }

    const headerHtml = headerCells
      .map((cell) => `<th scope="col">${this._escapeHtml(cell)}</th>`)
      .join('');

    const tableHtml = `<div class="gm-tableScroll"><table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyRows.join(
      '',
    )}</tbody></table></div>`;

    return { tableHtml, nextIndex: index };
  }

  _normalizeTableRow(cells, columnCount) {
    if (!Array.isArray(cells) || cells.length === 0) {
      return [];
    }

    if (!columnCount || cells.length === columnCount) {
      return cells;
    }

    if (cells.length > columnCount) {
      return cells.slice(0, columnCount);
    }

    return [...cells, ...new Array(columnCount - cells.length).fill('')];
  }

  _isTableHeader(line, nextLine) {
    if (!line || !nextLine) {
      return false;
    }
    return line.includes('|') && /^\s*\|?[:\-\s|]+\|?\s*$/.test(nextLine);
  }

  _splitTableRow(line) {
    const trimmed = line.trim();
    if (!trimmed.includes('|')) {
      return [];
    }

    const startsWithPipe = trimmed.startsWith('|');
    const endsWithPipe = trimmed.endsWith('|');
    const rawCells = trimmed.split('|');
    if (startsWithPipe) {
      rawCells.shift();
    }
    if (endsWithPipe) {
      rawCells.pop();
    }

    return rawCells.map((cell) => cell.trim());
  }

  _escapeHtml(value) {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
