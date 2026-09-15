import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

// SUAS CREDENCIAIS CONFIGURADAS:
const firebaseConfig = {
    apiKey: "AIzaSyAcUW8smRB_L6J3UXwhiCM61rR6ywtmu7Q",
    authDomain: "foco-caxias.firebaseapp.com",
    projectId: "foco-caxias",
    storageBucket: "foco-caxias.firebasestorage.app",
    messagingSenderId: "243553190022",
    appId: "1:243553190022:web:46dcecf1cd326841391107",
    measurementId: "G-BPXVEW9VTQ"
};


// Inicialização Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

let usuarioAtual = null;

// AUTENTICAÇÃO E SINCRONIZAÇÃO EM TEMPO REAL
onAuthStateChanged(auth, async (user) => {
    if (user) {
        usuarioAtual = user;
        document.getElementById("user-logged-out").style.display = "none";
        document.getElementById("user-logged-in").style.display = "flex";
        document.getElementById("user-name").innerText = user.displayName.split(" ")[0];
        document.getElementById("user-photo").src = user.photoURL;

        // Baixa os dados da nuvem
        await carregarDadosNuvem();
    } else {
        usuarioAtual = null;
        document.getElementById("user-logged-out").style.display = "block";
        document.getElementById("user-logged-in").style.display = "none";
        
        // Renderiza com dados locais
        renderizarTudo();
    }
});

window.fazerLoginGoogle = () => {
    signInWithPopup(auth, provider).catch(error => alert("Erro ao autenticar: " + error.message));
};

window.fazerLogout = () => {
    signOut(auth).then(() => window.location.reload());
};

// SALVAMENTO HÍBRIDO (LOCAL + NUVEM)
async function salvarChave(chave, dados) {
    localStorage.setItem(chave, typeof dados === 'string' ? dados : JSON.stringify(dados));
    
    if (usuarioAtual) {
        try {
            await setDoc(doc(db, "usuarios", usuarioAtual.uid), {
                [chave]: typeof dados === 'string' ? dados : JSON.stringify(dados)
            }, { merge: true });
        } catch (e) {
            console.error("Erro ao sincronizar com nuvem: ", e);
        }
    }
}

async function carregarDadosNuvem() {
    if (!usuarioAtual) return;
    try {
        const docRef = doc(db, "usuarios", usuarioAtual.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data['diario-caxias']) localStorage.setItem('diario-caxias', data['diario-caxias']);
            if (data['erros-caxias']) localStorage.setItem('erros-caxias', data['erros-caxias']);
            if (data['mapas-caxias']) localStorage.setItem('mapas-caxias', data['mapas-caxias']);
            if (data['questoes-caxias']) localStorage.setItem('questoes-caxias', data['questoes-caxias']);
            if (data['pdfs-caxias']) localStorage.setItem('pdfs-caxias', data['pdfs-caxias']);
        }
    } catch (e) {
        console.error("Erro ao puxar dados da nuvem: ", e);
    }
    renderizarTudo();
}

function renderizarTudo() {
    inicializarCalendario();
    carregarErrosCategorizados();
    carregarMapas();
    if (!localStorage.getItem("pdfs-caxias")) {
        localStorage.setItem("pdfs-caxias", JSON.stringify(LISTA_PDFS_PADRAO));
    }
    carregarPDFs();
}

// LÓGICA DO PAINEL
const DATA_PROVA = new Date("2026-11-15T00:00:00"); 
const DATA_INICIO_ESTUDOS = new Date("2026-09-01T00:00:00");

const fasesDaPreparacao = {
    fase1: {
        nome: "Fase 1: Cobertura Teórica do Edital de Caxias(MA)",
        diretriz: "🎯 <strong>Foco:</strong> Leitura completa dos PDFs base, resolução rápida de fixação e catalogação rigorosa de pegadinhas no Caderno de Erros."
    },
    fase2: {
        nome: "Fase 2: Treinamento Massivo de Questões e Legislação Municipal",
        diretriz: "🔄 <strong>Foco:</strong> 70% do tempo em questões de Português e Matemática. Leitura contínua da Lei Orgânica de Caxias-MA e Lei nº 2.156/2014."
    },
    fase3: {
        nome: "Fase 3: Reta Final e Revisão Extrema",
        diretriz: "🏁 <strong>Foco:</strong> Revisão total do Caderno de Erros, memorização de fórmulas de Geometria/Álgebra e atalhos de Informática (Word/Excel 2016)."
    }
};

