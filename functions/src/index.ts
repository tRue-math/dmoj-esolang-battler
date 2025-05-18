import {onSchedule} from 'firebase-functions/v2/scheduler';
import {onRequest} from 'firebase-functions/v2/https';
import {onDocumentCreated} from 'firebase-functions/v2/firestore';
import * as logger from 'firebase-functions/logger';
import {initializeApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {defineString} from 'firebase-functions/params';
// biome-ignore lint: biome adds unnecessary ext
import {teamData, territoryData} from './initialData';

const app = initializeApp();
const db = getFirestore(app);

const Submission = db.collection('submissions');
const Territory = db.collection('territory');
const Team = db.collection('teams');

const apiTokenConfig = defineString('API_TOKEN');
const apiHostConfig = defineString('API_HOST');
const sessionIdConfig = defineString('SESSION_ID');
const problemIdConfig = defineString('PROBLEM_ID');

export const initializeData = onRequest(async (req, res) => {
	if (req.method !== 'GET') {
		res.status(405).send('Method Not Allowed');
		return;
	}

	const batch = db.batch();

	logger.info('Initializing territory and team');
	for (const cell of territoryData) {
		batch.set(
			Territory.doc(cell.language),
			{
				language: cell.language,
				languageId: cell.languageId,
				adjacent: cell.adjacent,
				owner:
					cell.language === 'Red' || cell.language === 'Blue'
						? cell.language
						: null,
				score: null,
				submissionId: null,
			},
			{merge: true},
		);
	}
	for (const team of teamData) {
		batch.set(
			Team.doc(team.team),
			{
				team: team.team,
				players: team.players,
			},
			{merge: true},
		);
	}
	await batch.commit();
	logger.info('Initialized territory and team');

	await paintTerritory();
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
		const {user} = await submission.data();
		const score = countBytes(data);
		const team = (await Team.where('players', 'array-contains', user).get())
			.docs[0]?.id;
		if (!team) {
			logger.error(`Team not found for user ${user}`);
			return;
		}
		logger.info(`Team ${team} found for user ${user}`);

		if (!score) {
			logger.error(`Score is null for submission ${submission.id}`);
			return;
		}

		await submission.ref.update({
			bytes: score,
			code: data,
			team,
		});
	},
);

const territoryUpdate = async ({
	language,
	team,
	score,
	submissionId,
}: {
	language: string;
	team: string;
	score: number;
	submissionId: number;
}) => {
	const targetCell = (
		await Territory.where('languageId', '==', language).get()
	).docs[0].data() as {
		language: string;
		score: number | null;
		owner: string | null;
		adjacent: string[];
	};
	if (!targetCell) {
		logger.error(`Target cell data not found for language ${language}`);
		return;
	}

	const isAdjacentToTeam = (
		await Promise.all(
			targetCell.adjacent.map(async (lang) => {
				const doc = await Territory.doc(lang).get();
				return doc.data()?.owner === team;
			}),
		)
	).some(Boolean);

	if (isAdjacentToTeam) {
		logger.info(`Cell ${targetCell.language} is adjacent to team ${team}`);
		if (targetCell.score === null || targetCell.score > score) {
			logger.info(`Updating cell ${targetCell.language} score to ${score}`);
			await Territory.doc(targetCell.language).update({
				score,
				submissionId,
				owner: team,
			});
		}
	} else {
		logger.info(`Cell ${targetCell.language} is not adjacent to team ${team}`);
	}
};

const paintTerritory = async () => {
	logger.info('Painting territory');
	const batch = db.batch();

	const batchSize = 500;

	const query = (await Submission.orderBy('date').limit(batchSize).get()).docs;

	for (const doc of query) {
		const {
			language,
			team,
			bytes: score,
			id: submissionId,
			result,
		} = await doc.data();
		if (!(language && team && score)) {
			logger.error('Language, team or score not found');
			continue;
		}
		if (result === 'AC') {
			await territoryUpdate({language, team, score, submissionId});
		}
		await territoryUpdate({language, team, score, submissionId});
	}
	await batch.commit();
	logger.info('Painted territory');
};

export const scheduledTerritoryUpdate = onSchedule(
	'every 1 minutes',
	paintTerritory,
);
export const requestedTerritoryUpdate = onRequest(async (req, res) => {
	if (req.method !== 'POST') {
		res.status(405).send('Method Not Allowed');
		return;
	}

	logger.info('Requested territory update');
	await paintTerritory();
	res.send('Territory updated');
});
