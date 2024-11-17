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
