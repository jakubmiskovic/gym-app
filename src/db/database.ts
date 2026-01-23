import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('gym.db');

export type Routine = {
  id: number;
  name: string;
};

export type Exercise = {
  id: number;
  name: string;
  category?: string | null;
  image_url?: string | null;
};

export type Category = {
  id: number;
  name: string;
};

export type WorkoutSession = {
  id: number;
  routine_id: number;
  started_at: string;
  ended_at?: string | null;
  is_active: number;
};

export type WorkoutEntry = {
  id: number;
  session_id: number;
  exercise_id: number;
  position: number;
  is_done: number;
};

export type SetEntry = {
  id: number;
  entry_id: number;
  reps: number;
  weight: number;
  unit: string;
};

export type Reminder = {
  id: number;
  title: string;
  days_of_week: string;
  time: string;
  enabled: number;
  notification_ids: string | null;
};

export const initDatabase = async () => {
  await db.execAsync(
    `CREATE TABLE IF NOT EXISTS Routine (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS Exercise (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT,
      image_url TEXT
    );
    CREATE TABLE IF NOT EXISTS RoutineExercise (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      routine_id INTEGER NOT NULL,
      exercise_id INTEGER NOT NULL,
      position INTEGER NOT NULL,
      FOREIGN KEY (routine_id) REFERENCES Routine(id),
      FOREIGN KEY (exercise_id) REFERENCES Exercise(id)
    );
    CREATE TABLE IF NOT EXISTS WorkoutSession (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      routine_id INTEGER NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (routine_id) REFERENCES Routine(id)
    );
    CREATE TABLE IF NOT EXISTS WorkoutEntry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      exercise_id INTEGER NOT NULL,
      position INTEGER NOT NULL,
      is_done INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (session_id) REFERENCES WorkoutSession(id),
      FOREIGN KEY (exercise_id) REFERENCES Exercise(id)
    );
    CREATE TABLE IF NOT EXISTS SetEntry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_id INTEGER NOT NULL,
      reps INTEGER NOT NULL,
      weight REAL NOT NULL,
      unit TEXT DEFAULT 'kg',
      FOREIGN KEY (entry_id) REFERENCES WorkoutEntry(id)
    );
    CREATE TABLE IF NOT EXISTS Reminder (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      days_of_week TEXT NOT NULL,
      time TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      notification_ids TEXT
    );
    CREATE TABLE IF NOT EXISTS Category (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );`
  );

  // Migration for existing databases
  try {
    await db.execAsync("ALTER TABLE SetEntry ADD COLUMN unit TEXT DEFAULT 'kg';");
  } catch (e) {
    // Column likely exists
  }
  try {
    await db.execAsync("ALTER TABLE Exercise ADD COLUMN image_url TEXT;");
  } catch (e) {
    // Column exists
  }
};

