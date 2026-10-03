-- ==============================================================================
-- ExzaEstate Migration 20261004000006: Documents Module & Versioning
-- ==============================================================================

-- 1. Create documents table (Tenant-scoped, with RLS)
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  entity_type VARCHAR(64) NOT NULL,
  entity_id UUID NOT NULL,
  category VARCHAR(64),
  is_private BOOLEAN NOT NULL DEFAULT false,
  required_permission VARCHAR(128),
  current_version INTEGER NOT NULL DEFAULT 1,
  expires_at TIMESTAMPTZ,
  is_expired BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_company_id ON documents(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_company_entity ON documents(company_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_documents_company_status ON documents(company_id, status);
CREATE INDEX IF NOT EXISTS idx_documents_company_expires_at ON documents(company_id, expires_at);

-- 2. Create document_versions table (Tenant-scoped, with RLS)
CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  file_key VARCHAR(512) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(128) NOT NULL,
  size_bytes BIGINT NOT NULL,
  checksum VARCHAR(64),
  metadata JSONB,
  uploaded_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_document_versions_company_doc_ver UNIQUE (company_id, document_id, version)
);

CREATE INDEX IF NOT EXISTS idx_document_versions_company_id ON document_versions(company_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_company_document_id ON document_versions(company_id, document_id);

-- 3. Row-Level Security for documents and document_versions
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON documents;
CREATE POLICY tenant_isolation_policy ON documents
  FOR ALL
  TO exza_app
  USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid)
  WITH CHECK (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON document_versions;
CREATE POLICY tenant_isolation_policy ON document_versions
  FOR ALL
  TO exza_app
  USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid)
  WITH CHECK (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid);

-- 4. Role Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON documents TO exza_app, exza_system;
GRANT SELECT, INSERT, UPDATE, DELETE ON document_versions TO exza_app, exza_system;
