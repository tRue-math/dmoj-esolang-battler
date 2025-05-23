import {type Accessor, createMemo, type Component} from 'solid-js';
import {Territory} from '~/lib/firebase';
import {useFirestore} from 'solid-firebase';
import type {Cell} from '~/lib/schema';

import styles from './index.module.css';
import {useSearchParams} from '@solidjs/router';

const languages: string[] = [
	'Rust',
	'プロデル',
	'Mines',
	'OCaml',
	'Ruby',
	'Starry',
	'Brainfuck',
	'ferNANDo',
	'C',
	'><>',
	'05AB1E',
	'Aheui',
	'Python',
];

const teamNames = ['Red', 'Blue'];

const Index: Component = () => {
	const territory = useFirestore(Territory);
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

	const _dates = createMemo<{from: number; to: number}>(() => {
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
		const cells: Cell[] = languages.map(
			(language) =>
				territory.data?.find((cell) => cell.language === language) ?? {
					language: 'BROKEN',
					languageId: 'BROKEN',
					adjacent: [],
					owner: null,
					score: null,
					submissionId: null,
				},
		);

		const emptyCell = {
			languageId: '',
			adjacent: [],
			owner: null,
			score: null,
			submissionId: null,
		};
		const redCell = {
			...emptyCell,
			language: 'RED',
		};
		const blueCell = {
			...emptyCell,
			language: 'BLUE',
		};

		cells.unshift(redCell);
		cells.splice(6, 0, blueCell, redCell);
		cells.splice(9, 0, blueCell);
		cells.splice(11, 0, redCell);
		cells.splice(13, 0, blueCell, redCell);
		cells.push(blueCell);
		//デバッグ用
		// const debugBlue = {
		// 	...emptyCell,
		// 	language: 'DEBUG',
		// 	owner: 'Blue',
		// 	score: 10,
		// };
		// const debugRed = {
		// 	...emptyCell,
		// 	language: 'DEBUG',
		// 	owner: 'Red',
		// 	score: 10,
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

		const owners = new Map<string, number>();

		for (const cell of cells) {
			if (cell.owner === null) {
				continue;
			}
			owners.set(cell.owner, 1 + (owners.get(cell.owner) || 0));
		}

		return [owners.get('Red') || 0, owners.get('Blue') || 0];
	});

	return (
		<div class={styles.container}>
			<h1 class={styles.title}>TSG LIVE! 14: Codegolf</h1>
			<div class={styles.bingoCard}>
				<div class={styles.golfGrid}>
					{(golfCells() ?? []).map((cell) =>
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
									[styles[
										`user-${cell.owner ? (cell.owner === 'Red' ? 0 : 1) : ''}`
									]]: true,
								}}
								target="_blank"
								rel="noopener noreferrer"
								href={
									cell.submissionId === null
										? undefined
										: `http://${import.meta.env.VITE_API_HOST}/submission/${cell.submissionId}`
								}
							>
								<div class={styles.languageName}>
									{cell.language === 'Brainfuck' ? 'Brainf*ck' : cell.language}
								</div>
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
