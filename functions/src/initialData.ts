export const territoryData = [
	{
		language: 'Red',
		languageId: 'RED',
		adjacent: [
			'Rust',
			'Starry',
			'C',
			'OCaml',
			'Brainfuck',
			'Aheui',
			'ferNANDo',
		],
	},
	{
		language: 'Blue',
		languageId: 'BLUE',
		adjacent: [
			'プロデル',
			'Starry',
			'><>',
			'Brainfuck',
			'Ruby',
			'ferNANDo',
			'Python',
		],
	},
	{
		language: 'Rust',
		languageId: 'RUST',
		adjacent: ['Starry', 'プロデル', 'Red'],
	},
	{
		language: 'プロデル',
		languageId: 'PRDR',
		adjacent: ['Rust', 'Mines', 'Blue'],
	},
	{
		language: 'Mines',
		languageId: 'MINES',
		adjacent: ['プロデル', 'OCaml', 'Brainfuck'],
	},
	{
		language: 'OCaml',
		languageId: 'OCAML',
		adjacent: ['Mines', 'Ruby', 'Red'],
	},
	{
		language: 'Ruby',
		languageId: 'RUBY',
		adjacent: ['OCaml', 'ferNANDo', 'Blue'],
	},
	{
		language: 'Starry',
		languageId: 'STARRY',
		adjacent: ['Rust', 'C', 'Red', 'Blue'],
	},
	{
		language: 'Brainfuck',
		languageId: 'BFPY',
		adjacent: ['Mines', '05AB1E', 'Red', 'Blue'],
	},
	{
		language: 'ferNANDo',
		languageId: 'FNAND',
		adjacent: ['Ruby', 'Python', 'Red', 'Blue'],
	},
	{
		language: 'C',
		languageId: 'C11',
		adjacent: ['Starry', '><>', 'Red'],
	},
	{
		language: '><>',
		languageId: 'FISH',
		adjacent: ['C', '05AB1E', 'Blue'],
	},
	{
		language: '05AB1E',
		languageId: 'OSABIE',
		adjacent: ['><>', 'Brainfuck', 'Aheui'],
	},
	{
		language: 'Aheui',
		languageId: 'AHEUI',
		adjacent: ['05AB1E', 'Python', 'Red'],
	},
	{
		language: 'Python',
		languageId: 'PYPY3',
		adjacent: ['ferNANDo', 'Aheui', 'Blue'],
	},
] as const;

export const teamData = [
	{
		team: 'Red',
		players: ['alcea'],
	},
	{
		team: 'Blue',
		players: ['tRue'],
	},
] as const;
