<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://cdn.jsdelivr.net/gh/kwy404/installkite@main/assets/mascot-dark.svg">
    <img src="https://cdn.jsdelivr.net/gh/kwy404/installkite@main/assets/mascot.svg" width="168" alt="Skye, a mascote do installkite: uma pipa alegre com formato de ícone de app e uma rabiola de setinhas de download">
  </picture>
</p>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://cdn.jsdelivr.net/gh/kwy404/installkite@main/assets/banner-dark.svg">
    <img src="https://cdn.jsdelivr.net/gh/kwy404/installkite@main/assets/banner.svg" width="820" alt="Banner do installkite: torne qualquer site instalável e com funcionamento offline com npx installkite init">
  </picture>
</p>

<h1 align="center">installkite: torne qualquer site instalável e com funcionamento offline</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/installkite"><img src="https://img.shields.io/npm/v/installkite?color=2b8ff0&label=npm" alt="versão do installkite no npm"></a>
  <a href="https://www.npmjs.com/package/installkite"><img src="https://img.shields.io/npm/dm/installkite" alt="downloads mensais do installkite no npm"></a>
  <a href="https://www.npmjs.com/package/installkite"><img src="https://img.shields.io/npm/dt/installkite" alt="downloads totais do installkite no npm"></a>
  <a href="https://github.com/kwy404/installkite/actions/workflows/ci.yml"><img src="https://github.com/kwy404/installkite/actions/workflows/ci.yml/badge.svg" alt="status do CI"></a>
  <a href="https://github.com/kwy404/installkite/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/installkite?color=2b8ff0" alt="licença MIT"></a>
  <a href="https://github.com/kwy404/installkite/blob/main/scripts/size.mjs"><img src="https://img.shields.io/badge/runtime-4.4%20kB%20gzip-ff8a3d" alt="O script de runtime tem 4.4 kB com gzip"></a>
</p>

<p align="center">
  <a href="https://kwy404.github.io/installkite/">Site e demo ao vivo</a> &middot;
  <a href="https://kwy404.github.io/installkite/generator.html">Gerador de manifest e ícones</a> &middot;
  <a href="https://kwy404.github.io/installkite/docs.html">Documentação</a> &middot;
  <a href="https://kwy404.github.io/installkite/guides.html">Guias</a> &middot;
  <a href="https://github.com/kwy404/installkite/blob/main/README.md">Read in English</a>
</p>

**O installkite transforma qualquer site em um progressive web app instalável e que funciona offline, com um comando.** Rode `npx installkite init` na pasta de um site estático (ou em um projeto Vite, Next.js, Astro, WordPress ou Laravel). Ele escreve o web app manifest, um conjunto completo de ícones a partir de uma única imagem PNG ou SVG (ícones maskable com margem de zona segura, apple-touch-icon, favicons), um service worker com cache sensato e uma página offline, e injeta as tags no head do seu HTML. Um runtime de 4.4 kB adiciona botão de instalar, a folha "Adicionar à Tela de Início" do iOS, um aviso "Atualizar" quando há versão nova e um selo de offline. O `installkite doctor` audita o resultado.

```bash
npx installkite init
```

## Sumário

