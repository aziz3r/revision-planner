# Compilation du rapport.
#
# Avec une installation TeX Live locale :
#     make
#
# Sans TeX Live, via Docker (aucune installation requise) :
#     make docker

PDF := rapport.pdf
TEX := rapport.tex
IMAGE := texlive/texlive:latest-medium

$(PDF): $(TEX)
	pdflatex -interaction=nonstopmode -halt-on-error $(TEX)
	pdflatex -interaction=nonstopmode -halt-on-error $(TEX)

.PHONY: docker clean
docker:
	docker run --rm -v "$(CURDIR)/..:/docs" -w /docs/rapport $(IMAGE) \
	  sh -c "pdflatex -interaction=nonstopmode -halt-on-error $(TEX) && \
	         pdflatex -interaction=nonstopmode -halt-on-error $(TEX)"

clean:
	rm -f rapport.aux rapport.log rapport.out rapport.toc