const cicloMateriasBase = {
    "Segunda-feira": ["Matemática: Números Inteiros, Racionais e Reais / Razão, Proporção e Porcentagem", "Língua Portuguesa: Compreensão/Interpretação e Semântica"],
    "Terça-feira": ["Matemática: Polinômios e Equações do 1º e 2º Graus", "Noções de Informática: Hardware, Software e Segurança da Informação"],
    "Quarta-feira": ["Matemática: Geometria Plana (Áreas e Segmentos)", "Conhecimentos Locais: Aspectos Históricos, Geográficos e Políticas de Caxias-MA (Lei nº 2.156/2014)"],
    "Quinta-feira": ["Matemática: Matrizes, Determinantes e Geometria Espacial", "Língua Portuguesa: Sintaxe (Termos da Oração e Período Composto)"],
    "Sexta-feira": ["Matemática: Trigonometria e Progressões (PA e PG)", "Noções de Informática: Windows 11, Word 2016 e Excel 2016"],
    "Sábado": ["Matemática: Geometria Analítica e Análise Combinatória", "Conhecimentos Locais: Lei Orgânica do Município de Caxias-MA"],
    "Domingo": ["🚨 Dia de Simulado Geral (Português, Informática, Caxias e Matemática)", "Revisão e Alimentação do Caderno de Erros"]
};

const LISTA_PDFS_PADRAO = [
    { id: 1, disciplina: "Matemática", titulo: "PDF 1 - Números Inteiros.pdf", lido: false },
    { id: 2, disciplina: "Matemática", titulo: "PDF 2 - Números Racionais e Reais.pdf", lido: false },
    { id: 3, disciplina: "Matemática", titulo: "PDF 3 - Razão e Proporção, Regra de Três e Porcentagem.pdf", lido: false },
    { id: 4, disciplina: "Matemática", titulo: "PDF 4 - Medidas de Posição.pdf", lido: false },
    { id: 5, disciplina: "Matemática", titulo: "PDF 5 - Juros Simples.pdf", lido: false },
    { id: 6, disciplina: "Matemática", titulo: "PDF 6 - Juros Compostos.pdf", lido: false },
    { id: 7, disciplina: "Matemática", titulo: "PDF 7 - Polinômios.pdf", lido: false },
    { id: 8, disciplina: "Matemática", titulo: "PDF 8 - Equações do 1º e 2º Graus.pdf", lido: false },
    { id: 9, disciplina: "Matemática", titulo: "PDF 9 - Geometria Plana Áreas.pdf", lido: false },
    { id: 10, disciplina: "Matemática", titulo: "PDF 10 - Geometria Plana Segmentos.pdf", lido: false },
    { id: 11, disciplina: "Matemática", titulo: "PDF 11 - Matrizes, Determinantes e Sistemas Lineares.pdf", lido: false },
    { id: 12, disciplina: "Matemática", titulo: "PDF 12 - Geometria Espacial.pdf", lido: false },
    { id: 13, disciplina: "Matemática", titulo: "PDF 13 - Geometria Analítica.pdf", lido: false },
    { id: 14, disciplina: "Matemática", titulo: "PDF 14 - Trigonometria.pdf", lido: false },
    { id: 15, disciplina: "Matemática", titulo: "PDF 15 - Progressões Aritméticas e Geométricas.pdf", lido: false },
    { id: 16, disciplina: "Matemática", titulo: "PDF 16 - Análise Combinatória.pdf", lido: false },
    { id: 17, disciplina: "Língua Portuguesa", titulo: "PDF 1 - Compreensão e Interpretação de Textos.pdf", lido: false },
    { id: 18, disciplina: "Língua Portuguesa", titulo: "PDF 2 - Semântica, Figura e Vícios de Linguagem, Coesão e Coerência e Reescrita.pdf", lido: false },
    { id: 19, disciplina: "Língua Portuguesa", titulo: "PDF 3 - Tipologias e Gêneros Textuais.pdf", lido: false },
    { id: 20, disciplina: "Língua Portuguesa", titulo: "PDF 1 - Ortografia Oficial - Escrita e Acentuação das Palavras.pdf", lido: false },
    { id: 21, disciplina: "Língua Portuguesa", titulo: "PDF 2 - Análise Sintática - Termos da Oração.pdf", lido: false },
    { id: 22, disciplina: "Língua Portuguesa", titulo: "PDF 3 - Classes Gramaticais.pdf", lido: false },
    { id: 23, disciplina: "Língua Portuguesa", titulo: "PDF 4 - Período Composto por Coordenação e Subordinação.pdf", lido: false },
    { id: 24, disciplina: "Língua Portuguesa", titulo: "PDF 5 - Colocação Pronominal - Próclise, Ênclise e Mesóclise.pdf", lido: false },
    { id: 25, disciplina: "Língua Portuguesa", titulo: "PDF 6 - Pontuação.pdf", lido: false },
    { id: 26, disciplina: "Língua Portuguesa", titulo: "PDF 7 - Regência e Crase.pdf", lido: false },
    { id: 27, disciplina: "Língua Portuguesa", titulo: "PDF 8 - Funções do SE e QUE.pdf", lido: false },
    { id: 28, disciplina: "Língua Portuguesa", titulo: "PDF 9 - Concordância Nominal, Verbal e Verbo-Nominal.pdf", lido: false },
    { id: 29, disciplina: "Noções de Informática", titulo: "PDF 1 - Software e Hardware.pdf", lido: false },
    { id: 30, disciplina: "Noções de Informática", titulo: "PDF 2 - Segurança da Informação e Backup.pdf", lido: false },
    { id: 31, disciplina: "Noções de Informática", titulo: "PDF 3 - Windows 11.pdf", lido: false },
    { id: 32, disciplina: "Noções de Informática", titulo: "PDF 4 - Redes e Internet.pdf", lido: false },
    { id: 33, disciplina: "Noções de Informática", titulo: "PDF 5 - Navegadores.pdf", lido: false },
    { id: 34, disciplina: "Noções de Informática", titulo: "PDF 6 - Word 2016.pdf", lido: false },
    { id: 35, disciplina: "Noções de Informática", titulo: "PDF 7 - Excel 2016.pdf", lido: false },
    { id: 36, disciplina: "Noções de Informática", titulo: "PDF 8 - PowerPoint 2016.pdf", lido: false },
    { id: 37, disciplina: "Conhecimentos Locais", titulo: "PDF 1 - Aspectos Históricos, Geográficos, Políticos e Culturais de Caxias-MA (Lei nº 2.156/2014).pdf", lido: false },
    { id: 38, disciplina: "Conhecimentos Locais", titulo: "PDF 2 - Lei Orgânica do Município de Caxias-MA.pdf", lido: false }
];

