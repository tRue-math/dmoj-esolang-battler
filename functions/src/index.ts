import {onSchedule} from 'firebase-functions/v2/scheduler';
import {onRequest} from 'firebase-functions/v2/https';
import {onDocumentCreated} from 'firebase-functions/v2/firestore';
import * as logger from 'firebase-functions/logger';
import {initializeApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {defineString} from 'firebase-functions/params';
// biome-ignore lint: biome adds unnecessary ext
import {territoryData} from './territoryData';

const app = initializeApp();
const db = getFirestore(app);

const Submission = db.collection('submissions');
const Territory = db.collection('territory');

const apiTokenConfig = defineString('API_TOKEN');
const apiHostConfig = defineString('API_HOST');
const sessionIdConfig = defineString('SESSION_ID');
const problemIdConfig = defineString('PROBLEM_ID');

export const initializeTerritory = onRequest(async (req, res) => {
	if (req.method !== 'GET') {
		res.status(405).send('Method Not Allowed');
		return;
	}

	logger.info('Initializing territory');

	const batch = db.batch();

	for (const cell of territoryData) {
		batch.set(
			Territory.doc(cell.language),
			{
				language: cell.language,
				languageId: cell.languageId,
				adjacent: cell.adjacent,
				owner: null,
				score: null,
				submissionId: null,
			},
			{merge: true},
		);
	}
	await batch.commit();

	logger.info('Initialized territory');
});

export const scrapeSubmissions = onSchedule('every 1 minutes', async () => {
	logger.info('Scraping submissions');

	const apiToken = apiTokenConfig.value();
	const apiHost = apiHostConfig.value();
	const problemId = problemIdConfig.value();

	const res = await fetch(
		`http://${apiHost}/api/v2/submissions?problem=${problemId}`,
		{
			method: 'GET',
			headers: {
				Authorization: `Bearer ${apiToken}`,
			},
		},
	);
	const {data} = await res.json();

	logger.info(`Received ${data.objects.length} submissions`);

	const batch = db.batch();

	for (const submission of data.objects) {
		batch.set(
			Submission.doc(submission.id.toString()),
			{
				id: submission.id,
				user: submission.user,
				date: submission.date,
				language: submission.language,
				time: submission.time,
				memory: submission.memory,
				points: submission.points,
				result: submission.result,
			},
			{merge: true},
		);
	}

	await batch.commit();

	logger.info(`Added ${data.objects.length} submissions`);
});

export const invalidateSubmissions = onRequest(async (req, res) => {
	if (req.method !== 'POST') {
		res.status(405).send('Method Not Allowed');
		return;
	}

	logger.info('Invalidating submissions');

	const batchSize = 500;

	const query = Submission.orderBy('__name__').limit(batchSize);

	let count = 0;

	while (true) {
		const snapshot = await query.get();

		if (snapshot.empty) {
			break;
		}

		const batch = db.batch();
		for (const doc of snapshot.docs) {
			batch.delete(doc.ref);
			count++;
		}
		await batch.commit();
	}

	res.send(`Invalidated ${count} submissions`);
});

const countBytes = (code: string | null) => {
	return code?.length ?? null;
};

export const onSubmissionCreated = onDocumentCreated(
	'submissions/{submissionId}',
	async (event) => {
		const apiHost = apiHostConfig.value();
		const sessionId = sessionIdConfig.value();

		const submission = event.data;

		if (!submission) {
			logger.error('Submission not found');
			return;
		}

		logger.info(`Submission ${submission.id} created`);

		const res = await fetch(`http://${apiHost}/src/${submission.id}/raw`, {
			method: 'GET',
			headers: {
				Cookie: `sessionid=${sessionId}`,
			},
		});
		const data = await res.text();
		const language = submission.data().language;
		const score = await countBytes(data);
		const team = 'Red'; // TODO: Get team from submission

		await submission.ref.update({
			code: data,
			bytes: score,
		});

		if (!score) {
			logger.error(`Score is null for submission ${submission.id}`);
			return;
		}

		const targetCell = (await Territory.doc(language).get()).data() as {
			language: string;
			score: number | null;
			owner: string | null;
			adjacent: string[];
		};
		if (!targetCell) {
			logger.error(`Target cell data not found for language ${language}`);
			return;
		}

		if (
			targetCell.adjacent.filter(
				async (lang) =>
					(await Territory.doc(lang).get()).data()?.owner === team,
			).length > 0
		) {
			logger.info(`Cell ${targetCell.language} is adjacent to team ${team}`);
			if (targetCell.score === null || targetCell.score > score) {
				logger.info(`Updating cell ${targetCell.language} score to ${score}`);
				await Territory.doc(targetCell.language).update({
					score: score,
					submissionId: submission.id,
					owner: team,
				});
			}
		}
	},
);
