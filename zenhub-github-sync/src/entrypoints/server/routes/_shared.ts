import { Collection } from '@discordjs/collection';
import { AsyncQueue } from '@sapphire/async-queue';
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

const eventCacheQueue = new Collection<string, AsyncQueue>();

export function addEventGap(entityId: string, event: EventGap) {
	eventCache.set(`${entityId}:${event.event}`, event);

	log.debug('[EVENT CACHE] Added event gap', {
		entityId,
		event,
	});
}

export function similarEventHappenedRecently(entityId: string, event: EventGap) {
	const cached = eventCache.get(`${entityId}:${event.event}`);

	// We have a similar event in the cache, and its the same change as we'd have now
	if (cached) {
		let similar = false;

		switch (event.event) {
			case 'estimateUpdate': {
				similar = cached.event === 'estimateUpdate' && cached.data.newEstimate === event.data.newEstimate;
				break;
			}
			case 'statusUpdate': {
				similar = cached.event === 'statusUpdate' && cached.data.newStatus === event.data.newStatus;
				break;
			}
			default: {
				similar = false;
				break;
			}
		}

		if (similar) {
			log.debug('[EVENT CACHE] Similar event happened recently', {
				entityId,
				event,
				happenedAt: cached.timestamp,
			});

			return true;
		}
	}

	return false;
}

export async function runIfNoSimilarEventHappenedRecently(
	entityId: string,
	event: EventGap,
	callback: () => Promise<void>,
) {
	const key = `${entityId}:${event.event}`;

	const queue = eventCacheQueue.ensure(key, () => new AsyncQueue());
	await queue.wait();

	try {
		if (similarEventHappenedRecently(entityId, event)) {
			return;
		}

		// Cache the new event
		addEventGap(entityId, event);

		// Then call the callback
		await callback();
	} finally {
		queue.shift();
	}
}
