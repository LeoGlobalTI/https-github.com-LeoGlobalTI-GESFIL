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
BEGIN
  -- Ensure the row exists
  INSERT INTO system_config (key, value)
  VALUES ('nextSequence', '{}'::JSONB)
  ON CONFLICT (key) DO NOTHING;

  -- Get current config
  SELECT value INTO current_config FROM system_config WHERE key = 'nextSequence';

  -- Get current value for the service or default to 101
  IF current_config ? s_id THEN
    current_val := (current_config->>s_id)::INTEGER;
  ELSE
    current_val := 101;
  END IF;

  -- Update with next value
  UPDATE system_config
  SET value = jsonb_set(value, ARRAY[s_id], to_jsonb(current_val + 1))
  WHERE key = 'nextSequence';

  RETURN current_val;
END;
$$ LANGUAGE plpgsql;

-- 10. Enable Realtime safely
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
