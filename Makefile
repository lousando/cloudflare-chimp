.PHONY: build push

build:
	docker build . -t lousando/cloudflare-auto-dns

push:
	docker push lousando/cloudflare-auto-dns