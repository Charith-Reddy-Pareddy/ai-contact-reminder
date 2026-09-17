import pg from "pg";

const { Pool } = pg;

let pool = null;
let schemaReady = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes("localhost")
        ? false
        : { rejectUnauthorized: false }
    });
  }
  return pool;
}

async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = getPool().query(`
      CREATE TABLE IF NOT EXISTS contacts (
        seq SERIAL PRIMARY KEY,
        id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        company TEXT NOT NULL,
        last_contacted_date TEXT NOT NULL,
        notes TEXT NOT NULL DEFAULT ''
      )
    `);
  }
  await schemaReady;
}

export async function readContacts() {
  await ensureSchema();

  const { rows } = await getPool().query(
    `SELECT id, name, email, company, last_contacted_date AS "lastContactedDate", notes
     FROM contacts
     ORDER BY seq ASC`
  );

  return rows;
}

export async function writeContacts(contacts) {
  await ensureSchema();
  const client = await getPool().connect();

  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM contacts");

    for (const contact of contacts) {
      await client.query(
        `INSERT INTO contacts (id, name, email, company, last_contacted_date, notes)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          contact.id,
          contact.name,
          contact.email,
          contact.company,
          contact.lastContactedDate,
          contact.notes ?? ""
        ]
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
