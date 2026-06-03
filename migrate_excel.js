import sqlite3 from 'sqlite3';
import XLSX from 'xlsx';
import crypto from 'crypto';
import path from 'path';

const uuidv4 = () => crypto.randomUUID();

const dbPath = "C:\\Users\\hello\\AppData\\Roaming\\com.yersi.vainilladescanso\\vainilla.db";
const excelPath = path.resolve("public/RESRV.xlsx");

console.log("Connecting to database at:", dbPath);
const db = new sqlite3.Database(dbPath);

console.log("Reading Excel file at:", excelPath);
const workbook = XLSX.readFile(excelPath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const rows = XLSX.utils.sheet_to_json(worksheet);

function excelDateToJSDate(serial) {
  const utc_days  = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  return date_info.toISOString().split('T')[0];
}

const roomMapping = {
  "MOROS Y CRISTIANOS": "101",
  "EL VOLADOR": "102",
  "GUAGUAS": "103",
  "GUAGUA": "103",
  "NEGRITOS": "104",
  "SANTIAGUEROS": "105"
};

db.serialize(() => {
  // Ensure the schema changes are present
  db.run(`CREATE TABLE IF NOT EXISTS guests (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    id_number TEXT,
    origin TEXT,
    created_at TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS reservations (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    guest_id TEXT,
    guest_name TEXT NOT NULL,
    check_in TEXT NOT NULL,
    check_out TEXT NOT NULL,
    total_price REAL NOT NULL,
    notes TEXT,
    payment_status TEXT NOT NULL DEFAULT 'paid',
    status TEXT NOT NULL,
    external_id TEXT,
    FOREIGN KEY(room_id) REFERENCES rooms(id)
  )`);

  // Clear existing migrations (optional, let's keep manually registered guests if any, but since reservations was empty, we can clean and reload safely)
  console.log("Cleaning historical reservations...");
  db.run("DELETE FROM reservations WHERE notes LIKE 'Migración de Excel%'");
  db.run("DELETE FROM guests WHERE origin = 'Migración Excel'");

  const stmtGuest = db.prepare("INSERT INTO guests (id, name, email, phone, id_number, origin, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)");
  const stmtRes = db.prepare("INSERT INTO reservations (id, room_id, guest_id, guest_name, check_in, check_out, total_price, notes, payment_status, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

  let importedCount = 0;

  for (const row of rows) {
    const rawFecha = row.FECHA;
    const roomNameRaw = row["HABITACIÓN"];
    const total = row.TOTAL;

    // Skip summary / empty rows
    if (!rawFecha || rawFecha === "TOTAL" || !roomNameRaw || !total || total === 0) {
      continue;
    }

    const roomId = roomMapping[String(roomNameRaw).trim().toUpperCase()];
    if (!roomId) {
      console.warn("Skipping unknown room name:", roomNameRaw);
      continue;
    }

    const checkInStr = excelDateToJSDate(Number(rawFecha));
    const nights = Number(row.NOCHES || 1);
    
    // Calculate check_out
    const checkInDate = new Date(checkInStr + 'T12:00:00');
    checkInDate.setDate(checkInDate.getDate() + nights);
    const checkOutStr = checkInDate.toISOString().split('T')[0];

    const guestId = uuidv4();
    const resId = uuidv4();
    const now = new Date().toISOString();

    const guestName = `Huésped Suite ${roomId} (${checkInStr})`;
    const personas = row.PERSONAS || 2;
    const payMethod = row["METODO DE PAGO"] || "No especificado";
    const noteContent = row.NOTA || "";
    const notes = `Migración de Excel RESRV.xlsx | Personas: ${personas} | Método de pago: ${payMethod} | Nota: ${noteContent}`;

    // Insert guest
    stmtGuest.run(guestId, guestName, "", "", "N/A", "Migración Excel", now);

    // Insert reservation
    stmtRes.run(resId, roomId, guestId, guestName, checkInStr, checkOutStr, Number(total), notes, "paid", "Confirmed");
    importedCount++;
  }

  stmtGuest.finalize();
  stmtRes.finalize();

  console.log(`Successfully migrated ${importedCount} records from Excel to SQLite database!`);
});

db.close();
