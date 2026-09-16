const assert = require('node:assert/strict');
const { calcularPrioridade, ordenarTarefasPorPrioridade } = require('./prioridade');

const hoje = new Date();
const hojeISO = hoje.toISOString().slice(0, 10);
const amanha = new Date(hoje.getTime() + 86400000).toISOString().slice(0, 10);
const emDezDias = new Date(hoje.getTime() + 10 * 86400000).toISOString().slice(0, 10);
const atrasada = new Date(hoje.getTime() - 2 * 86400000).toISOString().slice(0, 10);

assert.ok(calcularPrioridade(hojeISO, 5) > calcularPrioridade(emDezDias, 5), 'Tarefa com data mais próxima deve ter maior prioridade');
assert.ok(calcularPrioridade(hojeISO, 5) > calcularPrioridade(hojeISO, 3), 'Tarefa com maior peso deve ter maior prioridade na mesma data');
assert.ok(ordenarTarefasPorPrioridade([
  { id: 1, titulo: 'Longa distância', peso: 2, data: emDezDias },
  { id: 2, titulo: 'Hoje + peso alto', peso: 5, data: hojeISO },
  { id: 3, titulo: 'Próximo prazo', peso: 4, data: amanha }
])[0].id === 2, 'Data próxima + peso alto deve ficar entre as primeiras posições');
assert.ok(ordenarTarefasPorPrioridade([
  { id: 1, titulo: 'Longe + baixo peso', peso: 2, data: emDezDias },
  { id: 2, titulo: 'Perto + baixo peso', peso: 2, data: amanha }
])[1].id === 1, 'Data distante + peso baixo deve possuir prioridade menor');
assert.ok(Number.isFinite(calcularPrioridade(atrasada, 4)), 'Tarefa atrasada deve manter cálculo estável');
assert.throws(() => calcularPrioridade('2026-02-30', 5), /Data inválida/, 'Data inválida deve lançar erro');
assert.throws(() => calcularPrioridade(hojeISO, 0), /Peso inválido/, 'Peso inválido deve lançar erro');

console.log('Testes de prioridade: OK');