export const seedDatabase = async () => {
  const categoryCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM Category;');
  if ((categoryCount?.count ?? 0) === 0) {
    const defaultCategories = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Abs', 'Cardio'];
    for (const cat of defaultCategories) {
      await db.runAsync('INSERT INTO Category (name) VALUES (?);', [cat]);
    }
  }

  const exercises = [
    { name: 'Bench Press', category: 'Chest' },
    { name: 'Incline Bench Press', category: 'Chest' },
    { name: 'Dumbbell Flys', category: 'Chest' },
    { name: 'Push Ups', category: 'Chest' },
    { name: 'Dips', category: 'Chest' },
    { name: 'Cable Crossover', category: 'Chest' },

    { name: 'Deadlift', category: 'Back' },
    { name: 'Pull Ups', category: 'Back' },
    { name: 'Barbell Row', category: 'Back' },
    { name: 'Lat Pulldown', category: 'Back' },
    { name: 'Seated Row', category: 'Back' },
    { name: 'T-Bar Row', category: 'Back' },

    { name: 'Squat', category: 'Legs' },
    { name: 'Leg Press', category: 'Legs' },
    { name: 'Lunges', category: 'Legs' },
    { name: 'Leg Extension', category: 'Legs' },
    { name: 'Leg Curl', category: 'Legs' },
    { name: 'Calf Raise', category: 'Legs' },
    { name: 'Romanian Deadlift', category: 'Legs' },

    { name: 'Overhead Press', category: 'Shoulders' },
    { name: 'Lateral Raise', category: 'Shoulders' },
    { name: 'Front Raise', category: 'Shoulders' },
    { name: 'Face Pulls', category: 'Shoulders' },
    { name: 'Arnold Press', category: 'Shoulders' },
    { name: 'Shrugs', category: 'Shoulders' },

    { name: 'Barbell Curl', category: 'Arms' },
    { name: 'Dumbbell Curl', category: 'Arms' },
    { name: 'Hammer Curl', category: 'Arms' },
    { name: 'Tricep Pushdown', category: 'Arms' },
    { name: 'Skullcrushers', category: 'Arms' },
    { name: 'Tricep Dips', category: 'Arms' },

    { name: 'Crunches', category: 'Abs' },
    { name: 'Plank', category: 'Abs' },
    { name: 'Leg Raises', category: 'Abs' },
    { name: 'Russian Twist', category: 'Abs' },

    { name: 'Running', category: 'Cardio' },
    { name: 'Cycling', category: 'Cardio' },
    { name: 'Jump Rope', category: 'Cardio' },
  ];

  for (const exercise of exercises) {
    const existing = await db.getFirstAsync<{id: number}>('SELECT id FROM Exercise WHERE name = ?', [exercise.name]);
    if (!existing) {
        await db.runAsync('INSERT INTO Exercise (name, category) VALUES (?, ?);', [
          exercise.name,
          exercise.category ?? null,
        ]);
    }
  }

  const routineCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM Routine;');
  if ((routineCount?.count ?? 0) === 0) {
      await db.runAsync('INSERT INTO Routine (name) VALUES (?);', ['Full Body Starter']);
      const routineRes = await db.getFirstAsync<{ id: number }>('SELECT id FROM Routine WHERE name = ?;', ['Full Body Starter']);
      const routineId = routineRes!.id;
      
      const starterNames = ['Bench Press', 'Squat', 'Deadlift', 'Overhead Press'];
      let pos = 1;
      for (const name of starterNames) {
         const ex = await db.getFirstAsync<{id: number}>('SELECT id FROM Exercise WHERE name = ?', [name]);
         if (ex) {
             await db.runAsync('INSERT INTO RoutineExercise (routine_id, exercise_id, position) VALUES (?, ?, ?)', [routineId, ex.id, pos++]);
         }
      }
  }
};

export const listExercises = async (): Promise<Exercise[]> => {
  return await db.getAllAsync<Exercise>('SELECT * FROM Exercise ORDER BY name ASC;');
};

export const createExercise = async (name: string, category?: string) => {
  await db.runAsync('INSERT INTO Exercise (name, category) VALUES (?, ?);', [
    name,
    category ?? null,
  ]);
};

export const updateExercise = async (id: number, name: string, category?: string) => {
  await db.runAsync('UPDATE Exercise SET name = ?, category = ? WHERE id = ?;', [
    name,
    category ?? null,
    id,
  ]);
};

export const deleteExercise = async (id: number) => {
  await db.runAsync('DELETE FROM Exercise WHERE id = ?;', [id]);
};

export const listRoutines = async (): Promise<Routine[]> => {
  return await db.getAllAsync<Routine>('SELECT * FROM Routine ORDER BY name ASC;');
};

export const getRoutineExercises = async (routineId: number) => {
  const result = await db.getAllAsync<Exercise & { routineExerciseId: number; position: number }>(
    `SELECT RoutineExercise.id as routineExerciseId, Exercise.* , RoutineExercise.position
     FROM RoutineExercise
     JOIN Exercise ON Exercise.id = RoutineExercise.exercise_id
     WHERE RoutineExercise.routine_id = ?
     ORDER BY RoutineExercise.position ASC;`,
    [routineId]
  );
  return result;
};

export const createRoutine = async (name: string, exerciseIds: number[]) => {
  await db.runAsync('INSERT INTO Routine (name) VALUES (?);', [name]);
  const routineResult = await db.getFirstAsync<{ id: number }>('SELECT id FROM Routine WHERE name = ?;', [name]);
  const routineId = routineResult!.id;
  for (let index = 0; index < exerciseIds.length; index += 1) {
    await db.runAsync(
      'INSERT INTO RoutineExercise (routine_id, exercise_id, position) VALUES (?, ?, ?);',
      [routineId, exerciseIds[index], index + 1]
    );
  }
};

