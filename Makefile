.PHONY: build push

build:
	docker build . -t lousando/cloudflare-chimp

push:
	docker push lousando/cloudflare-chimp