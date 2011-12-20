all: docs

docs: examples readme
	
examples: tests/examples/kin-examples.js
	docco tests/examples/kin-examples.js

readme:
	python ./html2text.py docs/kin-examples.html > readme.new.md