export const updateRoutine = async (routineId: number, name: string, exerciseIds: number[]) => {
  await db.runAsync('UPDATE Routine SET name = ? WHERE id = ?;', [name, routineId]);
  await db.runAsync('DELETE FROM RoutineExercise WHERE routine_id = ?;', [routineId]);
  for (let index = 0; index < exerciseIds.length; index += 1) {
    await db.runAsync(
      'INSERT INTO RoutineExercise (routine_id, exercise_id, position) VALUES (?, ?, ?);',
      [routineId, exerciseIds[index], index + 1]
    );
  }
};

export const deleteRoutine = async (routineId: number) => {
  await db.runAsync('DELETE FROM RoutineExercise WHERE routine_id = ?;', [routineId]);
  await db.runAsync('DELETE FROM Routine WHERE id = ?;', [routineId]);
};

export const ensureQuickRoutine = async () => {
  let quick = await db.getFirstAsync<{ id: number }>('SELECT id FROM Routine WHERE name = ?;', ['Quick Workout']);
  if (!quick) {
    await db.runAsync('INSERT INTO Routine (name) VALUES (?);', ['Quick Workout']);
    quick = await db.getFirstAsync<{ id: number }>('SELECT id FROM Routine WHERE name = ?;', ['Quick Workout']);
  }
  return quick!.id;
};

export const startWorkoutSession = async (routineId: number, customStartDate?: string) => {
  await db.runAsync('UPDATE WorkoutSession SET is_active = 0 WHERE is_active = 1;');
  const startedAt = customStartDate || new Date().toISOString();
  await db.runAsync(
    'INSERT INTO WorkoutSession (routine_id, started_at, is_active) VALUES (?, ?, 1);',
    [routineId, startedAt]
  );
  const sessionResult = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM WorkoutSession WHERE routine_id = ? AND started_at = ?;',
    [routineId, startedAt]
  );
  const sessionId = sessionResult!.id;
  const routineExercises = await getRoutineExercises(routineId);
  for (const exercise of routineExercises) {
    await db.runAsync(
      'INSERT INTO WorkoutEntry (session_id, exercise_id, position, is_done) VALUES (?, ?, ?, 0);',
      [sessionId, exercise.id, exercise.position]
    );
  }
  return sessionId;
};

export const addExerciseToSession = async (sessionId: number, exerciseId: number) => {
  // Get max position
  const maxPos = await db.getFirstAsync<{ p: number }>('SELECT MAX(position) as p FROM WorkoutEntry WHERE session_id = ?;', [sessionId]);
  const newPos = (maxPos?.p ?? 0) + 1;
  await db.runAsync(
    'INSERT INTO WorkoutEntry (session_id, exercise_id, position, is_done) VALUES (?, ?, ?, 0);',
    [sessionId, exerciseId, newPos]
  );
};

export const getActiveSession = async () => {
  const session = await db.getFirstAsync<WorkoutSession & { routine_name: string }>(
    `SELECT WorkoutSession.*, Routine.name as routine_name
     FROM WorkoutSession
     JOIN Routine ON Routine.id = WorkoutSession.routine_id
     WHERE WorkoutSession.is_active = 1
     ORDER BY WorkoutSession.started_at DESC
     LIMIT 1;`
  );
  if (!session) {
    return null;
  }
  
  const entries = await db.getAllAsync<WorkoutEntry & { exercise_name: string }>(
    `SELECT WorkoutEntry.*, Exercise.name as exercise_name
     FROM WorkoutEntry
     JOIN Exercise ON Exercise.id = WorkoutEntry.exercise_id
     WHERE WorkoutEntry.session_id = ?
     ORDER BY WorkoutEntry.position ASC;`,
    [session.id]
  );
  return { session, entries };
};

export const listSetsForEntry = async (entryId: number) => {
  return await db.getAllAsync<SetEntry>(
    'SELECT * FROM SetEntry WHERE entry_id = ? ORDER BY id ASC;',
    [entryId]
  );
};

export const addSet = async (entryId: number, reps: number, weight: number, unit: string = 'kg') => {
  await db.runAsync('INSERT INTO SetEntry (entry_id, reps, weight, unit) VALUES (?, ?, ?, ?);', [
    entryId,
    reps,
    weight,
    unit
  ]);
};

export const updateSet = async (setId: number, reps: number, weight: number, unit: string) => {
  await db.runAsync('UPDATE SetEntry SET reps = ?, weight = ?, unit = ? WHERE id = ?;', [
    reps, weight, unit, setId
  ]);
};

