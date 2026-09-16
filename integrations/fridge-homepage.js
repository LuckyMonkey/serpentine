import { mountSerpentine } from '../src/index.ts';
import { faviconPalette } from '../src/favicon.ts';

const palettes = new Map();
function colorFromIcon(image, card) {
  try {
    let palette = palettes.get(image.src);
    if (!palettes.has(image.src)) {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 32;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, 0, 0, 32, 32);
      palette = faviconPalette(context.getImageData(0, 0, 32, 32).data, 32, 32);
      palettes.set(image.src, palette);
    }
    if (!palette) return;
    card.style.setProperty('--icon-edge', palette.edge);
    card.style.setProperty('--icon-tint', palette.tint);
    card.style.setProperty('--card-ink', palette.ink);
    card.dataset.palette = 'favicon';
  } catch {
    // Cross-origin or undecodable icons keep the neutral, readable default.
  }
}

const root = document.getElementById('serpentine-root');
const links = JSON.parse(document.getElementById('homepage-links')?.textContent || '[]');
const shell = document.createElement('nav');
shell.className = 'shell';
shell.tabIndex = 0;
shell.setAttribute('aria-label', 'Fridge links. Use the wheel or arrow keys to move one position.');
const board = document.createElement('div');
board.className = 'cards';
const hint = document.createElement('p');
hint.className = 'hint';
const cards = links.map(item => {
  const card = document.createElement('a');
  card.className = 'card';
  card.href = item.link;
  card.title = item.link;
  const icon = document.createElement('span');
  icon.className = 'icon-well';
  icon.setAttribute('aria-hidden', 'true');
  const image = document.createElement('img');
  image.className = 'favicon';
  image.alt = '';
  image.decoding = 'async';
  image.addEventListener('load', () => colorFromIcon(image, card), { once: true });
  image.addEventListener('error', () => {
    const fallback = document.createElement('span');
    fallback.className = 'icon-fallback';
    fallback.textContent = (item.name || item.host || '?').trim().slice(0, 1).toUpperCase();
    icon.replaceChildren(fallback);
  }, { once: true });
  image.src = item.favicon;
  icon.append(image);
  const copy = document.createElement('span');
  copy.className = 'copy';
  const name = document.createElement('span');
  name.className = 'name';
  name.textContent = item.name;
  const url = document.createElement('span');
  url.className = 'url';
  url.textContent = item.description || item.url || item.host || item.link;
  copy.append(name, url);
  card.append(icon, copy);
  board.append(card);
  return card;
});
shell.append(board, hint);
root.replaceChildren(shell);
mountSerpentine(shell, cards, (first, last, total) => {
  hint.textContent = !total ? 'no links' : last - first + 1 === total ? 'all links visible' : `${first}–${last} of ${total} · wheel or ↑ ↓ to move`;
});
document.documentElement.classList.add('js-ready');
