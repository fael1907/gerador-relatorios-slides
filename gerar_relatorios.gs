/**
 * Gera um Google Slides (relatório de avaliação de cultura) para cada pessoa
 * listada na aba "Resumo", a partir do modelo em Google Slides.
 *
 * Toda a configuração fica na aba "Config" da planilha — não precisa editar
 * este código quando o ciclo mudar.
 *
 * Config esperada (aba "Config"):
 *   B1: ID do modelo no Google Slides
 *   B2: ID da pasta de destino no Drive
 *   B3: Ano do ciclo atual (ex: 2026)
 *   B4: Ciclo atual (ex: 1º)
 *
 * Resumo esperado (aba "Resumo"), nesta ordem de colunas:
 *   A: Nome
 *   B: Nº de avaliações
 *   C: Nota Geração de Valor
 *   D: Nota Atitude Empreendedora
 *   E: Nota Desenvolvimento Colaborativo
 *   F: Nota Orgulho
 *   G: Média Geral
 *   H: Justificativas Geração de Valor
 *   I: Justificativas Atitude
 *   J: Justificativas Desenvolvimento
 *   K: Justificativas Orgulho
 *
 * Se o texto de uma justificativa ultrapassar LIMITE_CARACTERES_JUSTIFICATIVA
 * caracteres, o slide que contém a respectiva tag (ex: {{JustGeracaoValor}}) é
 * duplicado automaticamente logo em seguida, e o texto continua no(s) slide(s)
 * seguinte(s), quantas vezes forem necessárias. Isso é feito individualmente
 * para cada uma das 4 justificativas — pressupõe que cada uma tem seu próprio
 * slide dedicado no modelo (com sua respectiva tag em uma caixa de texto).
 */

const NOME_ABA_RESUMO = "Resumo";
const NOME_ABA_CONFIG = "Config";
const LIMITE_CARACTERES_JUSTIFICATIVA = 1125;

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Relatórios de Cultura")
    .addItem("Gerar relatórios", "gerarRelatorios")
    .addToUi();
}

function gerarRelatorios() {
  processarRelatorios();
}

function processarRelatorios() {
  const planilha = SpreadsheetApp.getActiveSpreadsheet();
  const config = lerConfig(planilha);
  const abaResumo = planilha.getSheetByName(NOME_ABA_RESUMO);
  const dados = abaResumo.getDataRange().getValues();
  const pastaDestino = DriveApp.getFolderById(config.idPasta);

  let gerados = 0;

  for (let i = 1; i < dados.length; i++) {
    const linha = dados[i];
    const nome = linha[0]; // coluna A
    if (!nome) continue;

    // Placeholders curtos, substituídos direto — sem risco de estourar o slide.
    const dadosSimples = {
      "{{Nome}}": nome,
      "{{Ano}}": config.ano,
      "{{Ciclo}}": config.ciclo,
      "{{NotaGeracaoValor}}": formatarNota(linha[2]),
      "{{NotaAtitude}}": formatarNota(linha[3]),
      "{{NotaDesenvolvimento}}": formatarNota(linha[4]),
      "{{NotaOrgulho}}": formatarNota(linha[5]),
      "{{MediaGeral}}": formatarNota(linha[6]),
    };

    // Justificativas — podem ser longas, tratadas separadamente com overflow.
    const justificativas = {
      "{{JustGeracaoValor}}": linha[7] || "Sem justificativas registradas.",
      "{{JustAtitude}}": linha[8] || "Sem justificativas registradas.",
      "{{JustDesenvolvimento}}": linha[9] || "Sem justificativas registradas.",
      "{{JustOrgulho}}": linha[10] || "Sem justificativas registradas.",
    };

    gerarRelatorioIndividual(nome, dadosSimples, justificativas, pastaDestino, config);
    gerados++;
  }

  SpreadsheetApp.getUi().alert("Concluído! " + gerados + " relatório(s) gerado(s).");
}

function gerarRelatorioIndividual(nome, dadosSimples, justificativas, pastaDestino, config) {
  const copia = DriveApp.getFileById(config.idModelo).makeCopy(
    "Avaliação de Cultura - " + nome + " - " + config.ano + " Ciclo " + config.ciclo,
    pastaDestino
  );

  const apresentacao = SlidesApp.openById(copia.getId());

  // 1) Placeholders simples, em todos os slides.
  apresentacao.getSlides().forEach((slide) => {
    for (const tag in dadosSimples) {
      slide.replaceAllText(tag, String(dadosSimples[tag]));
    }
  });

  // 2) Justificativas — cada uma é tratada individualmente, com duplicação
  //    de slide caso o texto não caiba no limite de caracteres.
  for (const tag in justificativas) {
    inserirJustificativaComOverflow(apresentacao, tag, justificativas[tag]);
  }

  apresentacao.saveAndClose();
}

