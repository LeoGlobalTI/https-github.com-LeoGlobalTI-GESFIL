-- SQL Schema for Supabase (Idempotent Version)

-- 1. Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Services table
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  prefix TEXT NOT NULL,
  color TEXT NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  start_time TEXT,
  end_time TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Stations table
CREATE TABLE IF NOT EXISTS stations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  operator_name TEXT,
  service_ids TEXT[] DEFAULT '{}',
  service_configs JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tickets table
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  called_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  station_id UUID REFERENCES stations(id) ON DELETE SET NULL,
  priority BOOLEAN DEFAULT false,
  recalled_count INTEGER DEFAULT 0
);

-- 5. Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  assigned_station_id UUID REFERENCES stations(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Printers table
CREATE TABLE IF NOT EXISTS printers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  address TEXT,
  port INTEGER,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. System Config (for sequence)
CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

-- 8. Disable RLS for all tables (Demo/Internal use)
ALTER TABLE services DISABLE ROW LEVEL SECURITY;
ALTER TABLE stations DISABLE ROW LEVEL SECURITY;
ALTER TABLE tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE printers DISABLE ROW LEVEL SECURITY;
ALTER TABLE system_config DISABLE ROW LEVEL SECURITY;

-- 9. RPC for incrementing sequence
CREATE OR REPLACE FUNCTION increment_sequence(s_id TEXT)
RETURNS INTEGER AS $$
DECLARE
  current_val INTEGER;
  current_config JSONB;
  today TEXT;
BEGIN
  today := TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD');

  -- Ensure the row exists and is initialized
  INSERT INTO system_config (key, value)
  VALUES ('nextSequence', jsonb_build_object('lastResetDate', today, 'sequences', '{}'::JSONB))
  ON CONFLICT (key) DO UPDATE 
  SET value = jsonb_build_object('lastResetDate', today, 'sequences', '{}'::JSONB)
  WHERE (system_config.value->>'lastResetDate') != today;

  -- Get current config with lock
  SELECT value INTO current_config FROM system_config WHERE key = 'nextSequence' FOR UPDATE;
  
  -- Get current value for the service
  current_val := COALESCE((current_config->'sequences'->>s_id)::INTEGER, 0);
  
  -- Update with next value
  UPDATE system_config
  SET value = jsonb_set(
    current_config,
    ARRAY['sequences', s_id],
    to_jsonb(current_val + 1)
  )
  WHERE key = 'nextSequence';

  RETURN current_val + 1;
END;
$$ LANGUAGE plpgsql;

-- 10. Indexes for performance and synchronization
CREATE INDEX IF NOT EXISTS idx_tickets_status_service ON tickets(status, service_id);
CREATE INDEX IF NOT EXISTS idx_tickets_station ON tickets(station_id);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at DESC);

-- 11. Enable Realtime safely
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE services; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE stations; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE tickets; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE users; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE printers; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE system_config; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- 11. Initial Data
INSERT INTO users (username, password, name, role)
VALUES ('superadmin', '123', 'Super Administrador', 'SUPERADMIN')
ON CONFLICT (username) DO NOTHING;

INSERT INTO system_config (key, value)
VALUES ('nextSequence', '{}'::JSONB)
ON CONFLICT (key) DO NOTHING;
