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
		adjacent: ['Starry', 'プロデル'],
	},
	{
		language: 'プロデル',
		languageId: 'PRDR',
		adjacent: ['Rust', 'Mines'],
	},
	{
		language: 'Mines',
		languageId: 'MINES',
		adjacent: ['プロデル', 'OCaml', 'Brainfuck'],
	},
	{
		language: 'OCaml',
		languageId: 'OCAML',
		adjacent: ['Mines', 'Ruby'],
	},
	{
		language: 'Ruby',
		languageId: 'RUBY',
		adjacent: ['OCaml', 'ferNANDo'],
	},
	{
		language: 'Starry',
		languageId: 'STARRY',
		adjacent: ['Rust', 'C'],
	},
	{
		language: 'Brainfuck',
		languageId: 'BFPY',
		adjacent: ['Mines', '05AB1E'],
	},
	{
		language: 'ferNANDo',
		languageId: 'FNAND',
		adjacent: ['Ruby', 'Python'],
	},
	{
		language: 'C',
		languageId: 'C11',
		adjacent: ['Starry', '><>'],
	},
	{
		language: '><>',
		languageId: 'FISH',
		adjacent: ['C', '05AB1E'],
	},
	{
		language: '05AB1E',
		languageId: 'OSABIE',
		adjacent: ['><>', 'Brainfuck', 'Aheui'],
	},
	{
		language: 'Aheui',
		languageId: 'AHEUI',
		adjacent: ['05AB1E', 'Python'],
	},
	{
		language: 'Python',
		languageId: 'PYPY3',
		adjacent: ['ferNANDo', 'Aheui'],
	},
] as const;
