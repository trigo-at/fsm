SHELL=/bin/bash
PACKAGE=$(shell cat package.json | jq ".name" | sed 's/@trigo\///')
REPO_VERSION:=$(shell cat package.json| jq .version)

info:
	@echo "=====> Info"
	@echo "Package:               $(PACKAGE)"
	@echo "Version:               ${REPO_VERSION}"
	@echo "Published:             $$(npm show @trigo/$(PACKAGE) version)"

install:
	@yarn install

clean:
	@rm -rf node_modules/

test:
	@yarn test

.PHONY: docs
docs:
	@esdoc

build: .
	@docker-compose -f docker-compose.test.yml build

lint:
	@yarn lint

ci-lint: build
	@docker-compose -f docker-compose.test.yml run --rm $(PACKAGE) yarn lint; \
		test_exit=$$?; \
		docker-compose -f docker-compose.test.yml down; \
		exit $$test_exit


ci-test: build
	@docker-compose -f docker-compose.test.yml run --rm $(PACKAGE); \
		test_exit=$$?; \
		docker-compose -f docker-compose.test.yml down; \
		exit $$test_exit

publish: build
	@docker-compose -f docker-compose.test.yml run --rm $(PACKAGE) \
	   	/bin/bash -c 'if [ "$(REPO_VERSION)" != $$(npm show @trigo/$(PACKAGE) version) ]; then \
			npm publish; \
		else \
			echo "Version unchanged, no need to publish"; \
		fi'; EXIT_CODE=$$?; \
		docker-compose -f docker-compose.test.yml down; \
		exit $$EXIT_CODE


dev-inf-up:
	@docker-compose -f docker-compose.dev-inf.yml up -d

dev-inf-down:
	@docker-compose -f docker-compose.dev-inf.yml down
:
