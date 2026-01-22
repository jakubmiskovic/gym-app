import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabase('gym.db');

export type Routine = {
  id: number;
  name: string;
};

export type Exercise = {
  id: number;
  name: string;
  category?: string | null;
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
};

export type Reminder = {
  id: number;
  title: string;
  days_of_week: string;
  time: string;
  enabled: number;
  notification_ids: string | null;
};

export const executeSql = (sql: string, params: (string | number | null)[] = []) =>
  new Promise<SQLite.SQLResultSet>((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        sql,
        params,
        (_, result) => resolve(result),
        (_, error) => {
          reject(error);
          return false;
        }
      );
    });
  });

export const initDatabase = async () => {
  await executeSql(
    `CREATE TABLE IF NOT EXISTS Routine (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    );`
  );
  await executeSql(
    `CREATE TABLE IF NOT EXISTS Exercise (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT
    );`
  );
  await executeSql(
    `CREATE TABLE IF NOT EXISTS RoutineExercise (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      routine_id INTEGER NOT NULL,
      exercise_id INTEGER NOT NULL,
      position INTEGER NOT NULL,
      FOREIGN KEY (routine_id) REFERENCES Routine(id),
      FOREIGN KEY (exercise_id) REFERENCES Exercise(id)
    );`
  );
  await executeSql(
    `CREATE TABLE IF NOT EXISTS WorkoutSession (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      routine_id INTEGER NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (routine_id) REFERENCES Routine(id)
    );`
  );
  await executeSql(
    `CREATE TABLE IF NOT EXISTS WorkoutEntry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      exercise_id INTEGER NOT NULL,
      position INTEGER NOT NULL,
      is_done INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (session_id) REFERENCES WorkoutSession(id),
      FOREIGN KEY (exercise_id) REFERENCES Exercise(id)
    );`
  );
  await executeSql(
    `CREATE TABLE IF NOT EXISTS SetEntry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_id INTEGER NOT NULL,
      reps INTEGER NOT NULL,
      weight REAL NOT NULL,
      FOREIGN KEY (entry_id) REFERENCES WorkoutEntry(id)
    );`
  );
  await executeSql(
    `CREATE TABLE IF NOT EXISTS Reminder (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      days_of_week TEXT NOT NULL,
      time TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      notification_ids TEXT
    );`
  );
};

export const seedDatabase = async () => {
  const exerciseCount = await executeSql('SELECT COUNT(*) as count FROM Exercise;');
  const count = (exerciseCount.rows.item(0) as { count: number }).count;
  if (count > 0) {
    return;
  }

  const exercises = [
    { name: 'Bench Press', category: 'Chest' },
    { name: 'Squat', category: 'Legs' },
    { name: 'Deadlift', category: 'Back' },
    { name: 'Overhead Press', category: 'Shoulders' },
  ];

  for (const exercise of exercises) {
    await executeSql('INSERT INTO Exercise (name, category) VALUES (?, ?);', [
      exercise.name,
      exercise.category,
    ]);
  }

  await executeSql('INSERT INTO Routine (name) VALUES (?);', ['Full Body Starter']);
  const routineResult = await executeSql('SELECT id FROM Routine WHERE name = ?;', [
    'Full Body Starter',
  ]);
  const routineId = (routineResult.rows.item(0) as { id: number }).id;
  const exerciseRows = await executeSql('SELECT id FROM Exercise ORDER BY id ASC;');

  for (let index = 0; index < exerciseRows.rows.length; index += 1) {
    const exercise = exerciseRows.rows.item(index) as Exercise;
    await executeSql(
      'INSERT INTO RoutineExercise (routine_id, exercise_id, position) VALUES (?, ?, ?);',
      [routineId, exercise.id, index + 1]
    );
  }
};

export const listExercises = async (): Promise<Exercise[]> => {
  const result = await executeSql('SELECT * FROM Exercise ORDER BY name ASC;');
  return result.rows._array as Exercise[];
};

export const createExercise = async (name: string, category?: string) => {
  await executeSql('INSERT INTO Exercise (name, category) VALUES (?, ?);', [
    name,
    category ?? null,
  ]);
};

