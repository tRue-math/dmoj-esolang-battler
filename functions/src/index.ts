import {onRequest} from "firebase-functions/v2/https";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import {initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";
import {defineString} from "firebase-functions/params";

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

const app = initializeApp();
const db = getFirestore(app);

const Submission = db.collection('submissions');

const apiTokenConfig = defineString('API_TOKEN');
const apiHostConfig = defineString('API_HOST');
const sessionIdConfig = defineString('SESSION_ID');
const problemIdConfig = defineString('PROBLEM_ID');

export const scrapeSubmissions = onRequest(async (request, response) => {
	const API_TOKEN = apiTokenConfig.value();
	const API_HOST = apiHostConfig.value();
	const PROBLEM_ID = problemIdConfig.value();

	const res = await fetch(`http://${API_HOST}/api/v2/submissions?problem=${PROBLEM_ID}`, {
		method: 'GET',
		headers: {
			'Authorization': `Bearer ${API_TOKEN}`
		},
	});
	const {data} = await res.json();

	console.log(`Received ${data.objects.length} submissions`);

	const batch = db.batch();

	for (const submission of data.objects) {
		console.log(`Adding submission ${submission.id}`);

		batch.set(Submission.doc(submission.id.toString()), {
			id: submission.id,
			user: submission.user,
			date: submission.date,
			language: submission.language,
			time: submission.time,
			memory: submission.memory,
			points: submission.points,
			result: submission.result,
		}, {merge: true});
	}

	await batch.commit();

	console.log(`Added ${data.objects.length} submissions`);

	response.send("ok");
});

// TODO: Cache invalidation

export const onSubmissionCreated = onDocumentCreated('submissions/{submissionId}', async (event) => {
	const API_HOST = apiHostConfig.value();
	const SESSION_ID = sessionIdConfig.value();

	const submission = event.data;

	if (!submission) {
		logger.error('Submission not found');
		return;
	}

	console.log(`Submission ${submission.id} created`);

	const res = await fetch(`http://${API_HOST}/src/${submission.id}/raw`, {
		method: 'GET',
		headers: {
			Cookie: `sessionid=${SESSION_ID}`,
		},
	});
	const data = await res.text();

	await submission.ref.update({
		code: data,
	});
});
