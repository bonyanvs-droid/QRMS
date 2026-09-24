import { executeQuery } from './server/db/query';

async function main() {
  try {
    const result = await executeQuery('SELECT COUNT(*) as count FROM users');
    console.log('DB Connection OK. Users count result:', result);
  } catch (error) {
    console.error('Failed to query:', error);
  }
}

main();