- [Início rápido](#início-rápido)
- [O que o init escreve](#o-que-o-init-escreve)
- [Uso com React, Vue, Angular, Next.js e outros](#uso-com-react-vue-angular-nextjs-e-outros)
- [CLI](#cli)
- [Script de runtime e API](#script-de-runtime-e-api)
- [Service worker](#service-worker)
- [installkite doctor](#installkite-doctor)
- [Arquivo de configuração](#arquivo-de-configuração)
- [API para Node](#api-para-node)
- [Gerador online](#gerador-online)
- [Limites](#limites)
- [Perguntas frequentes](#perguntas-frequentes)
- [Mais de kwy404](#mais-de-kwy404)
- [Autor](#autor)
- [Licença](#licença)

## Início rápido

Na pasta do seu site:

```bash
npx installkite init --dry-run   # veja um diff de cada mudança antes
npx installkite init             # responda algumas perguntas, ou use --yes
npx installkite doctor           # audite instalabilidade e prontidão offline
```

Publique com HTTPS (GitHub Pages, Netlify, Vercel e Cloudflare Pages servem) e o navegador passa a oferecer a instalação. Depois de cada build do site, atualize a lista de precache:

```bash
npx installkite build            # no CI: npx installkite build --check
```

Só quer o runtime? Ele está no CDN, com versão fixa:

```html
<script src="https://cdn.jsdelivr.net/npm/installkite@0.1.0/dist/installkite.min.js" data-sw="/sw.js" data-install="auto" defer></script>
```

Ou pelo npm:

```bash
npm install --save-dev installkite
```

## O que o init escreve

| Arquivo | O que é |
| --- | --- |
| `manifest.webmanifest` | id, name, short_name, description, lang, start_url, scope, display, cores, ícones, atalhos e screenshots |
| `icons/icon-48.png` a `icon-512.png` | Dez tamanhos com purpose `any`, mantendo a transparência |
| `icons/maskable-192.png`, `maskable-512.png` | Fundo até as bordas, arte dentro da zona segura de 40% de raio |
| `apple-touch-icon.png` | 180 x 180, opaco, com margem para artes transparentes |
| `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png` | O ICO contém imagens PNG de 16, 32 e 48 px |
| `icons/screenshot-wide.png`, `screenshot-narrow.png` | Placeholders para o diálogo de instalação mais rico |
| `offline.html` | Página offline nas suas cores, com o ícone embutido e as páginas salvas |
| `installkite.js` | O runtime de 4.4 kB |
| `sw.js` | O service worker com a lista de precache com hashes |
| `installkite.config.json` | O que o init decidiu, para `build` e `doctor` rodarem sem perguntas |

As tags do head ficam entre dois comentários marcadores. Rodar o init de novo atualiza esse bloco no lugar, e tags que a página já tem (favicon, link do manifest, theme color) são mantidas, nunca duplicadas. Sem logo? O installkite procura um nos links de favicon e em nomes comuns de arquivo, e se não achar desenha um monograma com as iniciais do app.

## Uso com React, Vue, Angular, Next.js e outros

**HTML puro.** Rode `npx installkite init` na pasta com o `index.html`.

**React, Vue ou Svelte com Vite.** Os arquivos vão para `public/`, as tags para o `index.html` de origem, e o script `build` ganha `npx installkite build`. Para usar a API do runtime nos componentes:

```js
import installkite from 'installkite/runtime';

installkite.init({ sw: '/sw.js', install: 'none' });
installkite.on('installable', () => mostrarBotao());
```

**Angular.**

```bash
npx installkite init --root dist/meu-app/browser --public public --no-inject
```

Cole as tags impressas no `src/index.html` e chame `installkite.init()` no `src/main.ts`.

**Next.js (export estático).** O site é gerado em `out/`; o init escreve em `public/`, atualiza o script de build e imprime as tags para o layout raiz (`app/layout.tsx`), com `manifest`, `icons` e `appleWebApp` em `metadata`, `themeColor` em `viewport` e o script com `next/script`.

**Astro, WordPress, Laravel, GitHub Pages e Netlify** têm receitas na [documentação](https://kwy404.github.io/installkite/docs.html#recipes).

## CLI

```text
npx installkite init [opções]      manifest, ícones, service worker, página offline e tags
npx installkite build [opções]     atualiza o precache depois de cada build (CI)
npx installkite doctor [opções]    audita instalabilidade e funcionamento offline
npx installkite icons <imagem>     só os ícones, a partir de um PNG ou SVG
npx installkite remove             remove as tags do installkite dos arquivos HTML
```

Opções principais do init: `--root`, `--public`, `--base` (por exemplo `/meu-repo/` no GitHub Pages), `--relative`, `--icon`, `--name`, `--short-name`, `--description`, `--theme-color`, `--theme-color-dark`, `--background-color`, `--display`, `--start-url`, `--scope`, `--lang`, `--cdn`, `--no-runtime`, `--no-inject`, `--no-install-button`, `--no-update-toast`, `--no-offline-indicator`, `--no-offline-page`, `--no-screenshots`, `--no-shortcuts`, `--no-postbuild`, `-y` (`--yes`) e `-n` (`--dry-run`). `build --check` sai com código 1 quando o `sw.js` está desatualizado; `doctor --url` audita um site publicado, `--json` imprime o relatório e `--strict` falha também com avisos.

## Script de runtime e API

```html
<script src="/installkite.js" data-sw="/sw.js" data-install="auto" data-offline="badge" defer></script>
<button data-installkite-install hidden>Instalar o app</button>
```

Atributos: `data-sw`, `data-scope`, `data-install="auto"` (botão flutuante; dispensado, some por 14 dias), `data-update="none"`, `data-offline="badge"` e `data-manual`. Elementos com `data-installkite-install` ficam ocultos até o site poder ser instalado.

```js
installkite.on('installable', () => mostrarBotao());
const resultado = await installkite.install(); // 'accepted', 'dismissed', 'instructions' (iOS) ou 'unavailable'
installkite.on('update', ({ apply }) => mostrarAviso('Versão nova', apply));
await installkite.cache(['/artigos/um/']); // salva páginas para leitura offline
```

Membros: `init(options)`, `register()`, `install()`, `update()`, `cache(urls)`, `showIOSInstructions()`, `on()`, `off()` e os estados `canInstall`, `isInstalled`, `isIOS`, `online`, `registration` e `version`. Eventos: `ready`, `installable`, `installed`, `update`, `updated`, `offline`, `online` e `error`. Todos os textos podem ser traduzidos pela opção `text`.

## Service worker

| Requisição | Estratégia |
| --- | --- |
| Arquivos no precache | Cache primeiro; cada arquivo tem hash de conteúdo, então uma versão nova baixa só o que mudou |
| Navegação entre páginas | Rede primeiro com timeout de 3 s, depois a página em cache, depois a página offline |
| Scripts, estilos, fontes | Stale while revalidate, até 120 entradas |
| Imagens | Cache primeiro, até 60 entradas por 30 dias |
| POST, range, outras origens, caminhos excluídos | Não tratados |

## installkite doctor

Verifica HTTPS, viewport, o manifest (link, JSON, tipo, nome, display, start_url dentro do scope e acessível, id, cores), ícones de 192 e 512 com o tamanho real de cada arquivo, ícones maskable, screenshots, apple-touch-icon de 180 px opaco, favicon, o service worker (registro, tipo, scope, handler de fetch), a página offline e se o precache bate com os arquivos. Cada falha vem com a correção.

## Arquivo de configuração

`installkite.config.json` fica ao lado do package.json, com um [JSON schema](https://kwy404.github.io/installkite/config.schema.json). Edite e rode `init --yes` de novo para aplicar.

## API para Node

```ts
import { applyPlan, doctorLocal, planBuild, planInit } from 'installkite';

applyPlan(process.cwd(), planInit(process.cwd(), { name: 'Padaria Acme' }).files);
applyPlan(process.cwd(), planBuild(process.cwd()).files);
const relatorio = await doctorLocal(process.cwd());
```

## Gerador online

O [gerador de manifest e ícones](https://kwy404.github.io/installkite/generator.html) roda no seu navegador, sem upload: solte um logo, digite o nome, veja o ícone em todas as máscaras do Android com a zona segura desenhada, na tela inicial do iOS e na splash screen, e baixe um zip com o manifest, todos os ícones, o favicon.ico e as tags.

## Limites

- **SVG**: o rasterizador embutido cobre o que logos usam (paths, formas, gradientes, traços, transformações, opacidade, clip paths, `use`, regras simples de `<style>` e PNG embutido). `<text>`, máscaras, filtros e patterns são ignorados com aviso.
- **Imagens raster** precisam ser PNG na CLI.
- **iOS** não tem prompt de instalação (o runtime mostra instruções) e o Firefox no desktop não instala sites; o service worker e a página offline funcionam mesmo assim.

## Perguntas frequentes

<details>
<summary><b>Como tornar meu site instalável?</b></summary>

O navegador exige manifest com nome, start URL, display standalone e ícones de 192 e 512 px, HTTPS e um service worker. `npx installkite init` escreve tudo e `npx installkite doctor` confere cada regra.
</details>

<details>
<summary><b>Como transformar um site em app sem reescrever?</b></summary>

Transforme o site em progressive web app. Ele continua funcionando como site, e quem quiser instala pelo navegador, com ícone e janela próprios.
</details>

<details>
<summary><b>Funciona no GitHub Pages?</b></summary>

Sim. Sites de projeto ficam em `/repo/`; o installkite detecta isso pelo remote do git e escreve o caminho base em cada tag, ou use `--relative`.
</details>

<details>
<summary><b>É gratuito?</b></summary>

Sim, código aberto sob licença MIT, sem conta e sem rastreamento.
</details>

## Mais de kwy404

- [Monsoon](https://kwy404.github.io/monsoon/): CSS utilitário sem etapa de build
- [Voodoo.js](https://kwy404.github.io/Voodoo.js/): atributos reativos para HTML puro
- [breakhound](https://kwy404.github.io/breakhound/): encontra bugs em qualquer biblioteca JavaScript
- [vueleap](https://kwy404.github.io/vueleap/): migração de Vue 2 para Vue 3
- [graphemely](https://kwy404.github.io/graphemely/): utilitários de string que respeitam grafemas
- [numberparrot](https://kwy404.github.io/numberparrot/): converte números localizados
- [edgegoat](https://kwy404.github.io/edgegoat/): entradas de casos extremos para testes
- [cookieowl](https://kwy404.github.io/cookieowl/): consentimento de cookies que bloqueia rastreadores de verdade
- [a11ymedic](https://kwy404.github.io/a11ymedic/): checagem WCAG com explicações simples e correções exatas no HTML

## Autor

Criado por **Alexandre Kohler** ([GitHub](https://github.com/kwy404) e [LinkedIn](https://www.linkedin.com/in/alexandre-silva-173687256/)).

## Licença

[MIT](https://github.com/kwy404/installkite/blob/main/LICENSE)
