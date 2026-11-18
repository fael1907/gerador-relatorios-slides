# Gerador de relatórios individuais no Google Slides

Automação em **Google Apps Script** que transforma uma planilha de avaliações em um relatório de slides personalizado para cada pessoa, com um clique.

> Versão pública de uma automação que construí na **Ayra Consultoria** (empresa júnior de gestão da UFRJ). Os dados e os IDs reais foram removidos.

## Problema

A cada ciclo de avaliação de cultura, a equipe montava à mão um relatório para cada membro: copiar o modelo, colar notas e justificativas, ajustar texto que não cabia no slide. Com dezenas de pessoas, isso levava dias.

## Solução

Um menu **"Relatórios de Cultura → Gerar relatórios"** dentro da própria planilha. Para cada linha da aba `Resumo`, o script:

1. copia o modelo do Google Slides para uma pasta do Drive, já com o nome da pessoa, o ano e o ciclo;
2. preenche as tags do modelo (`{{Nome}}`, `{{MediaGeral}}`, `{{NotaAtitude}}`...) com os dados da planilha;
3. insere as justificativas e, **se o texto não couber no slide, duplica o slide e continua o texto no seguinte**, quebrando sempre entre palavras.

Na versão usada na Ayra, uma segunda etapa enviava cada relatório por e-mail para a respectiva pessoa. Esse script não está neste repositório.

```
Planilha (aba Resumo) → Apps Script → cópia do modelo por pessoa → Slides preenchidos no Drive → envio por e-mail
```

## Impacto

- Produção dos relatórios caiu de **dias para minutos**.
- Atendeu cerca de **60 pessoas** por ciclo.

## Destaques técnicos

- **Configuração fora do código:** IDs do modelo e da pasta, ano e ciclo ficam na aba `Config`. Ninguém precisa editar o script quando o ciclo muda.
- **Overflow de texto:** o script cria todas as cópias do slide *antes* de substituir o texto, para que cada cópia ainda tenha a tag original intacta.
- **Robustez:** ignora formas sem texto (imagens, linhas), trata células vazias e formata as notas com uma casa decimal.

## Como usar

1. Crie um modelo no Google Slides com as tags (`{{Nome}}`, `{{Ano}}`, `{{Ciclo}}`, `{{NotaGeracaoValor}}`, `{{JustGeracaoValor}}` etc.).
2. Na planilha, crie a aba `Config` (B1 = ID do modelo, B2 = ID da pasta, B3 = ano, B4 = ciclo) e a aba `Resumo` com as colunas descritas no topo do código.
3. Em **Extensões → Apps Script**, cole o arquivo `src/gerar_relatorios.gs` e salve.
4. Recarregue a planilha e use o menu **Relatórios de Cultura → Gerar relatórios**.

## Como usei IA

Desenvolvi com apoio do **Claude Code**: defini as regras de negócio e o formato do modelo, gerei o código em partes e testei com dados reais até tratar os casos difíceis, como justificativas longas que estouravam o slide.

---
Rafael Avila · Economia UFRJ
