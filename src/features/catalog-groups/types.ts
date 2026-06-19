export interface CatalogGroupSummary {
  id: string
  name: string
}

export interface CatalogGroup extends CatalogGroupSummary {
  item_count: number
  created_at: string
  updated_at: string
}

export interface GroupMembershipResult {
  affected_count: number
}