export const updateExercise = async (id: number, name: string, category?: string) => {
  await executeSql('UPDATE Exercise SET name = ?, category = ? WHERE id = ?;', [
    name,
    category ?? null,
    id,
  ]);
};

export const deleteExercise = async (id: number) => {
  await executeSql('DELETE FROM Exercise WHERE id = ?;', [id]);
};

export const listRoutines = async (): Promise<Routine[]> => {
  const result = await executeSql('SELECT * FROM Routine ORDER BY name ASC;');
  return result.rows._array as Routine[];
};

export const getRoutineExercises = async (routineId: number) => {
  const result = await executeSql(
    `SELECT RoutineExercise.id as routineExerciseId, Exercise.* , RoutineExercise.position
     FROM RoutineExercise
     JOIN Exercise ON Exercise.id = RoutineExercise.exercise_id
     WHERE RoutineExercise.routine_id = ?
     ORDER BY RoutineExercise.position ASC;`,
    [routineId]
  );
  return result.rows._array as (Exercise & { routineExerciseId: number; position: number })[];
};

export const createRoutine = async (name: string, exerciseIds: number[]) => {
  await executeSql('INSERT INTO Routine (name) VALUES (?);', [name]);
  const routineResult = await executeSql('SELECT id FROM Routine WHERE name = ?;', [name]);
  const routineId = (routineResult.rows.item(0) as { id: number }).id;
  for (let index = 0; index < exerciseIds.length; index += 1) {
    await executeSql(
      'INSERT INTO RoutineExercise (routine_id, exercise_id, position) VALUES (?, ?, ?);',
      [routineId, exerciseIds[index], index + 1]
    );
  }
};

export const updateRoutine = async (routineId: number, name: string, exerciseIds: number[]) => {
  await executeSql('UPDATE Routine SET name = ? WHERE id = ?;', [name, routineId]);
  await executeSql('DELETE FROM RoutineExercise WHERE routine_id = ?;', [routineId]);
  for (let index = 0; index < exerciseIds.length; index += 1) {
    await executeSql(
      'INSERT INTO RoutineExercise (routine_id, exercise_id, position) VALUES (?, ?, ?);',
      [routineId, exerciseIds[index], index + 1]
    );
  }
};

export const deleteRoutine = async (routineId: number) => {
  await executeSql('DELETE FROM RoutineExercise WHERE routine_id = ?;', [routineId]);
  await executeSql('DELETE FROM Routine WHERE id = ?;', [routineId]);
};

export const startWorkoutSession = async (routineId: number) => {
  await executeSql('UPDATE WorkoutSession SET is_active = 0 WHERE is_active = 1;');
  const startedAt = new Date().toISOString();
  await executeSql(
    'INSERT INTO WorkoutSession (routine_id, started_at, is_active) VALUES (?, ?, 1);',
    [routineId, startedAt]
  );
  const sessionResult = await executeSql(
    'SELECT id FROM WorkoutSession WHERE routine_id = ? AND started_at = ?;',
    [routineId, startedAt]
  );
  const sessionId = (sessionResult.rows.item(0) as { id: number }).id;
  const routineExercises = await getRoutineExercises(routineId);
  for (const exercise of routineExercises) {
    await executeSql(
      'INSERT INTO WorkoutEntry (session_id, exercise_id, position, is_done) VALUES (?, ?, ?, 0);',
      [sessionId, exercise.id, exercise.position]
    );
  }
  return sessionId;
};

export const getActiveSession = async () => {
  const sessionResult = await executeSql(
    `SELECT WorkoutSession.*, Routine.name as routine_name
     FROM WorkoutSession
     JOIN Routine ON Routine.id = WorkoutSession.routine_id
     WHERE WorkoutSession.is_active = 1
     ORDER BY WorkoutSession.started_at DESC
     LIMIT 1;`
  );
  if (sessionResult.rows.length === 0) {
    return null;
  }
  const session = sessionResult.rows.item(0) as WorkoutSession & { routine_name: string };
  const entriesResult = await executeSql(
    `SELECT WorkoutEntry.*, Exercise.name as exercise_name
     FROM WorkoutEntry
     JOIN Exercise ON Exercise.id = WorkoutEntry.exercise_id
     WHERE WorkoutEntry.session_id = ?
     ORDER BY WorkoutEntry.position ASC;`,
    [session.id]
  );
  const entries = entriesResult.rows._array as (WorkoutEntry & { exercise_name: string })[];
  return { session, entries };
};

