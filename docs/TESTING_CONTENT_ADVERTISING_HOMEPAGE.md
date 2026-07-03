# Testing de la integración Newspaper interna

## Validaciones ejecutadas en sandbox

Como en el entorno no está disponible el binario `yarn`, las validaciones se ejecutaron directamente con los binarios Node instalados en `node_modules`.

```bash
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js "{src,test}/**/*.ts"
node node_modules/@nestjs/cli/bin/nest.js build
node node_modules/tsc-alias/dist/bin/index.js -p tsconfig.build.json
node node_modules/jest/bin/jest.js --runInBand
```

Resultado:

```txt
typecheck: OK
lint: OK
build: OK
tests: OK, 4 suites / 9 tests
migration/seed syntax: OK
```

## Comandos esperados en ambiente normal con Yarn

```bash
yarn install
yarn typecheck
yarn lint
yarn build
yarn test
yarn db:migrate
yarn db:seed
yarn smoke:publications
yarn smoke:advertising
yarn smoke:homepage
yarn smoke:newspaper-internal
```

## Smoke público

Antes de ejecutar los smoke tests, levanta el backend y configura si hace falta:

```bash
$env:SMOKE_BASE_URL="http://localhost:3000/api/v1"
yarn smoke:newspaper-internal
```

Endpoints cubiertos:

```txt
GET /publications/categories
GET /publications/news
GET /publications/columns
GET /advertising/placements
GET /advertising/slots?placementCode=home_hero
GET /homepage
```
