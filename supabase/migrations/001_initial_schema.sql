-- Vainilla & Descanso CRM — Initial Schema
-- PostgreSQL (Supabase)

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ROOMS
-- ============================================================
CREATE TABLE rooms (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  room_type  TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'available',
  price      NUMERIC(10,2) NOT NULL,
  image      TEXT,

  CONSTRAINT rooms_status_check CHECK (status IN ('available', 'occupied', 'maintenance'))
);

-- ============================================================
-- GUESTS
-- ============================================================
CREATE TABLE guests (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  email      TEXT,
  phone      TEXT,
  id_number  TEXT,
  origin     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_guests_name ON guests (LOWER(name));

-- ============================================================
-- RESERVATIONS
-- ============================================================
CREATE TABLE reservations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id         TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  guest_id        UUID REFERENCES guests(id) ON DELETE SET NULL,
  guest_name      TEXT NOT NULL,
  check_in        DATE NOT NULL,
  check_out       DATE NOT NULL,
  total_price     NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes           TEXT,
  payment_status  TEXT NOT NULL DEFAULT 'paid',
  status          TEXT NOT NULL DEFAULT 'Confirmed',
  external_id     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT reservations_dates_check CHECK (check_out >= check_in)
);

CREATE INDEX idx_reservations_room    ON reservations (room_id);
CREATE INDEX idx_reservations_checkin ON reservations (check_in);
CREATE INDEX idx_reservations_guest   ON reservations (guest_id);

-- ============================================================
-- PRODUCTS (Menu/Bar catalog)
-- ============================================================
CREATE TABLE products (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  category   TEXT NOT NULL,
  price      NUMERIC(10,2) NOT NULL,
  stock      INTEGER,
  image      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_category ON products (category, name);

-- ============================================================
-- POS SALES
-- ============================================================
CREATE TABLE pos_sales (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  items_json      JSONB NOT NULL,
  total           NUMERIC(10,2) NOT NULL,
  payment_method  TEXT NOT NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pos_sales_date ON pos_sales (created_at DESC);

-- ============================================================
-- ROOM CHARGES (consumptions charged to a room)
-- ============================================================
CREATE TABLE room_charges (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  guest_name TEXT NOT NULL,
  items_json JSONB NOT NULL,
  total      NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_room_charges_room ON room_charges (room_id);
CREATE INDEX idx_room_charges_date ON room_charges (created_at DESC);

-- ============================================================
-- FEEDBACK
-- ============================================================
CREATE TABLE feedback (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_name TEXT NOT NULL,
  rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- SETTINGS (key-value store)
-- ============================================================
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title     TEXT NOT NULL,
  message   TEXT NOT NULL,
  type      TEXT NOT NULL DEFAULT 'info',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  read      BOOLEAN NOT NULL DEFAULT false
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE rooms          ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests         ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE products       ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_sales      ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_charges   ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback       ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications  ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can do everything (single-tenant CRM)
CREATE POLICY "Authenticated full access" ON rooms          FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON guests         FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON reservations   FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON products       FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON pos_sales      FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON room_charges   FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON feedback       FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON settings       FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON notifications  FOR ALL USING (auth.role() = 'authenticated');
