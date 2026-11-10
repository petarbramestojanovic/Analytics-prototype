/** Columns that exist only so the table can sort by them: their values are
 *  shown under the campaign name (status, category) or are the name itself, so
 *  they never get a column of their own. They are always hidden and sorted
 *  from the Campaign header's menu (CampaignSortHeader). */
export const SORT_ONLY_COLUMNS = ['name', 'status', 'category'] as const;
