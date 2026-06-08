var pg = require('pg');

var pool = new pg.Pool({
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432', 10),
  user: process.env.PGUSER || 'mkjs',
  password: process.env.PGPASSWORD || 'mkjs',
  database: process.env.PGDATABASE || 'mkjs'
});

async function saveMatch(gameName, player1Id, player2Id, winner) {
  await pool.query(
    'INSERT INTO matches (game_name, player1_id, player2_id, winner) VALUES ($1, $2, $3, $4)',
    [gameName, player1Id, player2Id, winner]
  );
}

async function getMatches() {
  var result = await pool.query('SELECT * FROM matches ORDER BY created_at DESC');
  return result.rows;
}

module.exports = { saveMatch, getMatches, pool };
