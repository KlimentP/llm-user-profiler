import pg from "pg";

const { Client } = pg;

export interface TableInfo {
	tableName: string;
	columns: Array<{
		columnName: string;
		dataType: string;
		isNullable: string;
	}>;
}

export async function introspectDatabase(
	connectionString: string,
): Promise<TableInfo[]> {
	const client = new Client({ connectionString });

	try {
		await client.connect();

		const columnsResult = await client.query<{
			table_name: string;
			column_name: string;
			data_type: string;
			is_nullable: string;
		}>(`
      SELECT
        c.table_name,
        c.column_name,
        c.data_type,
        c.is_nullable
      FROM information_schema.columns c
      INNER JOIN information_schema.tables t
        ON t.table_schema = c.table_schema
        AND t.table_name = c.table_name
      WHERE c.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
      ORDER BY c.table_name, c.ordinal_position;
    `);

		const tablesMap = new Map<string, TableInfo>();
		for (const row of columnsResult.rows) {
			const existing = tablesMap.get(row.table_name);
			if (existing) {
				existing.columns.push({
					columnName: row.column_name,
					dataType: row.data_type,
					isNullable: row.is_nullable,
				});
				continue;
			}

			tablesMap.set(row.table_name, {
				tableName: row.table_name,
				columns: [
					{
						columnName: row.column_name,
						dataType: row.data_type,
						isNullable: row.is_nullable,
					},
				],
			});
		}

		return Array.from(tablesMap.values());
	} finally {
		await client.end();
	}
}

export async function executeQuery(
	connectionString: string,
	query: string,
): Promise<Record<string, unknown>[]> {
	const client = new Client({ connectionString });

	try {
		await client.connect();
		await client.query("BEGIN");
		await client.query("SET TRANSACTION READ ONLY");
		const result = await client.query(query);
		await client.query("COMMIT");
		return result.rows as Record<string, unknown>[];
	} catch (error) {
		try {
			await client.query("ROLLBACK");
		} catch {
			// Ignore rollback failures; surface the original query error.
		}
		throw error;
	} finally {
		await client.end();
	}
}