function renderizarLaTeXNoElemento(elemento) {
    if (window.renderMathInElement) {
        renderMathInElement(elemento, {
            delimiters: [
                {left: '$$', right: '$$', display: true},
                {left: '$', right: '$', display: false}
            ],
            throwOnError: false
        });
    }
}

document.addEventListener("DOMContentLoaded", () => {
    renderizarTudo();
    document.getElementById("form-registro-dia").addEventListener("submit", salvarRegistroDia);
    document.getElementById("form-erro").addEventListener("submit", salvarErro);
    document.getElementById("form-mapa").addEventListener("submit", salvarMapa);
    document.getElementById("form-pdf").addEventListener("submit", salvarPDF);
});

window.switchTab = (tabId) => {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active-content'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active-content');
    if(event && event.currentTarget) event.currentTarget.classList.add('active');
};

function inicializarCalendario() {
    const seletor = document.getElementById("select-data");
    seletor.innerHTML = "";
    
    let dataCursor = new Date(DATA_INICIO_ESTUDOS);
    dataCursor.setHours(0,0,0,0);
    const limiteProva = new Date(DATA_PROVA); limiteProva.setHours(0,0,0,0);
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const hojeISO = hoje.toISOString().split('T')[0];
    let encontrouHoje = false;

    while(dataCursor <= limiteProva) {
        const dataFormatadaISO = dataCursor.toISOString().split('T')[0];
        const opcaoVisual = dataCursor.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit', weekday: 'short'});
        const opt = document.createElement("option");
        opt.value = dataFormatadaISO; 
        opt.innerText = opcaoVisual;
        
        if (dataFormatadaISO === hojeISO) {
            opt.selected = true;
            encontrouHoje = true;
        }
        seletor.appendChild(opt);
        dataCursor.setDate(dataCursor.getDate() + 1);
    }
    
    if (!encontrouHoje && seletor.options.length > 0) seletor.options[0].selected = true;
    mudarDataReal();
}

