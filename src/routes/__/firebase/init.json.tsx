export async function GET() {
	if (!import.meta.env.DEV) {
		return new Response(null, {status: 404});
	}

	const res = await fetch(
		'https://dmoj-esolang-battle.web.app/__/firebase/init.json',
	);
	const data = await res.json();
	return data;
}
