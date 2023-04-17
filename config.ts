import {
  parse as parseFromYaml,
  stringify as stringifyToYaml,
} from "std/yaml/mod.ts";
import { resolve } from "std/path/mod.ts";
import * as log from "std/log/mod.ts";
import { ConfigObject } from "./types.ts";
const configFileName = "config.yaml";
export const configFilePath: string = resolve(
  `${Deno.env.get("CF_AUTO_DNS_CONFIG_DIR")}/${configFileName}`,
);

const defaultConfig: ConfigObject = {
  ipInfoApiKey: null,
  cloudflareApiKey: null,
  updateIntervalInMinutes: 5,
  records: [
    {
      domain: "",
      subDomain: "",
      useCloudflareCDN: false,
    },
  ],
};

export async function openConfig(): Array<ConfigObject> {
  try {
    const fileContents = await Deno.readTextFile(configFilePath);
    return parseFromYaml(fileContents);
  } catch (_error) {
    log.warn(`Config not found. Please configure it at: ${configFilePath}`);
    await Deno.writeTextFile(configFilePath, stringifyToYaml(defaultConfig), {
      mode: 0o600,
    });
    Deno.exit(1);
  }
}