export const deleteSet = async (setId: number) => {
  await db.runAsync('DELETE FROM SetEntry WHERE id = ?;', [setId]);
};

export const markEntryDone = async (entryId: number, isDone: boolean) => {
  await db.runAsync('UPDATE WorkoutEntry SET is_done = ? WHERE id = ?;', [
    isDone ? 1 : 0,
    entryId,
  ]);
};

export const finishWorkoutSession = async (sessionId: number, customEndDate?: string) => {
  const endDate = customEndDate || new Date().toISOString();
  // If custom date is provided, we might also want to ensure started_at is consistent if it wasn't already?
  // But for backlogging we usually set started_at/ended_at together.
  await db.runAsync('UPDATE WorkoutSession SET ended_at = ?, is_active = 0 WHERE id = ?;', [
    endDate,
    sessionId,
  ]);
};

export const deleteWorkoutSession = async (sessionId: number) => {
    // Delete sets
    // Delete entries
    // Delete session
    // Since we don't have cascade setup in all tables explicitly or reliable in this lite wrapper?
    // Let's do it manually to be safe.
    await db.execAsync(`
        DELETE FROM SetEntry WHERE entry_id IN (SELECT id FROM WorkoutEntry WHERE session_id = ${sessionId});
        DELETE FROM WorkoutEntry WHERE session_id = ${sessionId};
        DELETE FROM WorkoutSession WHERE id = ${sessionId};
    `);
};

export const updateWorkoutSessionDate = async (sessionId: number, date: string) => {
    // Updates started_at. ended_at is handled by finish.
    await db.runAsync('UPDATE WorkoutSession SET started_at = ? WHERE id = ?;', [date, sessionId]);
};

export const listWorkoutHistory = async () => {
  return await db.getAllAsync<WorkoutSession & { routine_name: string }>(
    `SELECT WorkoutSession.*, Routine.name as routine_name
     FROM WorkoutSession
     JOIN Routine ON Routine.id = WorkoutSession.routine_id
     WHERE WorkoutSession.ended_at IS NOT NULL
     ORDER BY WorkoutSession.started_at DESC;`
  );
};

export const getWorkoutDetail = async (sessionId: number) => {
  const entries = await db.getAllAsync<WorkoutEntry & { exercise_name: string }>(
    `SELECT WorkoutEntry.*, Exercise.name as exercise_name
     FROM WorkoutEntry
     JOIN Exercise ON Exercise.id = WorkoutEntry.exercise_id
     WHERE WorkoutEntry.session_id = ?
     ORDER BY WorkoutEntry.position ASC;`,
    [sessionId]
  );
  const setsByEntry: Record<number, SetEntry[]> = {};
  for (const entry of entries) {
    setsByEntry[entry.id] = await listSetsForEntry(entry.id);
  }
  return { entries, setsByEntry };
};

export const listSetsForExercise = async (exerciseId: number) => {
  return await db.getAllAsync<SetEntry & { started_at: string; routine_name: string }>(
    `SELECT SetEntry.*, WorkoutSession.started_at, Routine.name as routine_name
     FROM SetEntry
     JOIN WorkoutEntry ON WorkoutEntry.id = SetEntry.entry_id
     JOIN WorkoutSession ON WorkoutSession.id = WorkoutEntry.session_id
     JOIN Routine ON Routine.id = WorkoutSession.routine_id
     WHERE WorkoutEntry.exercise_id = ? AND WorkoutSession.ended_at IS NOT NULL
     ORDER BY WorkoutSession.started_at DESC;`,
    [exerciseId]
  );
};

export const listReminders = async (): Promise<Reminder[]> => {
  return await db.getAllAsync<Reminder>('SELECT * FROM Reminder ORDER BY id DESC;');
};

export const createReminder = async (
  title: string,
  daysOfWeek: string,
  time: string,
  enabled: boolean,
  notificationIds?: string
) => {
  await db.runAsync(
    'INSERT INTO Reminder (title, days_of_week, time, enabled, notification_ids) VALUES (?, ?, ?, ?, ?);',
    [title, daysOfWeek, time, enabled ? 1 : 0, notificationIds ?? null]
  );
};

export const updateReminder = async (
  id: number,
  title: string,
  daysOfWeek: string,
  time: string,
  enabled: boolean,
  notificationIds?: string | null
) => {
  await db.runAsync(
    'UPDATE Reminder SET title = ?, days_of_week = ?, time = ?, enabled = ?, notification_ids = ? WHERE id = ?;',
    [title, daysOfWeek, time, enabled ? 1 : 0, notificationIds ?? null, id]
  );
};