window.mudarDataReal = () => {
    const dataSelecionadaStr = document.getElementById("select-data").value;
    const dataObj = new Date(dataSelecionadaStr + "T00:00:00");
    const limiteProva = new Date(DATA_PROVA); limiteProva.setHours(0,0,0,0);
    
    const diasRestantes = Math.ceil((limiteProva.getTime() - dataObj.getTime()) / (1000 * 60 * 60 * 24));
    let faseAtual = fasesDaPreparacao.fase1;
    if (diasRestantes <= 20) faseAtual = fasesDaPreparacao.fase3;
    else if (diasRestantes <= 50) faseAtual = fasesDaPreparacao.fase2;
    
    const textoDias = diasRestantes === 0 ? "É HOJE A PROVA DE CAXIAS-MA! 🚀" : `Faltam exatamente <strong>${diasRestantes} dias</strong> para a prova!`;
    document.getElementById("fase-diretriz").innerHTML = `<strong>${faseAtual.nome}</strong> — ${textoDias}<br><br>${faseAtual.diretriz}`;
    
    const diasSemana = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
    const materias = cicloMateriasBase[diasSemana[dataObj.getDay()]] || [];
    let htmlMaterias = `<p style='color:var(--secondary); font-weight:bold;'>📅 Ciclo (${diasSemana[dataObj.getDay()]}):</p><ul style='padding-left:20px; margin-top:5px;'>`;
    materias.forEach(mat => htmlMaterias += `<li>${mat}</li>`);
    htmlMaterias += `</ul>`;
    document.getElementById("materias-do-dia").innerHTML = htmlMaterias;
    
    const historicoDiario = JSON.parse(localStorage.getItem("diario-caxias") || "{}");
    const statusBox = document.getElementById("status-dia-salvo");
    const formularioRegistro = document.getElementById("form-registro-dia");
    
    if (historicoDiario[dataSelecionadaStr]) {
        formularioRegistro.style.display = "none";
        statusBox.style.display = "block";
        statusBox.style.backgroundColor = "#f0fdf4";
        statusBox.style.borderLeft = "5px solid var(--success)";
        statusBox.innerHTML = `
            <h4>📝 Registro Salvo nesta data:</h4>
            <p><strong>⏱️ Carga Horária:</strong> ${historicoDiario[dataSelecionadaStr].horas} horas</p>
            <p style='background:white; padding:10px; border-radius:4px; margin-top:5px; white-space: pre-wrap;'>${historicoDiario[dataSelecionadaStr].texto}</p>
            <button type="button" style="margin-top:10px; padding:6px 12px; cursor:pointer;" onclick="habilitarEdicaoDia()">✏️ Editar Registro</button>
        `;
    } else {
        formularioRegistro.style.display = "flex";
        statusBox.style.display = "none";
        document.getElementById("registro-horas").value = "";
        document.getElementById("registro-texto").value = "";
    }
    carregarQuestoesDoDia();
};

window.habilitarEdicaoDia = () => {
    const dataSelecionadaStr = document.getElementById("select-data").value;
    const historicoDiario = JSON.parse(localStorage.getItem("diario-caxias") || "{}");
    document.getElementById("registro-horas").value = historicoDiario[dataSelecionadaStr].horas;
    document.getElementById("registro-texto").value = historicoDiario[dataSelecionadaStr].texto;
    document.getElementById("form-registro-dia").style.display = "flex";
    document.getElementById("status-dia-salvo").style.display = "none";
};

async function salvarRegistroDia(e) {
    e.preventDefault();
    const dataStr = document.getElementById("select-data").value;
    const historicoDiario = JSON.parse(localStorage.getItem("diario-caxias") || "{}");
    historicoDiario[dataStr] = {
        horas: document.getElementById("registro-horas").value,
        texto: document.getElementById("registro-texto").value
    };
    await salvarChave("diario-caxias", historicoDiario);
    mudarDataReal();
}

