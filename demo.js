import { mountSerpentine } from './src/index.ts';

const names = ['Telemetry', 'Gateway', 'Camera Wall', 'Task Queue', 'Patch Watch', 'Backups', 'Radio Mesh', 'Weather', 'Announcer', 'Energy', 'Mailroom', 'Sensors', 'Notes', 'Transit', 'Deploys', 'Archive'];
const stage = document.getElementById('serpentine-stage');
const status = document.getElementById('serpentine-status');
const cards = names.map((name, index) => {
  const card = document.createElement('article');
  card.className = 'serpentine-card';
  card.style.setProperty('--accent', `hsl(${index * 37} 40% 42%)`);
  const number = document.createElement('span');
  number.className = 'serpentine-eyebrow';
  number.textContent = String(index + 1).padStart(2, '0');
  const title = document.createElement('h2');
  title.textContent = name;
  card.append(number, title);
  stage.append(card);
  return card;
});
const view = mountSerpentine(stage, cards, (first, last, total) => {
  status.textContent = `${first}–${last} of ${total}`;
  document.getElementById('previous').disabled = first === 1;
  document.getElementById('next').disabled = last === total;
});
document.getElementById('previous').addEventListener('click', () => view.step(-1));
document.getElementById('next').addEventListener('click', () => view.step(1));