/**
 * Substitui a tag informada pelo texto correspondente. Se o texto ultrapassar
 * LIMITE_CARACTERES_JUSTIFICATIVA, duplica o slide que contém a tag quantas
 * vezes forem necessárias (inserindo as cópias logo após o slide original) e
 * distribui o texto entre eles, sempre quebrando em espaços para não cortar
 * palavras ao meio.
 *
 * @param {GoogleAppsScript.Slides.Presentation} apresentacao
 * @param {string} tag Ex: "{{JustGeracaoValor}}"
 * @param {string} textoCompleto
 */
function inserirJustificativaComOverflow(apresentacao, tag, textoCompleto) {
  const partes = dividirTextoEmPartes(textoCompleto, LIMITE_CARACTERES_JUSTIFICATIVA);

  // Localiza o slide e a caixa de texto que contêm a tag.
  const slides = apresentacao.getSlides();
  let slideOriginal = null;
  let formaOriginal = null;

  for (const slide of slides) {
    const forma = encontrarFormaComTag(slide, tag);
    if (forma) {
      slideOriginal = slide;
      formaOriginal = forma;
      break;
    }
  }

  if (!slideOriginal) {
    // A tag não existe neste modelo — nada a fazer.
    return;
  }

  // Texto cabe em um único slide: substituição simples.
  if (partes.length === 1) {
    formaOriginal.getText().replaceAllText(tag, partes[0]);
    return;
  }

  // Cria todas as cópias ANTES de substituir qualquer texto, para que cada
  // cópia ainda contenha a tag original intacta (e não o texto já inserido
  // no slide anterior).
  const formasEmOrdem = [formaOriginal];
  let ultimoSlideCriado = slideOriginal;

  for (let p = 1; p < partes.length; p++) {
    const novoSlide = ultimoSlideCriado.duplicate(); // insere logo após ultimoSlideCriado
    const novaForma = encontrarFormaComTag(novoSlide, tag);
    formasEmOrdem.push(novaForma);
    ultimoSlideCriado = novoSlide;
  }

  // Agora substitui, em cada slide, a tag pela parte correspondente do texto.
  for (let p = 0; p < partes.length; p++) {
    if (formasEmOrdem[p]) {
      formasEmOrdem[p].getText().replaceAllText(tag, partes[p]);
    }
  }
}

/**
 * Procura, entre as formas (caixas de texto) de um slide, aquela que contém
 * a tag informada. Ignora formas que não suportam texto (linhas, imagens etc).
 */
function encontrarFormaComTag(slide, tag) {
  const formas = slide.getShapes();
  for (const forma of formas) {
    try {
      const texto = forma.getText();
      if (texto && texto.asString().indexOf(tag) !== -1) {
        return forma;
      }
    } catch (e) {
      // Forma sem suporte a texto — ignora.
    }
  }
  return null;
}

/**
 * Divide um texto em partes de até `limite` caracteres, sempre quebrando no
 * último espaço antes do limite (nunca corta uma palavra ao meio, exceto se
 * uma única palavra for maior que o próprio limite).
 */
function dividirTextoEmPartes(texto, limite) {
  const textoNormalizado = (texto || "").toString().trim();
  if (textoNormalizado.length <= limite) return [textoNormalizado];

  const partes = [];
  let restante = textoNormalizado;

  while (restante.length > limite) {
    let corte = restante.lastIndexOf(" ", limite);
    if (corte <= 0) corte = limite; // palavra única maior que o limite: corta mesmo assim
    partes.push(restante.substring(0, corte).trim());
    restante = restante.substring(corte).trim();
  }
  if (restante.length > 0) partes.push(restante);

  return partes;
}

function lerConfig(planilha) {
  const aba = planilha.getSheetByName(NOME_ABA_CONFIG);
  if (!aba) {
    throw new Error(
      'Aba "' + NOME_ABA_CONFIG + '" não encontrada. Crie-a com: B1=ID do modelo, B2=ID da pasta, B3=Ano, B4=Ciclo.'
    );
  }
  return {
    idModelo: aba.getRange("B1").getValue(),
    idPasta: aba.getRange("B2").getValue(),
    ano: aba.getRange("B3").getValue(),
    ciclo: aba.getRange("B4").getValue(),
  };
}

function formatarNota(valor) {
  if (valor === "" || valor === null || isNaN(valor)) return "-";
  return Number(valor).toFixed(1);
}
