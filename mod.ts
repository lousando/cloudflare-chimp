#!/usr/bin/env -S deno run --allow-net --allow-read --allow-write --allow-env

import "std/dotenv/load.ts";
import { configFilePath, openConfig } from "./config.ts";
import { ConfigDnsRecord, ConfigObject, IpInfoResponse } from "./types.ts";
import { json } from "https://deno.land/std@0.182.0/yaml/schema/json.ts";

const config: ConfigObject = await openConfig();

if (!config.ipInfoApiKey) {
  console.error(`Missing root 'ipInfoApiKey' value in ${configFilePath}`);
  Deno.exit(1);
}

if (!config.cloudflareApiKey) {
  console.error(`Missing root 'cloudflareApiKey' value in ${configFilePath}`);
  Deno.exit(1);
}

if (!config.updateIntervalInMinutes >= 1) {
  console.error(
    `Please verify that the value of 'updateIntervalInMinutes' is at least 1 in ${configFilePath}`,
  );
  Deno.exit(1);
}

const updateIntervalInMinutes = Math.round(config.updateIntervalInMinutes) *
  60 * 1000;

await fetchIpAndUpdateRecords(); // update on start
setInterval(fetchIpAndUpdateRecords, updateIntervalInMinutes);

/**
 * Methods
 */
async function getIP(): Promise<IpInfoResponse> {
  try {
    return fetch(
      `https://ipinfo.io?token=${config.ipInfoApiKey}`,
    ).then((r) => r.json());
  } catch (error) {
    console.error("Failed to fetch info from IP Info: ", error);
  }
}

async function updateRecord(ipAddress: string, record: ConfigDnsRecord) {
  try {
    const zoneDetails = await fetch(
      `https://api.cloudflare.com/client/v4
/zones?name=${(record.domain)}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.cloudflareApiKey}`,
        },
      },
    ).then((r) => r.json());

    const { errors, success } = await fetch(
      `https://api.cloudflare.com/client/v4
/zones/${zoneDetails.result[0].id}/dns_records`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.cloudflareApiKey}`,
        },
        body: JSON.stringify({
          type: "A",
          content: ipAddress,
          name: record.subDomain,
          proxied: record.useCloudflareCDN,
        }),
      },
    ).then((r) => r.json());

    if (success) {
      console.log(`Successfully updated ${record.subDomain}.${record.domain}`);
    } else {
      console.error("Config: ", record);
      console.error(
        `Could not update ${record.subDomain}.${record.domain}: `,
        errors,
      );
    }
  } catch (error) {
    console.error("Unexpected error when updating record: ", record);
    console.error(error);
  }
}

async function fetchIpAndUpdateRecords() {
  const ipInfo = await getIP();
  for (const record of config.records) {
    await updateRecord(ipInfo.ip, record);
  }

  console.log("Finished updating. Waiting for next run.");
}
