import { Accessor, createMemo, type Component } from 'solid-js';
import { Submissions } from '~/lib/firebase';
import { useFirestore } from 'solid-firebase';
import { groupBy, minBy, sortBy, uniq, zip } from 'lodash-es';
import type { Submission } from '~/lib/schema';

import styles from './index.module.css';
import { useSearchParams } from '@solidjs/router';

const languages: [string, string][] = [
	['Sed', 'SED'],
	['Java', 'JAVA'],
	['C', 'C11'],
	['Python', 'PYPY3'],
	['Ruby', 'RUBY'],
];

const regulations = [
	'SymbolLess',
	'Short',
	'Free',
	'Simple',
	'Vertical',
] as const;

const pars = [
	10,
	500,
	null,
	100,
	100,
];

type Regulation = typeof regulations[number];

type CellStatus = 'accepted' | 'rejected' | 'not-submitted';

interface Cell {
	owners: number[],
	solvers: number[],
	score: number | null,
	submissionId: number | null,
}

const calculateScore = (submission: Submission, regulation: Regulation) => {
	const par = pars[regulations.indexOf(regulation)]!;

	let score: number | null = 0;

	switch (regulation) {
		case 'SymbolLess':
			const symbols = '+-*/%&|^[]';
			score = Array.from(submission.code || '')
				.filter((char) => symbols.includes(char))
				.length;
			break;
		case 'Short':
			score = submission.code?.length || null;
			break;
		case 'Free':
			score = 1;
			break;
		case 'Simple':
			const uniqueCharacters = new Set(Array.from(submission.code || ''));
			score = uniqueCharacters.size;
			break;
		case 'Vertical':
			const lines = (submission.code || '').split(/\r?\n/);
			score = Math.max(...lines.map((line) => line.length));
			break;
	}

	if (par !== null && score !== null && score > par) {
		score = null;
	}

	return score;
};