window.salvarQuestoesDia = async (e) => {
    e.preventDefault();
    const dataStr = document.getElementById("select-data").value;
    const disciplina = document.getElementById("qst-disciplina").value;
    const conteudo = document.getElementById("qst-conteudo").value;
    const acertos = parseInt(document.getElementById("qst-acertos").value) || 0;
    const erros = parseInt(document.getElementById("qst-erros").value) || 0;

    const novaQuestaoLog = { id: Date.now(), dataStr, disciplina, conteudo, acertos, erros };
    const globalQuestao = JSON.parse(localStorage.getItem("questoes-caxias") || "[]");
    globalQuestao.push(novaQuestaoLog);
    
    await salvarChave("questoes-caxias", globalQuestao);

    document.getElementById("qst-conteudo").value = "";
    document.getElementById("qst-acertos").value = "";
    document.getElementById("qst-erros").value = "";

    carregarQuestoesDoDia();
    carregarErrosCategorizados();
};

function carregarQuestoesDoDia() {
    const dataStr = document.getElementById("select-data").value;
    const container = document.getElementById("lista-questoes-do-dia");
    container.innerHTML = "";
    
    const globalQuestao = JSON.parse(localStorage.getItem("questoes-caxias") || "[]");
    const filtrados = globalQuestao.filter(q => q.dataStr === dataStr);

    if(filtrados.length > 0) {
        container.innerHTML = "<p style='font-weight:bold; margin-top:10px;'>📊 Resoluções computadas no dia:</p>";
        filtrados.forEach(q => {
            const item = document.createElement("div");
            item.className = "item-salvo";
            item.style.padding = "8px 12px";
            item.style.fontSize = "0.85rem";
            item.innerHTML = `
                <strong>${q.disciplina}</strong> - ${q.conteudo}<br>
                <span class='mini-badge-questoes' style='background:#16a34a'>✔️ Acertos: ${q.acertos}</span>
                <span class='mini-badge-questoes' style='background:#dc2626'>❌ Erros: ${q.erros}</span>
                <button style='float:right; border:none; background:none; color:red; cursor:pointer;' onclick='deletarQuestaoLog(${q.id})'>🗑️</button>
                <div style='clear:both;'></div>
            `;
            container.appendChild(item);
        });
    }
}

window.deletarQuestaoLog = async (id) => {
    let globalQuestao = JSON.parse(localStorage.getItem("questoes-caxias") || "[]");
    globalQuestao = globalQuestao.filter(q => q.id !== id);
    await salvarChave("questoes-caxias", globalQuestao);
    carregarQuestoesDoDia();
    carregarErrosCategorizados();
};

async function salvarErro(e) {
    e.preventDefault();
    const novoErro = {
        id: Date.now(),
        disciplina: document.getElementById("erro-disciplina").value,
        enunciado: document.getElementById("erro-enunciado").value,
        motivo: document.getElementById("erro-motivo").value
    };
    const listaErros = JSON.parse(localStorage.getItem("erros-caxias") || "[]");
    listaErros.push(novoErro);
    await salvarChave("erros-caxias", listaErros);
    
    document.getElementById("erro-enunciado").value = "";
    document.getElementById("erro-motivo").value = "";
    carregarErrosCategorizados();
}

