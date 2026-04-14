export type DemoItem = {
  id: string;
  title: string;
  subtitle: string;
  eyebrow: string;
  accent: string;
};

export const demoItems: DemoItem[] = [
  { id: 'telemetry', title: 'Telemetry', subtitle: 'live counters and traces', eyebrow: 'system', accent: '#be6d2f' },
  { id: 'gateway', title: 'Gateway', subtitle: 'edge ingress and tunnel state', eyebrow: 'network', accent: '#3f7d6f' },
  { id: 'camera-wall', title: 'Camera Wall', subtitle: 'feeds and retention windows', eyebrow: 'video', accent: '#5f63d9' },
  { id: 'tasks', title: 'Task Queue', subtitle: 'batched follow-up actions', eyebrow: 'ops', accent: '#9c4f7d' },
  { id: 'patches', title: 'Patch Watch', subtitle: 'rollout windows and reboots', eyebrow: 'fleet', accent: '#7b6a35' },
  { id: 'backups', title: 'Backups', subtitle: 'last snapshots and drift alerts', eyebrow: 'storage', accent: '#386b92' },
  { id: 'radios', title: 'Radio Mesh', subtitle: 'nodes, hops, and airtime', eyebrow: 'wireless', accent: '#2d8577' },
  { id: 'weather', title: 'Weather', subtitle: 'local conditions and trends', eyebrow: 'ambient', accent: '#6d59c9' },
  { id: 'announcer', title: 'Announcer', subtitle: 'speech queue and alerts', eyebrow: 'voice', accent: '#b85e43' },
  { id: 'energy', title: 'Energy', subtitle: 'load, export, and battery', eyebrow: 'power', accent: '#8b7d29' },
  { id: 'mail', title: 'Mailroom', subtitle: 'label flow and drafts', eyebrow: 'inbox', accent: '#9b4c69' },
  { id: 'sensors', title: 'Sensors', subtitle: 'temperature and presence tiles', eyebrow: 'signals', accent: '#3d79aa' },
  { id: 'notes', title: 'Notes', subtitle: 'capture stream and daily logs', eyebrow: 'text', accent: '#4f7f44' },
  { id: 'transit', title: 'Transit', subtitle: 'arrivals and service changes', eyebrow: 'city', accent: '#a0532d' },
  { id: 'deploys', title: 'Deploys', subtitle: 'service versions and checks', eyebrow: 'release', accent: '#6761c1' },
  { id: 'archive', title: 'Archive', subtitle: 'cold storage and exports', eyebrow: 'history', accent: '#536f87' }
];

