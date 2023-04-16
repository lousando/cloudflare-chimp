FROM denoland/deno:1.32.3

COPY . /app
WORKDIR /app

RUN mkdir /config
RUN deno cache mod.ts

ENV CF_AUTO_DNS_CONFIG_DIR="/config"

CMD ["deno", "run", "--allow-net", "--allow-read", "--allow-write", "--allow-env", "./mod.ts"]