export const deleteReminder = async (id: number) => {
  await db.runAsync('DELETE FROM Reminder WHERE id = ?;', [id]);
};

export const listCategories = async (): Promise<Category[]> => {
  return await db.getAllAsync<Category>('SELECT * FROM Category ORDER BY name ASC;');
};

export const createCategory = async (name: string) => {
  await db.runAsync('INSERT INTO Category (name) VALUES (?);', [name]);
};

export const updateCategory = async (id: number, name: string) => {
  await db.runAsync('UPDATE Category SET name = ? WHERE id = ?;', [name, id]);
};

export const deleteCategory = async (id: number) => {
  await db.runAsync('DELETE FROM Category WHERE id = ?;', [id]);
};

export const getWorkoutActivity = async (days: number = 7) => {
  // Get counts of finished sessions per day for the last N days
  // Just use JS to process the dates for simplicity in SQLite 
  const result = await db.getAllAsync<{ date: string; count: number }>(
    `SELECT date(started_at) as date, COUNT(*) as count 
     FROM WorkoutSession 
     WHERE ended_at IS NOT NULL 
     AND started_at >= date('now', '-' || ? || ' days')
     GROUP BY date(started_at)
     ORDER BY date ASC;`,
    [days]
  );
  return result;
};

export const getWorkoutActivityForMonth = async (year: number, month: number) => {
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const result = await db.getAllAsync<{ date: string; count: number }>(
    `SELECT date(started_at) as date, COUNT(*) as count 
     FROM WorkoutSession 
     WHERE ended_at IS NOT NULL 
     AND strftime('%Y-%m', started_at) = ?
     GROUP BY date(started_at)
     ORDER BY date ASC;`,
    [monthStr]
  );
  return result;
};

export const getVolumeStats = async () => {
  const result = await db.getAllAsync<{ month: string; volume: number }>(
    `SELECT strftime('%Y-%m', WorkoutSession.started_at) as month, SUM(SetEntry.weight * SetEntry.reps) as volume
     FROM SetEntry
     JOIN WorkoutEntry ON WorkoutEntry.id = SetEntry.entry_id
     JOIN WorkoutSession ON WorkoutSession.id = WorkoutEntry.session_id
     WHERE WorkoutSession.ended_at IS NOT NULL
     GROUP BY month
     ORDER BY month DESC
     LIMIT 6;`
  );
  return result.reverse();
};

export const getWeeklyWorkoutCount = async (): Promise<number> => {
  // SQLite %W: week of year (00-53) starting Monday
  const result = await db.getAllAsync<{ count: number }>(
      `SELECT COUNT(*) as count 
       FROM WorkoutSession 
       WHERE ended_at IS NOT NULL 
       AND strftime('%Y-%W', started_at) = strftime('%Y-%W', 'now')`
  );
  return result[0]?.count || 0;
};

export const getLastCompletedRoutine = async () => {
  const result = await db.getAllAsync<Routine>(
      `SELECT r.id, r.name 
       FROM WorkoutSession s
       JOIN Routine r ON s.routine_id = r.id
       WHERE s.ended_at IS NOT NULL
       ORDER BY s.ended_at DESC
       LIMIT 1`
  );
  return result[0] || null;
};

