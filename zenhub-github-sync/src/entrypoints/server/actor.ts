import { Actor } from 'apify';

await Actor.init();

await import('./app.ts');
