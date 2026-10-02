export interface Company {
  id: string;
  name: string;
  campaignCount: number;
  /** Industry taxonomy shared with the KPI platform's `categories` table —
   *  the grouping dimension behind industry benchmarks. Salesforce-owned in a
   *  real deployment, which is why it lives on the company and not the campaign. */
  industry: string;
}

/** The media agency that booked a campaign on a client's behalf, if any.
 *  Salesforce-owned commercial metadata, same family as `salesforce.owner` —
 *  internal staff need to know who they're coordinating with, a client
 *  viewing their own campaigns never needs (or should see) this. */
export interface Agency {
  id: string;
  name: string;
}

