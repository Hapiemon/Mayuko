import { neon } from '@neondatabase/serverless';

export function getSql() {
	const databaseUrl =
		process.env.DATABASE_URL ||
		process.env.mayuko_DATABASE_URL ||
		process.env.POSTGRES_URL;
	if (!databaseUrl) {
		throw new Error('DATABASE_URL is not set (or fallback variables are missing)');
	}
	return neon(databaseUrl);
}
