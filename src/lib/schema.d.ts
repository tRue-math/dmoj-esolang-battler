import type {DocumentData, FirestoreError} from 'firebase/firestore';

export interface UseFireStoreReturn<T> {
	data: T;
	loading: boolean;
	error: FirestoreError | null;
}

export interface Submission extends DocumentData {
	id: number;
	user: string;
	date: string;
	language: string;
	time: number;
	memory: number;
	points: number;
	result: string;
	code: string | null;
}

export interface CellBase extends DocumentData {
	language: string;
	languageId: string;
	adjacent: string[];
}

export interface Cell extends CellBase {
	owner: string | null;
	score: number | null;
	submissionId: number | null;
}