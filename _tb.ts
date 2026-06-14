import { heuristicBucket, reconcileSubpages, type WikiBucketKey } from './utils/titleBucket.ts';
const titles = [
  'Pick Me Up! Wiki', 'Pick Me Up!', 'Main Page', 'Moebius', 'Niflheim',
  'Han Isratte', 'Han Isratte/Artifacts', 'Han Isratte/Relationships', 'Han Isratte/gallery',
  'Jenna Shirai', 'Aaron Delkirt', 'Iolka Rivel Strachur', 'Edith Karlen', 'Belkist',
  'Nerissa Iyor', 'Kishasha Vixyabi', 'Katio Lusani', 'Sirris Azenthem', 'Yulnet Sid',
  'Ridigeon', 'Ridigeon/Chronology', 'Ridigeon/Relationships', 'Nihaku Gestfel',
  'Muden Nidelk', '"Tel"', 'Eselle', 'Friacis Al Ragna', 'Taonere (disambiguation)',
  'Elderkin Branch', 'Six Star Heroes', 'Goblin', 'Star Ranking System', 'Floor 50',
];
const map: Record<string, WikiBucketKey> = {};
for (const t of titles) map[t] = heuristicBucket(t);
const fixed = reconcileSubpages(map);
const byBucket: Record<string, string[]> = {};
for (const [t, b] of Object.entries(fixed)) (byBucket[b] ??= []).push(t);
for (const b of ['characters', 'locations', 'systems', 'timeline', 'worldview'])
  console.log(`\n[${b}] (${(byBucket[b] || []).length})\n  ${(byBucket[b] || []).join('\n  ')}`);
