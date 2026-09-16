function validarData(data) {
    if (typeof data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        throw new Error('Data inválida');
    }

    const [ano, mes, dia] = data.split('-').map(Number);
    const dataValida = new Date(Date.UTC(ano, mes - 1, dia, 12));

    if (
        Number.isNaN(dataValida.getTime()) ||
        dataValida.getUTCFullYear() !== ano ||
        dataValida.getUTCMonth() !== mes - 1 ||
        dataValida.getUTCDate() !== dia
    ) {
        throw new Error('Data inválida');
    }

    return dataValida;
}

function validarPeso(peso) {
    const valor = Number(peso);

    if (!Number.isInteger(valor) || valor < 1 || valor > 5) {
        throw new Error('Peso inválido');
    }

    return valor;
}

function calcularPrioridade(data, peso) {
    const pesoValido = validarPeso(peso);
    const dataValida = validarData(data);

    const hoje = new Date();
    const hojeUtc = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate()));
    const diferencaEmDias = Math.ceil((dataValida.getTime() - hojeUtc.getTime()) / 86400000);
    const diasRestantes = Math.max(0, diferencaEmDias);

    // O peso reforça a importância da tarefa e a data reduz a prioridade conforme o prazo aumenta.
    const prioridade = (pesoValido * 100) / (diasRestantes + 1);

    return Number(prioridade.toFixed(2));
}

function ordenarTarefasPorPrioridade(tarefas) {
    return [...tarefas].sort((primeira, segunda) => {
        const prioridadePrimeira = primeira.status === 'Concluída'
            ? 0
            : calcularPrioridade(primeira.data_entrega || primeira.data, primeira.peso_avaliacao ?? primeira.peso);
        const prioridadeSegunda = segunda.status === 'Concluída'
            ? 0
            : calcularPrioridade(segunda.data_entrega || segunda.data, segunda.peso_avaliacao ?? segunda.peso);

        return prioridadeSegunda - prioridadePrimeira || (primeira.data_entrega || '').localeCompare(segunda.data_entrega || '');
    });
}

module.exports = {
    validarData,
    validarPeso,
    calcularPrioridade,
    ordenarTarefasPorPrioridade
};
