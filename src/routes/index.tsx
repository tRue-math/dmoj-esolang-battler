import {type Accessor, createMemo, type Component} from 'solid-js';
import {Submissions} from '~/lib/firebase';
import {useFirestore} from 'solid-firebase';
import {groupBy, minBy, sortBy, uniq} from 'lodash-es';
import type {Submission} from '~/lib/schema';

import styles from './index.module.css';
import {useSearchParams} from '@solidjs/router';

const languages: [string, string][] = [
	['Rust', 'RUST'],
	['プロデル', 'PRDR'],
	['Mines', 'MINES'],
	['OCaml', 'OCAML'],
	['Ruby', 'RUBY'],
	['Starry', 'STARRY'],
	['Brainfuck', 'BFPY'],
	['ferNANDo', 'FNAND'],
	['C', 'C11'],
	['><>', 'FISH'],
	['05AB1E', 'OSABIE'],
	['Aheui', 'AHEUI'],
	['Python', 'PYPY3'],
];

const teamNames = ['Red', 'Blue'];

interface Cell {
	language: string;
	teams: number[];
	score: number | null;
	submissionId: number | null;
}

const countBytes = (submission: Submission) => {
	return submission.code?.length ?? null;
};

const Index: Component = () => {
	const submissions = useFirestore(Submissions);
	const [searchParams] = useSearchParams();

	const teams = createMemo<[string[], string[]]>(() => {
		if (searchParams.team1 && searchParams.team2) {
			const team1 = Array.isArray(searchParams.team1)
				? searchParams.team1
				: searchParams.team1.split(',');
			const team2 = Array.isArray(searchParams.team2)
				? searchParams.team2
				: searchParams.team2.split(',');
			return [team1, team2];
		}

		if (searchParams.users) {
			const users = Array.isArray(searchParams.users)
				? searchParams.users
				: searchParams.users.split(',');
			return [users[0] ? [users[0]] : [], users[1] ? [users[1]] : []];
		}

		return [[], []];
	});

	const dates = createMemo<{from: number; to: number}>(() => {
		let datefrom = 0;
		if (searchParams.datefrom) {
			const datefromString = Array.isArray(searchParams.datefrom)
				? searchParams.datefrom[0]
				: searchParams.datefrom;
			datefrom = new Date(datefromString).getTime();
			datefrom = Number.isNaN(datefrom) ? 0 : datefrom;
		}

		let dateto = Number.POSITIVE_INFINITY;
		if (searchParams.dateto) {
			const datetoString = Array.isArray(searchParams.dateto)
				? searchParams.dateto[0]
				: searchParams.dateto;
			dateto = new Date(datetoString).getTime();
			dateto = Number.isNaN(dateto) ? Number.POSITIVE_INFINITY : dateto;
		}

		return {
			from: datefrom,
			to: dateto,
		};
	});

	const golfCells: Accessor<Cell[]> = createMemo(() => {
		const cells: Cell[] = [];
		const submissionsByLanguage = groupBy(
			submissions.data,
			(submission) => submission.language,
		);

		const targetTeams = teams();
		for (const [_languageName, languageId] of languages) {
			const submissions = submissionsByLanguage[languageId] || [];

			const acceptedSubmissions = submissions
				.filter((submission) => submission.result === 'AC')
				.filter((submission) => targetTeams.flat().includes(submission.user))
				.filter((submission) => countBytes(submission) == null)
				.filter((submission) => {
					const date = new Date(submission.date).getTime();
					return dates().from <= date && date <= dates().to;
				});
			const scoreSubmission = minBy(acceptedSubmissions, (submission) =>
				countBytes(submission),
			);
			const score = scoreSubmission ? countBytes(scoreSubmission) : null;
			const bestSubmissions =
				score === null
					? []
					: acceptedSubmissions.filter(
							(submission) => countBytes(submission) === score,
						);

			const cell: Cell = {
				language: _languageName,
				teams: sortBy(
					uniq(
						bestSubmissions.map((submission) =>
							targetTeams.findIndex((team) => team.includes(submission.user)),
						),
					),
				),
				score,
				submissionId: scoreSubmission ? scoreSubmission.id : null,
			};

			cells.push(cell);
		}
		const redCell = {
			language: 'RED',
			teams: [],
			score: null,
			submissionId: null,
		};
		const blueCell = {
			language: 'BLUE',
			teams: [],
			score: null,
			submissionId: null,
		};
		cells.unshift(redCell);
		cells.splice(6, 0, blueCell, redCell);
		cells.splice(9, 0, blueCell);
		cells.splice(11, 0, redCell);
		cells.splice(13, 0, blueCell, redCell);
		cells.push(blueCell);
		//デバッグ用
		// const debugBlue = {
		// 	language: 'DEBUG',
		// 	teams: [1],
		// 	score: 10,
		// 	submissionId: null,
		// };
		// const debugRed = {
		// 	language: 'DEBUG',
		// 	teams: [0],
		// 	score: 10,
		// 	submissionId: null,
		// };
		// return [
		// 	redCell,
		// 	debugBlue,
		// 	debugRed,
		// 	debugRed,
		// 	debugBlue,
		// 	debugBlue,
		// 	blueCell,
		// 	redCell,
		// 	debugRed,
		// 	blueCell,
		// 	debugRed,
		// 	redCell,
		// 	debugRed,
		// 	blueCell,
		// 	redCell,
		// 	debugBlue,
		// 	debugBlue,
		// 	debugBlue,
		// 	debugBlue,
		// 	debugBlue,
		// 	blueCell,
		// ];
		return cells;
	});

	const userScores = createMemo<number[]>(() => {
		const cells = golfCells();

		if (cells.length === 0) {
			return [0, 0];
		}

		const owners = new Map<number, number>();

		for (const cell of cells) {
			for (const team of cell.teams) {
				const owner = owners.get(team) || 0;
				owners.set(team, owner + 1);
			}
		}

		return [owners.get(0) || 0, owners.get(1) || 0];
	});

	return (
		<div class={styles.container}>
			<h1 class={styles.title}>TSG LIVE! 14: Codegolf</h1>
			<div class={styles.bingoCard}>
				<div class={styles.golfGrid}>
					{golfCells().map((cell) =>
						cell.language === 'RED' || cell.language === 'BLUE' ? (
							<div
								class={styles.cell}
								classList={{
									[styles[`user-${cell.language === 'RED' ? 0 : 1}`]]: true,
								}}
							/>
						) : (
							<a
								class={styles.cell}
								classList={{
									[styles[`user-${cell.teams.join('')}`]]: true,
								}}
								target="_blank"
								rel="noopener noreferrer"
								href={
									cell.submissionId === null
										? undefined
										: `http://${import.meta.env.VITE_API_HOST}/submission/${cell.submissionId}`
								}
							>
								<div class={styles.languageName}>{cell.language}</div>
								<div class={styles.score}>{cell.score}</div>
							</a>
						),
					)}
				</div>
			</div>

			<div class={styles.userScores}>
				{teams().map((teamUsers, i) =>
					i === 0 ? (
						<span
							classList={{
								[styles[`user-${i}`]]: true,
								[styles.userScore]: true,
							}}
						>
							<span class={styles.bingo}>
								{teamUsers.length === 1 ? teamUsers[0] : teamNames[i]}{' '}
								{userScores()[i]}
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
									{userScores()[i]}{' '}
									{teamUsers.length === 1 ? teamUsers[0] : teamNames[i]}
								</span>
							</span>
						</span>
					),
				)}
			</div>
		</div>
	);
};

export default Index;