function carregarErrosCategorizados() {
    const listaErros = JSON.parse(localStorage.getItem("erros-caxias") || "[]");
    const globalQuestao = JSON.parse(localStorage.getItem("questoes-caxias") || "[]");
    const disciplinas = ["Matemática", "Língua Portuguesa", "Noções de Informática", "Conhecimentos Locais"];
    
    disciplinas.forEach(disc => {
        const questoesDaMateria = globalQuestao.filter(q => q.disciplina === disc);
        let tAcertos = 0; let tErros = 0;
        questoesDaMateria.forEach(q => { tAcertos += q.acertos; tErros += q.erros; });
        const total = tAcertos + tErros;
        const porc = total > 0 ? Math.round((tAcertos / total) * 100) : 0;
        
        const elEstatistica = document.getElementById(`estatistica-${disc}`);
        if (elEstatistica) {
            elEstatistica.innerHTML = `
                <span>📈 Resolvidas: ${total}</span>
                <span style='color:#16a34a;'>✔️ Acertos: ${tAcertos}</span>
                <span style='color:#dc2626;'>❌ Erros: ${tErros}</span>
                <span style='background:var(--primary); color:white; padding:2px 8px; border-radius:4px;'>📊 Aproveitamento: ${porc}%</span>
            `;
        }

        const containerErros = document.getElementById(`lista-erros-${disc}`);
        if (!containerErros) return;
        
        containerErros.innerHTML = "";
        const errosFiltrados = listaErros.filter(e => e.disciplina === disc);
        
        errosFiltrados.forEach(erro => {
            const div = document.createElement("div");
            div.className = "item-salvo";
            div.style.borderLeft = "4px solid #dc2626";
            
            div.innerHTML = `
                <strong class="erro-titulo">⚠️ Tópico / Questão: ${erro.enunciado}</strong>
                <div class="texto-explicacao-erro"><strong>💡 Análise do Erro / Correção:</strong>\n${erro.motivo}</div>
                <button style='position:absolute; top:10px; right:10px; background:none; border:none; color:#dc2626; cursor:pointer; font-size:1rem;' onclick='deletarErro(${erro.id})' title='Remover Erro'>❌</button>
            `;
            containerErros.appendChild(div);
            renderizarLaTeXNoElemento(div);
        });
        
        if(errosFiltrados.length === 0) {
            containerErros.innerHTML = "<p style='color:#888; font-style:italic; font-size:0.85rem; padding: 0 10px;'>Sem anotações cadastradas nesta matéria.</p>";
        }
    });
}

window.deletarErro = async (id) => {
    if (!confirm("Remover este registro do caderno de erros?")) return;
    let listaErros = JSON.parse(localStorage.getItem("erros-caxias") || "[]");
    listaErros = listaErros.filter(e => e.id !== id);
    await salvarChave("erros-caxias", listaErros);
    carregarErrosCategorizados();
};

async function salvarMapa(e) {
    e.preventDefault();
    const novoMapa = {
        id: Date.now(),
        disciplina: document.getElementById("mapa-disciplina").value,
        titulo: document.getElementById("mapa-titulo").value,
        conteudo: document.getElementById("mapa-conteudo-editor").innerHTML,
        styleSize: document.getElementById("editor-font-size").value,
        styleColor: document.getElementById("editor-font-color").value
    };
    const listaMapas = JSON.parse(localStorage.getItem("mapas-caxias") || "[]");
    listaMapas.push(novoMapa);
    await salvarChave("mapas-caxias", listaMapas);
    document.getElementById("mapa-titulo").value = "";
    document.getElementById("mapa-conteudo-editor").innerHTML = "";
    carregarMapas();
}

function carregarMapas() {
    const disciplinas = ["Matemática", "Língua Portuguesa", "Noções de Informática", "Conhecimentos Locais"];
    const mapas = JSON.parse(localStorage.getItem("mapas-caxias") || "[]");
    
    disciplinas.forEach(disc => {
        const container = document.getElementById(`lista-mapas-${disc}`);
        if (!container) return;
        container.innerHTML = "";
        
        const mapasFiltrados = mapas.filter(m => m.disciplina === disc); 
        
        mapasFiltrados.forEach(mapa => {
            const div = document.createElement("div"); 
            div.className = "item-salvo";
            const textoPuro = mapa.conteudo.replace(/<[^>]*>/g, '').trim();
            const ehLink = textoPuro.startsWith("http://") || textoPuro.startsWith("https://");
            let exibicao = ehLink ? `<a href="${textoPuro}" target="_blank" style="color:var(--primary); font-weight:bold;">🔗 Abrir Link Externo</a>` : `<div style="font-size:${mapa.styleSize}; color:${mapa.styleColor}; white-space: pre-wrap;">${mapa.conteudo}</div>`;
            
            div.innerHTML = `
                <button type="button" style="position:absolute; top:12px; right:12px; border:none; background:none; cursor:pointer; font-size:1.1rem;" onclick="deletarMapa(${mapa.id})" title="Excluir Resumo">❌</button>
                <h3 class="mapa-titulo" style="padding-right: 30px; font-size:1.05rem; color:var(--secondary);">${mapa.titulo}</h3>
                <div style="margin-top:10px;">${exibicao}</div>
            `;
            container.appendChild(div);
            renderizarLaTeXNoElemento(div);
        });
        
        if (mapasFiltrados.length === 0) {
            container.innerHTML = "<p style='color:#888; font-style:italic; font-size:0.85rem; padding: 10px 0;'>Nenhum resumo salvo para esta disciplina.</p>";
        }
    });
}

