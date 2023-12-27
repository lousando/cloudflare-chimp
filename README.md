# Cloudflare Chimp 🐒

Auto-Updates Cloudflare DNS records using [ipinfo](https://ipinfo.io/).

[Github Repo](https://github.com/lousando/cloudflare-chimp)

## ipinfo & Cloudflare Setup ⚙️

1. Register for a free plan over at [ipinfo](https://ipinfo.io/). They're pretty
   generous and offer 50k free requests a month. Creating a Cloudflare API token
2. [Create a CloudFlare API token](https://dash.cloudflare.com/profile/api-tokens)
   for your DNS Zone.
   1. Click `Create Custom Token`
   2. Then grant the following `Permissions`: 2. Zone | Zone Settings | Read 3.
      Zone | Zone | Read 4. Zone | DNS | Edit
   3. Finally, set the following `Zone Resources` 7. Include | All Zones

## Docker Setup 🐳

Create a volume mapping at `/config` in the container. In the volume, create a
file called `config.yaml`. Below is a sample configuration file:

```yaml
# Sample Config of /config/config.yaml
ipInfoApiKey: "your-ipinfo-api-key"
cloudflareApiKey: "your-cloudflare-api-key"
updateIntervalInMinutes: 5
records:
  - domain: "example.com"
    subDomain: "photos"
    useCloudflareCDN: true
  - domain: "example.com"
    subDomain: "db"
    useCloudflareCDN: false
```

### Caveats

- Only be 1 ipinfo call made per update interval; this is to keep your request
  count low.
- _ALL_ your records will update at the same interval, there is currently no
  feature to set custom update intervals per-record.
- Only `A` records are supported.
