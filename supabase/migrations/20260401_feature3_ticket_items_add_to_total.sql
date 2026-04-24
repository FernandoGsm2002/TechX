-- Feature 3: campo add_to_total en ticket_items
-- Ejecutar en Supabase Dashboard → SQL Editor

-- 1. Agregar la columna (DEFAULT true = todos los items existentes se comportan igual)
ALTER TABLE ticket_items
  ADD COLUMN IF NOT EXISTS add_to_total boolean NOT NULL DEFAULT true;

-- 2. Ver trigger actual de parts_amount
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'ticket_items';

-- 3. Ver el cuerpo de la función trigger
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_type = 'FUNCTION'
  AND routine_name ILIKE '%parts%';

-- 4. Reemplazar la función trigger para filtrar add_to_total = true
--    (ajustar el nombre si difiere del resultado de los queries anteriores)
CREATE OR REPLACE FUNCTION update_ticket_parts_amount()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE tickets
  SET parts_amount = (
    SELECT COALESCE(SUM(unit_price * quantity), 0)
    FROM ticket_items
    WHERE ticket_id = COALESCE(NEW.ticket_id, OLD.ticket_id)
      AND add_to_total = true
  )
  WHERE id = COALESCE(NEW.ticket_id, OLD.ticket_id);
  RETURN NEW;
END;
$$;
