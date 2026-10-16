<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://cdn.jsdelivr.net/gh/kwy404/installkite@main/assets/mascot-dark.svg">
    <img src="https://cdn.jsdelivr.net/gh/kwy404/installkite@main/assets/mascot.svg" width="150" alt="Skye, a mascote do installkite: uma pipa com formato de ícone de app e uma rabiola de setinhas de download">
  </picture>
</p>

<h1 align="center">installkite</h1>

<p align="center">Torne um site instalável e com funcionamento offline com um comando.</p>

<p align="center">
  <a href="https://www.npmjs.com/package/installkite"><img src="https://img.shields.io/npm/v/installkite?color=2b8ff0&label=npm" alt="versão no npm"></a>
  <a href="https://github.com/kwy404/installkite/actions/workflows/ci.yml"><img src="https://github.com/kwy404/installkite/actions/workflows/ci.yml/badge.svg" alt="status do CI"></a>
  <a href="https://github.com/kwy404/installkite/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/installkite?color=2b8ff0" alt="licença MIT"></a>
</p>

<p align="center">
  <a href="https://kwy404.github.io/installkite/">Site</a> &middot;
  <a href="https://kwy404.github.io/installkite/app/">Verificar um site</a> &middot;
  <a href="https://kwy404.github.io/installkite/generator.html">Gerador de ícones</a> &middot;
  <a href="https://kwy404.github.io/installkite/docs.html">Documentação</a> &middot;
  <a href="https://github.com/kwy404/installkite/blob/main/README.md">English</a>
</p>

Rode `npx installkite init` na pasta do seu site. Ele escreve o web app manifest, todos os tamanhos de ícone a partir de um PNG ou SVG, um service worker com uma página offline e as tags do head do seu HTML. Assim os navegadores podem instalar o site no celular ou no computador, com ícone e janela próprios, e abri-lo sem rede. Quem só navega continua vendo o mesmo site.

## Início rápido

```bash
npx installkite init --dry-run   # veja um diff de cada mudança antes
npx installkite init             # responda algumas perguntas, ou use --yes
npx installkite doctor           # confira o que os navegadores exigem
```

Publique com HTTPS. Depois de cada novo build do site, atualize a lista de arquivos em cache:

```bash
npx installkite build
```

Funciona em pastas de HTML simples e em sites com Vite, Next.js (export estático), Astro, WordPress e Laravel. As [receitas](https://kwy404.github.io/installkite/docs.html#recipes) mostram cada caso.

## O que você recebe

| Arquivo | O que é |
| --- | --- |
| `manifest.webmanifest` | Nome, cores, URL inicial, modo de exibição, ícones e atalhos |
| `icons/`, `apple-touch-icon.png`, `favicon.ico` | Dez tamanhos, ícones maskable com margem de zona segura, o ícone do iPhone e os favicons |
| `sw.js` | Um service worker que guarda suas páginas em cache com hashes de conteúdo |
| `offline.html` | Uma página nas suas cores para quando não há rede |
| `installkite.js` | Um script de 4.4 kB: botão de instalar, passos de instalação no iPhone, aviso de atualização e selo offline |
| `installkite.config.json` | O que o init decidiu, para as próximas execuções não perguntarem nada |

As tags do head ficam entre `<!-- installkite:start -->` e `<!-- installkite:end -->` em cada página. Rodar o init de novo atualiza esse bloco no lugar e mantém as tags que você já tinha.

## Comandos

```text
npx installkite init        escreve tudo e adiciona as tags do head
npx installkite build       atualiza a lista de cache depois do build (--check para CI)
npx installkite doctor      verifica os arquivos, ou um site publicado com --url
npx installkite icons <img> só os ícones
npx installkite remove      tira as tags do installkite do HTML
```

Todas as opções estão na [documentação da CLI](https://kwy404.github.io/installkite/docs.html#init) (em inglês).

## Seu próprio botão de instalar

```html
<script src="/installkite.js" data-sw="/sw.js" data-install="auto" defer></script>
<button data-installkite-install hidden>Instalar o app</button>
```

O botão fica escondido até o navegador poder instalar o site. No iPhone e no iPad ele mostra os passos de Adicionar à Tela de Início. Para mais controle:

```js
installkite.on('installable', () => mostrarMeuBotao());
const resultado = await installkite.install(); // 'accepted', 'dismissed', 'instructions' ou 'unavailable'
installkite.on('update', ({ apply }) => mostrarAviso('Nova versão', apply));
```

Veja a [API do runtime](https://kwy404.github.io/installkite/docs.html#runtime-api) e a [API para Node](https://kwy404.github.io/installkite/docs.html#node-api).

## Limites

- Logos em SVG são desenhados por um renderizador embutido. Texto, máscaras, filtros e padrões são ignorados com um aviso, então converta texto em contornos antes.
- A CLI lê PNG e SVG. O gerador online também lê JPEG e WebP.
- iPhone e iPad não têm prompt de instalação, e o Firefox no desktop não instala sites. A página offline continua funcionando neles.

## Mais de kwy404

[Monsoon](https://kwy404.github.io/monsoon/), [Voodoo.js](https://kwy404.github.io/Voodoo.js/), [breakhound](https://kwy404.github.io/breakhound/), [vueleap](https://kwy404.github.io/vueleap/), [graphemely](https://kwy404.github.io/graphemely/), [numberparrot](https://kwy404.github.io/numberparrot/), [edgegoat](https://kwy404.github.io/edgegoat/), [cookieowl](https://kwy404.github.io/cookieowl/), [a11ymedic](https://kwy404.github.io/a11ymedic/), [fontsketch](https://kwy404.github.io/fontsketch/) e [kastor](https://kwy404.github.io/kastor/).

## Autor

Feito por **Alexandre Kohler** ([GitHub](https://github.com/kwy404), [LinkedIn](https://www.linkedin.com/in/alexandre-silva-173687256/)). O site é feito com [Monsoon](https://kwy404.github.io/monsoon/), e as partes interativas com [Voodoo.js](https://kwy404.github.io/Voodoo.js/).

## Licença

[MIT](https://github.com/kwy404/installkite/blob/main/LICENSE)