window.deletarMapa = async (id) => {
    if (!confirm("Excluir este resumo permanentemente?")) return;
    let mapas = JSON.parse(localStorage.getItem("mapas-caxias") || "[]");
    mapas = mapas.filter(m => m.id !== id);
    await salvarChave("mapas-caxias", mapas);
    carregarMapas();
};

async function salvarPDF(e) {
    e.preventDefault();
    const novoPDF = {
        id: Date.now(),
        disciplina: document.getElementById("pdf-disciplina").value,
        titulo: document.getElementById("pdf-titulo").value,
        lido: false
    };
    const listaPDFs = JSON.parse(localStorage.getItem("pdfs-caxias") || "[]");
    listaPDFs.push(novoPDF);
    await salvarChave("pdfs-caxias", listaPDFs);
    document.getElementById("pdf-titulo").value = "";
    carregarPDFs();
}

window.carregarPDFs = () => {
    const container = document.getElementById("lista-pdfs");
    container.innerHTML = "";
    
    const pdfs = JSON.parse(localStorage.getItem("pdfs-caxias") || "[]");
    const filtro = document.getElementById("filtro-disciplina-pdf").value;
    
    const chavesDisciplinas = {
        "Matemática": { porc: "porc-card-Matemática", cont: "cont-card-Matemática" },
        "Língua Portuguesa": { porc: "porc-card-Portugues", cont: "cont-card-Portugues" },
        "Noções de Informática": { porc: "porc-card-Informatica", cont: "cont-card-Informatica" },
        "Conhecimentos Locais": { porc: "porc-card-Locais", cont: "cont-card-Locais" }
    };

    Object.keys(chavesDisciplinas).forEach(discName => {
        const mPdfs = pdfs.filter(p => p.disciplina === discName);
        const totalM = mPdfs.length;
        const lidosM = mPdfs.filter(p => p.lido).length;
        const porcM = totalM > 0 ? Math.round((lidosM / totalM) * 100) : 0;
        
        if (document.getElementById(chavesDisciplinas[discName].porc)) {
            document.getElementById(chavesDisciplinas[discName].porc).innerText = `${porcM}%`;
            document.getElementById(chavesDisciplinas[discName].cont).innerText = `${lidosM} de ${totalM} lidos`;
        }
    });

    const totalGlobal = pdfs.length;
    const lidosGlobal = pdfs.filter(p => p.lido).length;
    const porcGlobal = totalGlobal > 0 ? Math.round((lidosGlobal / totalGlobal) * 100) : 0;
    
    document.getElementById("porcentagem-global-pdf").innerText = `${porcGlobal}% (${lidosGlobal}/${totalGlobal} PDFs Concluídos)`;
    document.getElementById("barra-global-pdf-fill").style.width = `${porcGlobal}%`;

    atualizarFeedbackRitmoLeitura(totalGlobal - lidosGlobal);

    const pdfsFiltrados = pdfs.filter(p => filtro === "TODOS" || p.disciplina === filtro);

    if (pdfsFiltrados.length === 0) {
        container.innerHTML = "<p style='color:#888; font-style:italic; font-size:0.9rem; text-align:center; padding: 20px;'>Nenhum arquivo encontrado nesta seleção.</p>";
        return;
    }

    const tagsNomes = {
        "Matemática": "📐 Matemática",
        "Língua Portuguesa": "✍️ Português",
        "Noções de Informática": "💻 Informática",
        "Conhecimentos Locais": "🏛️ Caxias-MA"
    };

    pdfsFiltrados.forEach(pdf => {
        const div = document.createElement("div");
        div.className = "pdf-item";
        div.innerHTML = `
            <div class="pdf-info">
                <input type="checkbox" ${pdf.lido ? 'checked' : ''} onchange="togglePDFLeitura(${pdf.id})">
                <span class="pdf-texto ${pdf.lido ? 'lido' : ''}">
                    <span style="font-size:0.75rem; font-weight:bold; background:#e2e8f0; padding:2px 6px; border-radius:4px; margin-right:6px; color:#334155;">${tagsNomes[pdf.disciplina]}</span>
                    ${pdf.titulo}
                </span>
            </div>
            <button style='border:none; background:none; color:var(--danger); cursor:pointer; font-size:1rem;' onclick='deletarPDF(${pdf.id})' title='Remover PDF'>🗑️</button>
        `;
        container.appendChild(div);
    });
};

