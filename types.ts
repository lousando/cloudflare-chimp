export interface ConfigObject {
  ipInfoApiKey: string | null;
  cloudflareApiKey: string | null;
  updateIntervalInMinutes: number;
  records: Array<ConfigDnsRecord>;
}

export interface ConfigDnsRecord {
  domain: string;
  subDomain: string;
  useCloudflareCDN: boolean;
}

export interface IpInfoResponse {
  ip: string;
  timezone: string;
}
