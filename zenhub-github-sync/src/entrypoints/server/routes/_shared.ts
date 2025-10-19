import { log } from 'apify';
import { LRUCache } from 'lru-cache';

interface EventDone<T, D> {
	event: T;
	data: D;
	timestamp: number;
}

type EventGap =
	| EventDone<
			'estimateUpdate',
			{
				newEstimate: number | null;
			}
	  >
	| EventDone<
			'statusUpdate',
			{
				newStatus: string;
			}
	  >;

const eventCache = new LRUCache<string, EventGap>({
	max: 10_000,
	// Cache for 30 seconds
	ttl: 30 * 1000,
	updateAgeOnGet: false,
	allowStale: false,
});

export function addEventGap(entityId: string, event: EventGap) {
	eventCache.set(`${entityId}:${event.event}`, event);

	log.perf('[EVENT CACHE] Added event gap', {
		entityId,
		event,
	});
}

export function similarEventHappenedRecently(entityId: string, event: EventGap) {
	const cached = eventCache.get(`${entityId}:${event.event}`);

	// We have a similar event in the cache, and its the same change as we'd have now
	if (cached && cached.data === event.data) {
		log.perf('[EVENT CACHE] Similar event happened recently', {
			entityId,
			event,
			happenedAt: cached.timestamp,
		});

		return true;
	}

	return false;
}

export async function runIfNoSimilarEventHappenedRecently(
	entityId: string,
	event: EventGap,
	callback: () => Promise<void>,
) {
	if (similarEventHappenedRecently(entityId, event)) {
		return;
	}

	// Cache the new event
	addEventGap(entityId, event);

	// Then call the callback
	await callback();
}