function atualizarFeedbackRitmoLeitura(pdfsRestantes) {
    const feedbackBox = document.getElementById("feedback-ritmo-leitura");
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const dataAlvo = new Date(DATA_PROVA); dataAlvo.setHours(0,0,0,0);
    
    const diferencaTempo = dataAlvo.getTime() - hoje.getTime();
    const diasRestantes = Math.ceil(diferencaTempo / (1000 * 60 * 60 * 24));
    
    if (pdfsRestantes <= 0) {
        feedbackBox.style.backgroundColor = "#f0fdf4";
        feedbackBox.style.color = "#16a34a";
        feedbackBox.innerHTML = `🏆 <strong>Sensacional!</strong> Todos os PDFs foram lidos. Mantenha o foco em bater baterias de questões!`;
        return;
    }
    
    if (diasRestantes <= 0) {
        feedbackBox.style.backgroundColor = "#fef2f2";
        feedbackBox.style.color = "#dc2626";
        feedbackBox.innerHTML = `🚨 Restam ${pdfsRestantes} PDFs e a data limite da prova chegou!`;
        return;
    }
    
    const ritmoNecessario = (pdfsRestantes / diasRestantes).toFixed(2);
    
    if (ritmoNecessario <= 1.0) {
        feedbackBox.style.backgroundColor = "#f0fdf4";
        feedbackBox.style.color = "#16a34a";
        feedbackBox.innerHTML = `🟢 <strong>Excelente Ritmo!</strong> Restam ${pdfsRestantes} PDFs para ${diasRestantes} dias. Você precisa de <strong>${ritmoNecessario} PDF por dia</strong>.`;
    } else {
        feedbackBox.style.backgroundColor = "#fffbe6";
        feedbackBox.style.color = "#d97706";
        feedbackBox.innerHTML = `🟡 <strong>Atenção!</strong> Restam ${pdfsRestantes} PDFs para ${diasRestantes} dias. Meta: <strong>${ritmoNecessario} PDFs por dia</strong>.`;
    }
}

window.togglePDFLeitura = async (id) => {
    let pdfs = JSON.parse(localStorage.getItem("pdfs-caxias") || "[]");
    pdfs = pdfs.map(p => {
        if (p.id === id) p.lido = !p.lido;
        return p;
    });
    await salvarChave("pdfs-caxias", pdfs);
    carregarPDFs();
};

window.deletarPDF = async (id) => {
    if (!confirm("Remover este PDF da lista?")) return;
    let pdfs = JSON.parse(localStorage.getItem("pdfs-caxias") || "[]");
    pdfs = pdfs.filter(p => p.id !== id);
    await salvarChave("pdfs-caxias", pdfs);
    carregarPDFs();
};

window.exportarDados = () => {
    const dadosBackup = {
        diario: localStorage.getItem('diario-caxias'),
        erros: localStorage.getItem('erros-caxias'),
        mapas: localStorage.getItem('mapas-caxias'),
        questoes: localStorage.getItem('questoes-caxias'),
        pdfs: localStorage.getItem('pdfs-caxias')
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dadosBackup));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "backup_estudos_caxias_ma.json");
    document.body.appendChild(downloadAnchor); downloadAnchor.click(); downloadAnchor.remove();
};

window.importarDados = (event) => {
    const arquivo = event.target.files[0]; if (!arquivo) return;
    const leitor = new FileReader();
    leitor.onload = async function(e) {
        try {
            const dados = JSON.parse(e.target.result);
            if (dados.diario) await salvarChave('diario-caxias', dados.diario);
            if (dados.erros) await salvarChave('erros-caxias', dados.erros);
            if (dados.mapas) await salvarChave('mapas-caxias', dados.mapas);
            if (dados.questoes) await salvarChave('questoes-caxias', dados.questoes);
            if (dados.pdfs) await salvarChave('pdfs-caxias', dados.pdfs);
            alert("🎯 Painel Restaurado com Sucesso para Caxias-MA!"); window.location.reload();
        } catch (erro) { alert("Erro ao carregar o arquivo de backup."); }
    };
    leitor.readAsText(arquivo);
};