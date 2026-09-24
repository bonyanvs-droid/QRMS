import { executeQuery, executeQuerySingle } from '../db/query';
import { MosqueComplexTenant } from '../../src/types';

export async function getPublicTenants(): Promise<Partial<MosqueComplexTenant>[]> {
  const query = `
    SELECT 
      id, slug, name, organization_id, description, city, district, region, 
      address, supervisor_name, contact_phone, email, whatsapp_number, 
      logo_url, stage_logo_url, supported_stages, is_active, 
      tenant_type, show_on_public_directory, created_at, updated_at
    FROM tenants
    WHERE is_active = TRUE AND show_on_public_directory = TRUE
    ORDER BY name ASC
  `;
  return executeQuery<Partial<MosqueComplexTenant>>(query);
}

export async function getTenantByIdOrSlug(idOrSlug: string): Promise<MosqueComplexTenant | null> {
  const query = `
    SELECT *
    FROM tenants
    WHERE id = $1 OR slug = $1
    LIMIT 1
  `;
  return executeQuerySingle<MosqueComplexTenant>(query, [idOrSlug]);
}
