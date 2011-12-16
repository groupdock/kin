all: docs

docs: tests/examples/kin-examples.js
	docco tests/examples/kin-examples.js
