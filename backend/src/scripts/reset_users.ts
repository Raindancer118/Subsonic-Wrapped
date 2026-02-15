
import db from '../database';

console.log('Resetting Users and Servers...');

try {
    const deleteServers = db.prepare('DELETE FROM subsonic_servers').run();
    console.log(`Deleted ${deleteServers.changes} subsonic servers.`);

    const deleteHistory = db.prepare('DELETE FROM play_history').run();
    console.log(`Deleted ${deleteHistory.changes} play history entries.`);

    const deleteUsers = db.prepare('DELETE FROM users').run();
    console.log(`Deleted ${deleteUsers.changes} users.`);

    console.log('Database user data reset successfully.');
} catch (e) {
    console.error('Failed to reset:', e);
}
