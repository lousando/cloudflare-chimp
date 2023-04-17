#!/usr/bin/env -S deno run --allow-net --allow-read --allow-write --allow-env

import "std/dotenv/load.ts";
import { configFilePath, openConfig } from "./config.ts";
import { ConfigDnsRecord, ConfigObject, IpInfoResponse } from "./types.ts";
import * as log from "std/log/mod.ts";

await log.setup({
  handlers: {
    time: new log.handlers.ConsoleHandler("NOTSET", {
      formatter: `[{levelName}] [${(new Date()).toLocaleString()}] {msg}`,
    }),
  },

  loggers: {
    default: {
      handlers: ["time"],
    },
  },
});

const config: ConfigObject = await openConfig();

if (!config.ipInfoApiKey) {
  log.error(`Missing root 'ipInfoApiKey' value in ${configFilePath}`);
  Deno.exit(1);
}

if (!config.cloudflareApiKey) {
  log.error(`Missing root 'cloudflareApiKey' value in ${configFilePath}`);
  Deno.exit(1);
}

if (!config.updateIntervalInMinutes >= 1) {
  log.error(
    `Please verify that the value of 'updateIntervalInMinutes' is at least 1 in ${configFilePath}`,
  );
  Deno.exit(1);
}

const updateIntervalInMilliseconds =
  Math.round(config.updateIntervalInMinutes) *
  60 * 1000;

await fetchIpAndUpdateRecords(); // update on start
setInterval(fetchIpAndUpdateRecords, updateIntervalInMilliseconds);

/**
 * Methods
 */
async function getIP(): Promise<IpInfoResponse> {
  try {
    return await fetch(
      `https://ipinfo.io?token=${config.ipInfoApiKey}`,
    ).then((r) => r.json());
  } catch (error) {
    log.error("Failed to fetch info from IP Info: ", error);
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

    /**
     * Update existing domain
     */

    const subdomainDetails = await fetch(
      `https://api.cloudflare.com/client/v4
/zones/${
        zoneDetails.result[0].id
      }/dns_records?name=${record.subDomain}.${record.domain}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.cloudflareApiKey}`,
        },
      },
    ).then((r) => r.json());

    const subdomainID: string | undefined = subdomainDetails.result[0]?.id;

    /**
     * Create new domain
     */
    if (!subdomainID) {
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
        log.info(
          `Successfully created ${record.subDomain}.${record.domain}`,
        );
      } else {
        log.error("Config: ", record);
        log.error(
          `Could not create ${record.subDomain}.${record.domain}: `,
          errors,
        );
      }
    } else {
      /**
       * Update existing domain
       */
      const { errors, success } = await fetch(
        `https://api.cloudflare.com/client/v4
/zones/${zoneDetails.result[0].id}/dns_records/${subdomainID}`,
        {
          method: "PUT",
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
        log.info(
          `Successfully updated ${record.subDomain}.${record.domain}`,
        );
      } else {
        log.error("Config: ", record);
        log.error(
          `Could not update ${record.subDomain}.${record.domain}: `,
          errors,
        );
      }
    }
  } catch (error) {
    log.error("Unexpected error when creating/updating record: ", record);
    log.error(error);
  }
}

async function fetchIpAndUpdateRecords() {
  const ipInfo = await getIP();
  for (const record of config.records) {
    await updateRecord(ipInfo.ip, record);
  }

  log.info(
    `Finished updating. Waiting ${config.updateIntervalInMinutes}min for next run.`,
  );
}
