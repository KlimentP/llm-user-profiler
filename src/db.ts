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
  connectionString: string
): Promise<TableInfo[]> {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();

    // Get all tables
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const tables: TableInfo[] = [];

    // For each table, get column information
    for (const row of tablesResult.rows) {
      const tableName = row.table_name;
      
      const columnsResult = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = $1
        ORDER BY ordinal_position;
      `, [tableName]);

      tables.push({
        tableName,
        columns: columnsResult.rows.map((col: any) => ({
          columnName: col.column_name,
          dataType: col.data_type,
          isNullable: col.is_nullable,
        })),
      });
    }

    return tables;
  } finally {
    await client.end();
  }
}

export async function executeQuery(
  connectionString: string,
  query: string
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    const result = await client.query(query);
    return result.rows;
  } finally {
    await client.end();
  }
}