export const getCurrentStreak = async (): Promise<number> => {
  // Get all unique weeks where a workout occurred
  const weeks = await db.getAllAsync<{ week: string }>(
      `SELECT DISTINCT strftime('%Y-%W', started_at) as week
       FROM WorkoutSession
       WHERE ended_at IS NOT NULL
       ORDER BY week DESC`
  );
  
  if (weeks.length === 0) return 0;

  const weekList = weeks.map(w => w.week);
  
  // Calculate current week string in JS to match SQLite's 'now' if possible, 
  // but safer to use the DB's definition of 'now'
  const timeRes = await db.getAllAsync<{ now: string; last_week: string }>(
      `SELECT strftime('%Y-%W', 'now') as now, strftime('%Y-%W', 'now', '-7 days') as last_week`
  );
  const currentWeek = timeRes[0].now;
  const lastWeek = timeRes[0].last_week;

  let streak = 0;
  let hasCurrentWeek = weekList.includes(currentWeek);
  
  // If we worked out this week, start counting from this week.
  // If not, but we worked out last week, start counting from last week.
  let checkWeek = hasCurrentWeek ? currentWeek : (weekList.includes(lastWeek) ? lastWeek : null);
  
  if (!checkWeek) return 0; // No workout this week or last week = 0 streak

  // We need to iterate backwards. Since we don't have a Week-Math library, 
  // and strftime is consistent, we can just check existence in the sorted list.
  // But the list might have gaps.
  // Actually, computing "previous week string" without a library is annoying (year boundary).
  // EASIER: Just count how many consecutive weeks exist in our 'weeks' array 
  // relative to the 'checkWeek' anchor.
  
  // HOWEVER, the 'weeks' array from SQL is sparse. 
  // We need to check continuity.
  // Let's rely on JS Date math for the "previous week" logic.
  
  let d = new Date();
  if (!hasCurrentWeek) {
      d.setDate(d.getDate() - 7); // Go back to last week
  }
  
  // Normalize d to Monday (?) to match SQlite %W? 
  // Too risky to mix JS Date logic with SQLite %W logic.
  // ALTERNATIVE: Use SQLite recursive query to count!
  // But Expo SQLite might not like heavy recursion.
  
  // Let's stick to the sorted list approach with a simple heuristic:
  // We have a list of strings "2024-05", "2024-04", etc.
  // This format sorts correctly.
  // But we need to know if "2024-05" is exactly 1 week before "2024-06".
  // Using SQL to check gap is easier:
  // SELECT ... (julianday(week_start) - julianday(prev_week_start))
  
  // REVISED SIMPLE APPROACH:
  // Count consecutive weeks in full SQL using lag?
  // Or just accept that this simple app might not need perfect year-boundary handling for now.
  // Let's use a robust SQL Recursive CTE:
  /*
  WITH RECURSIVE week_dates(week_start) AS (
    SELECT date(started_at, 'weekday 0', '-6 days') FROM WorkoutSession WHERE ended_at IS NOT NULL
  )
  ...
  */
  
  // Let's do the JS loop with "Date" objects, assuming we query date(started_at).
  const dates = await db.getAllAsync<{ d: string }>(
    `SELECT DISTINCT date(started_at) as d FROM WorkoutSession WHERE ended_at IS NOT NULL ORDER BY d DESC`
  );
  
  // Helper to get Monday-of-week for a date
  const getMonday = (dateStr: string) => {
      const d = new Date(dateStr);
      const day = d.getDay(); 
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
      const m = new Date(d.setDate(diff));
      m.setHours(0,0,0,0);
      return m.getTime();
  };
  
  const visitedWeeks = new Set<number>();
  dates.forEach(row => visitedWeeks.add(getMonday(row.d)));
  
  const now = new Date();
  let currentMonday = getMonday(now.toISOString().split('T')[0]);
  
  let s = 0;
  // Check current week
  if (visitedWeeks.has(currentMonday)) {
      s++;
      currentMonday -= 7 * 24 * 60 * 60 * 1000; // Go back 1 week
  } else {
      // Check last week
      const lastMonday = currentMonday - 7 * 24 * 60 * 60 * 1000;
      if (visitedWeeks.has(lastMonday)) {
          s++;
          currentMonday = lastMonday - 7 * 24 * 60 * 60 * 1000;
      } else {
          return 0;
      }
  }
  
  // Count backwards
  while (visitedWeeks.has(currentMonday)) {
      s++;
      currentMonday -= 7 * 24 * 60 * 60 * 1000;
  }
  
  return s;
};

export const getRecentPRs = async () => {
    // Global History Scan: Efficiently find the latest 3 PRs across all time
    // 1. Get max weight for every exercise in every completed session, ordered chronologically
    const history = await db.getAllAsync<{ 
      started_at: string; 
      exercise_id: number; 
      exercise_name: string; 
      weight: number 
    }>(
      `SELECT 
        WorkoutSession.started_at, 
        WorkoutEntry.exercise_id, 
        Exercise.name as exercise_name, 
        MAX(SetEntry.weight) as weight 
      FROM SetEntry 
      JOIN WorkoutEntry ON SetEntry.entry_id = WorkoutEntry.id 
      JOIN WorkoutSession ON WorkoutEntry.session_id = WorkoutSession.id 
      JOIN Exercise ON WorkoutEntry.exercise_id = Exercise.id
      WHERE WorkoutSession.ended_at IS NOT NULL 
      GROUP BY WorkoutSession.id, WorkoutEntry.exercise_id 
      ORDER BY WorkoutSession.started_at ASC;`
    );

    const maxMap: Record<number, number> = {};
    const allPRs: { exercise: string; weight: number; oldMax: number; date: string }[] = [];

    // 2. Replay history to find when records were broken
    for (const row of history) {
      const currentMax = maxMap[row.exercise_id] || 0;
      if (row.weight > currentMax) {
         allPRs.push({
           exercise: row.exercise_name,
           weight: row.weight,
           oldMax: currentMax,
           date: row.started_at
         });
         maxMap[row.exercise_id] = row.weight;
      }
    }

    // 3. Return the absolute latest 3 PRs
    return allPRs.reverse().slice(0, 3);
};