export const listSetsForEntry = async (entryId: number) => {
  const result = await executeSql(
    'SELECT * FROM SetEntry WHERE entry_id = ? ORDER BY id ASC;',
    [entryId]
  );
  return result.rows._array as SetEntry[];
};

export const addSet = async (entryId: number, reps: number, weight: number) => {
  await executeSql('INSERT INTO SetEntry (entry_id, reps, weight) VALUES (?, ?, ?);', [
    entryId,
    reps,
    weight,
  ]);
};

export const markEntryDone = async (entryId: number, isDone: boolean) => {
  await executeSql('UPDATE WorkoutEntry SET is_done = ? WHERE id = ?;', [
    isDone ? 1 : 0,
    entryId,
  ]);
};

export const finishWorkoutSession = async (sessionId: number) => {
  await executeSql('UPDATE WorkoutSession SET ended_at = ?, is_active = 0 WHERE id = ?;', [
    new Date().toISOString(),
    sessionId,
  ]);
};

export const listWorkoutHistory = async () => {
  const result = await executeSql(
    `SELECT WorkoutSession.*, Routine.name as routine_name
     FROM WorkoutSession
     JOIN Routine ON Routine.id = WorkoutSession.routine_id
     WHERE WorkoutSession.ended_at IS NOT NULL
     ORDER BY WorkoutSession.started_at DESC;`
  );
  return result.rows._array as (WorkoutSession & { routine_name: string })[];
};

export const getWorkoutDetail = async (sessionId: number) => {
  const entriesResult = await executeSql(
    `SELECT WorkoutEntry.*, Exercise.name as exercise_name
     FROM WorkoutEntry
     JOIN Exercise ON Exercise.id = WorkoutEntry.exercise_id
     WHERE WorkoutEntry.session_id = ?
     ORDER BY WorkoutEntry.position ASC;`,
    [sessionId]
  );
  const entries = entriesResult.rows._array as (WorkoutEntry & { exercise_name: string })[];
  const setsByEntry: Record<number, SetEntry[]> = {};
  for (const entry of entries) {
    setsByEntry[entry.id] = await listSetsForEntry(entry.id);
  }
  return { entries, setsByEntry };
};

export const listSetsForExercise = async (exerciseId: number) => {
  const result = await executeSql(
    `SELECT SetEntry.*, WorkoutSession.started_at, Routine.name as routine_name
     FROM SetEntry
     JOIN WorkoutEntry ON WorkoutEntry.id = SetEntry.entry_id
     JOIN WorkoutSession ON WorkoutSession.id = WorkoutEntry.session_id
     JOIN Routine ON Routine.id = WorkoutSession.routine_id
     WHERE WorkoutEntry.exercise_id = ? AND WorkoutSession.ended_at IS NOT NULL
     ORDER BY WorkoutSession.started_at DESC;`,
    [exerciseId]
  );
  return result.rows._array as (SetEntry & { started_at: string; routine_name: string })[];
};

export const listReminders = async (): Promise<Reminder[]> => {
  const result = await executeSql('SELECT * FROM Reminder ORDER BY id DESC;');
  return result.rows._array as Reminder[];
};

export const createReminder = async (
  title: string,
  daysOfWeek: string,
  time: string,
  enabled: boolean,
  notificationIds?: string
) => {
  await executeSql(
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
  await executeSql(
    'UPDATE Reminder SET title = ?, days_of_week = ?, time = ?, enabled = ?, notification_ids = ? WHERE id = ?;',
    [title, daysOfWeek, time, enabled ? 1 : 0, notificationIds ?? null, id]
  );
};

export const deleteReminder = async (id: number) => {
  await executeSql('DELETE FROM Reminder WHERE id = ?;', [id]);
};

export default db;