const Index: Component = () => {
	const submissions = useFirestore(Submissions);
	const [searchParams] = useSearchParams();

	const users = createMemo(() => {
		if (!searchParams.users) {
			return [];
		}

		if (Array.isArray(searchParams.users)) {
			return searchParams.users;
		}

		return searchParams.users.split(',');
	});

	const bingoCells: Accessor<Cell[][]> = createMemo(() => {
		if (!submissions.data) {
			return [];
		}

		const cells: Cell[][] = [];
		const submissionsByLanguage = groupBy(submissions.data, (submission) => submission.language);

		const targetUsers = users();

		for (const regulation of regulations) {
			const row: Cell[] = [];

			for (const [languageName, languageId] of languages) {
				const submissions = submissionsByLanguage[languageId] || [];

				const acceptedSubmissions = submissions
					.filter((submission) => submission.result === 'AC')
					.filter((submission) => targetUsers.includes(submission.user))
					.filter((submission) => calculateScore(submission, regulation) !== null);
				const scoreSubmission = minBy(acceptedSubmissions, (submission) => calculateScore(submission, regulation));
				const score = scoreSubmission ? calculateScore(scoreSubmission, regulation) : null;
				const bestSubmissions = score ? acceptedSubmissions.filter((submission) => calculateScore(submission, regulation) === score) : [];

				const cell: Cell = {
					owners: sortBy(uniq(bestSubmissions.map((submission) => (
						targetUsers.indexOf(submission.user)
					)))),
					solvers: sortBy(uniq(acceptedSubmissions.map((submission) => (
						targetUsers.indexOf(submission.user)
					)))),
					score,
					submissionId: bestSubmissions.length >= 1 ? bestSubmissions[0].id : null,
				};

				row.push(cell);
			}

			cells.push(row);
		}

		return cells;
	});

	interface UserScore {
		bingo: number,
		solves: number,
		owners: number,
	}

	const userScores = createMemo<UserScore[]>(() => {
		const cells = bingoCells();

		if (cells.length === 0) {
			return [
				{
					bingo: 0,
					solves: 0,
					owners: 0,
				},
				{
					bingo: 0,
					solves: 0,
					owners: 0,
				},
			];
		}

		const userScores = new Map<number, number>();

		const addScore = (user: number) => {
			const score = userScores.get(user) || 0;
			userScores.set(user, score + 1);
		};

		// Vertical lines
		for (let i = 0; i < 5; i++) {
			const users = cells.map((row) => row[i].owners);
			const commonUsers = users.reduce((prev, current) => prev.filter((user) => current.includes(user)));
			commonUsers.forEach(addScore);
		}

		// Horizontal lines
		for (const row of cells) {
			const users = row.map((cell) => cell.owners);
			const commonUsers = users.reduce((prev, current) => prev.filter((user) => current.includes(user)));
			commonUsers.forEach(addScore);
		}

		// Diagonal lines
		{
			const users = [0, 1, 2, 3, 4].map((i) => cells[i][i].owners);
			const commonUsers = users.reduce((prev, current) => prev.filter((user) => current.includes(user)));
			commonUsers.forEach(addScore);
		}

		{
			const users = [0, 1, 2, 3, 4].map((i) => cells[i][4 - i].owners);
			const commonUsers = users.reduce((prev, current) => prev.filter((user) => current.includes(user)));
			commonUsers.forEach(addScore);
		}

		const solves = new Map<number, number>();

		for (const row of cells) {
			for (const cell of row) {
				for (const user of cell.solvers) {
					const solve = solves.get(user) || 0;
					solves.set(user, solve + 1);
				}
			}
		}

		const owners = new Map<number, number>();

		for (const row of cells) {
			for (const cell of row) {
				for (const user of cell.owners) {
					const owner = owners.get(user) || 0;
					owners.set(user, owner + 1);
				}
			}
		}

		return [
			{
				bingo: userScores.get(0) || 0,
				solves: solves.get(0) || 0,
				owners: owners.get(0) || 0,
			},
			{
				bingo: userScores.get(1) || 0,
				solves: solves.get(1) || 0,
				owners: owners.get(1) || 0,
			},
		];
	});

	return (
		<div class={styles.container}>
			<h1 class={styles.title}>TSG LIVE! 13: Codegolf Bingo</h1>
			<div class={styles.bingoCard}>
				<table class={styles.bingoTable}>
					<thead>
						<tr>
							<th></th>
							{languages.map(([languageName]) => (
								<th class={styles.languageHeader}>
									{languageName}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{zip(bingoCells(), regulations, pars).map(([cells, regulation, par]) => (
							<tr>
								<th class={styles.regulationHeader}>
									{regulation} {par === null ? '' : `(Par ${par})`}
								</th>
								{cells?.map((cell) => (
									<td
										class={styles.cell}
										classList={{
											[styles[`user-${cell.owners.join('')}`]]: true,
										}}
									>
										<a
											target="_blank"
											rel="noopener noreferrer"
											href={cell.submissionId === null ? undefined : `http://35.193.86.117:8000/submission/${cell.submissionId}`}
										>
											{regulation === 'Free' ? '' : cell.score}
										</a>
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>

			<div class={styles.userScores}>
				{users().map((user, i) => (
					i === 0 ? (
						<span
							classList={{
								[styles[`user-${i}`]]: true,
								[styles.userScore]: true,
							}}
						>
							<span class={styles.bingo}>
								{user} {userScores()[i].bingo}
							</span>
							<span class={styles.otherScores}>
								solves: {userScores()[i].solves}, owners: {userScores()[i].owners}
							</span>
						</span>
					) : (
						<span class={styles.userScoreContainer}>
							<span>&nbsp;-&nbsp;</span>
							<span
								classList={{
									[styles[`user-${i}`]]: true,
									[styles.userScore]: true,
								}}
							>
								<span class={styles.bingo}>
									{userScores()[i].bingo} {user}
								</span>
								<span class={styles.otherScores}>
									solves: {userScores()[i].solves}, owners: {userScores()[i].owners}
								</span>
							</span>
						</span>
					)
				))}
			</div>
		</div>
	);
};

export default Index;