export const getMuscleSplit = async () => {
  // Count sets per category in the last 30 days
  const result = await db.getAllAsync<{ category: string; count: number }>(
    `SELECT Exercise.category, COUNT(*) as count
     FROM SetEntry
     JOIN WorkoutEntry ON SetEntry.entry_id = WorkoutEntry.id
     JOIN WorkoutSession ON WorkoutEntry.session_id = WorkoutSession.id
     JOIN Exercise ON WorkoutEntry.exercise_id = Exercise.id
     WHERE WorkoutSession.ended_at IS NOT NULL
     AND WorkoutSession.started_at >= date('now', '-30 days')
     GROUP BY Exercise.category
     ORDER BY count DESC
     LIMIT 5;`
  );
  
  const total = result.reduce((acc, r) => acc + r.count, 0);
  
  return result.map(r => ({
      name: r.category || 'Other',
      count: r.count,
      percentage: total > 0 ? (r.count / total) * 100 : 0
  }));
};

// --- IMPORT HELPERS ---

export type ImportWorkoutData = {
  routineName: string;
  startDate: string; // ISO String
  endDate?: string; // ISO String
  exercises: {
    name: string;
    sets: {
      reps: number;
      weight: number;
      unit?: string;
    }[];
  }[];
};

export const importWorkouts = async (data: ImportWorkoutData[]) => {
  for (const w of data) {
    // 1. Resolve Routine
    let routineId: number;
    const existingRoutine = await db.getFirstAsync<{id: number}>('SELECT id FROM Routine WHERE name = ?', [w.routineName || 'Imported Workout']);
    if (existingRoutine) {
      routineId = existingRoutine.id;
    } else {
      const res = await db.runAsync('INSERT INTO Routine (name) VALUES (?)', [w.routineName || 'Imported Workout']);
      routineId = res.lastInsertRowId;
    }

    // 2. Create Session
    const end = w.endDate || new Date(new Date(w.startDate).getTime() + 60*60*1000).toISOString();
    const sessionRes = await db.runAsync(
      'INSERT INTO WorkoutSession (routine_id, started_at, ended_at, is_active) VALUES (?, ?, ?, 0)',
      [routineId, w.startDate, end]
    );
    const sessionId = sessionRes.lastInsertRowId;

    // 3. Exercises
    let position = 0;
    for (const ex of w.exercises) {
       // Resolve Exercise
       let exerciseId: number;
       const existingEx = await db.getFirstAsync<{id: number}>('SELECT id FROM Exercise WHERE name = ?', [ex.name]);
       if (existingEx) {
         exerciseId = existingEx.id;
       } else {
         const res = await db.runAsync('INSERT INTO Exercise (name, category) VALUES (?, ?)', [ex.name, 'Uncategorized']);
         exerciseId = res.lastInsertRowId;
       }

       // Create Entry
       const entryRes = await db.runAsync(
         'INSERT INTO WorkoutEntry (session_id, exercise_id, position, is_done) VALUES (?, ?, ?, 1)',
         [sessionId, exerciseId, position++]
       );
       const entryId = entryRes.lastInsertRowId;

       // 4. Sets
       for (const s of ex.sets) {
          await db.runAsync(
            'INSERT INTO SetEntry (entry_id, reps, weight, unit) VALUES (?, ?, ?, ?)',
            [entryId, s.reps, s.weight, s.unit || 'kg']
          );
       }
    }
  }
};

export const getLifetimeVolume = async () => {
  const res = await db.getAllAsync<{ volume: number }>(
      `SELECT SUM(weight * reps) as volume FROM SetEntry`
  );
  return res[0]?.volume || 0;
};

export default db;
