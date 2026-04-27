const db = require('./database');

const names = ['Marcos', 'Julia', 'Pedro', 'Ana', 'Carlos', 'Beatriz', 'Lucas', 'Fernanda', 'Ricardo', 'Camila', 'Gabriel', 'Larissa'];
const models = ['KG Academy', 'Before KG'];
const lessonTypes = ['Private', 'Open'];
const paymentMethods = ['App', 'Cash', 'Card', 'Bank Transfer', 'Playtomic', 'Voucher'];
const playersCounts = ['1-1', '1-2', '1-3', '1-4'];
const coachValues = [25, 30, 35, 40, 45];
const durations = [1, 1.5, 2];
const peakTypes = ['Peak', 'Off Peak'];

function getRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

const startDate = new Date('2025-11-01');
const endDate = new Date('2026-04-20');

db.serialize(() => {
    const stmt = db.prepare(`INSERT INTO lessons (
        user_id, date, coach_value, duration, client_name, model, peak_type, start_time, 
        lesson_type, payment_method, payment_status, players_count, general_note, 
        exception, session_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    for (let i = 0; i < 100; i++) {
        const dateObj = getRandomDate(startDate, endDate);
        const dateStr = dateObj.toISOString().split('T')[0];
        
        const hour = Math.floor(Math.random() * (21 - 8 + 1)) + 8;
        const minutes = Math.random() < 0.5 ? '00' : '30';
        const startTime = `${hour.toString().padStart(2, '0')}:${minutes}`;
        
        const coachValue = getRandom(coachValues);
        const duration = getRandom(durations);
        const client_name = getRandom(names);
        const model = getRandom(models);
        const peakType = getRandom(peakTypes);
        const lessonType = getRandom(lessonTypes);
        const paymentMethod = getRandom(paymentMethods);
        const paymentStatus = Math.random() < 0.8 ? 'Paid' : 'Waiting';
        const playersCount = getRandom(playersCounts);
        const sessionStatus = dateObj < new Date() ? 'Completed' : 'Planned';

        stmt.run(
            1, // user_id
            dateStr,
            coachValue,
            duration,
            client_name,
            model,
            peakType,
            startTime,
            lessonType,
            paymentMethod,
            paymentStatus,
            playersCount,
            '', // general_note
            'Normal', // exception
            sessionStatus
        );
    }

    stmt.finalize((err) => {
        if (err) {
            console.error('Error inserting records:', err.message);
        } else {
            console.log('Successfully inserted 100 random records.');
        }
        db.close();
    });
});
