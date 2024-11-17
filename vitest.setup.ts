import {beforeEach, vi} from 'vitest';

const originalFetch = global.fetch;
const fetchMock = vi.spyOn(global, 'fetch');
fetchMock.mockImplementation((...args) => {
	const [url] = args;
	if (url === '/__/firebase/init.json') {
		return Promise.resolve(
			new Response(
				JSON.stringify({
					apiKey: 'fakeApiKey',
					projectId: 'tsg-live-13-golf-visualizer',
				}),
			),
		);
	}
	return originalFetch(...args);
});

beforeEach(async () => {
	// Reset firestore data
	await originalFetch(
		'http://localhost:8080/emulator/v1/projects/tsg-live-13-golf-visualizer/databases/(default)/documents',
		{
			method: 'DELETE',
		},
	);
});
