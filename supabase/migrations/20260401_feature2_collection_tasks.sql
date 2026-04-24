-- Feature 2: tabla collection_tasks + RLS
-- Ejecutar en Supabase Dashboard → SQL Editor

-- 1. Crear la tabla
CREATE TABLE IF NOT EXISTS collection_tasks (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  fiado_id         uuid NOT NULL,
  fiado_source     text NOT NULL CHECK (fiado_source IN ('ticket', 'pos', 'servicio')),
  assigned_to      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status           text NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'completed', 'cancelled')),
  amount           numeric NOT NULL,
  customer_name    text,
  detail           text,
  payment_method   text,
  paid_at          timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- 2. Índices
CREATE INDEX IF NOT EXISTS idx_collection_tasks_assigned_to
  ON collection_tasks(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_collection_tasks_org
  ON collection_tasks(organization_id, status);

-- 3. Habilitar RLS
ALTER TABLE collection_tasks ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS

-- Admins ven todas las tareas de su org
CREATE POLICY "admins_read_tasks"
  ON collection_tasks FOR SELECT
  USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
  );

-- Técnicos solo ven las tareas asignadas a ellos
CREATE POLICY "technicians_read_own_tasks"
  ON collection_tasks FOR SELECT
  USING (assigned_to = auth.uid());

-- Solo admins pueden crear tareas
CREATE POLICY "admins_insert_tasks"
  ON collection_tasks FOR INSERT
  WITH CHECK (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
  );

-- Solo admins pueden cancelar tareas (completar va por service_role via API)
CREATE POLICY "admins_update_tasks"
  ON collection_tasks FOR UPDATE
  USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
  );
