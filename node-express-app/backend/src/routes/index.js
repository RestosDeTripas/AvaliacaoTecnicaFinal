const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');
const { JWT_SECRET } = require('../config/env');
const { calcularPrioridade, validarData, validarPeso } = require('../prioridade');

const router = express.Router();

const clean = (value, max = 255) => typeof value === 'string' ? value.trim().replace(/[<>]/g, '').slice(0, max) : '';
const auth = (req, res, next) => {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    try { req.user = jwt.verify(token, JWT_SECRET); next(); }
    catch { res.status(401).json({ error: 'Token inválido ou ausente.' }); }
};

const incluirPrioridade = (tarefa) => {
    if (!tarefa) return tarefa;
    const prioridade = tarefa.status === 'Concluída' ? 0 : calcularPrioridade(tarefa.data_entrega, tarefa.peso_avaliacao);
    return { ...tarefa, prioridade };
};

router.get('/health', (req, res) => {
    res.json({ status: 'OK' });
});

router.post('/auth/register', async (req, res) => {
    const nome = clean(req.body.nome, 80);
    const email = clean(req.body.email, 160).toLowerCase();
    const senha = typeof req.body.senha === 'string' ? req.body.senha : '';
    if (!nome || !/^\S+@\S+\.\S+$/.test(email) || senha.length < 6) return res.status(400).json({ error: 'Nome, email válido e senha com ao menos 6 caracteres são obrigatórios.' });
    try {
        const result = await db.run('INSERT INTO Usuarios (nome, email, senha) VALUES (?, ?, ?)', [nome, email, await bcrypt.hash(senha, 10)]);
        res.status(201).json({ token: jwt.sign({ id: result.lastID, nome }, JWT_SECRET), usuario: { id: result.lastID, nome, email } });
    } catch (error) { res.status(error.code === 'SQLITE_CONSTRAINT' ? 409 : 500).json({ error: error.code === 'SQLITE_CONSTRAINT' ? 'Email já cadastrado.' : 'Erro ao cadastrar usuário.' }); }
});

router.post('/auth/login', async (req, res) => {
    const email = clean(req.body.email, 160).toLowerCase();
    const usuario = await db.get('SELECT * FROM Usuarios WHERE email = ?', [email]);
    if (!usuario || !(await bcrypt.compare(req.body.senha || '', usuario.senha))) return res.status(401).json({ error: 'Email ou senha inválidos.' });
    res.json({ token: jwt.sign({ id: usuario.id, nome: usuario.nome }, JWT_SECRET), usuario: { id: usuario.id, nome: usuario.nome, email } });
});

router.get('/disciplinas', auth, async (req, res) => res.json(await db.all('SELECT * FROM Disciplinas WHERE usuario_id = ? ORDER BY nome', [req.user.id])));
router.post('/disciplinas', auth, async (req, res) => {
    const nome = clean(req.body.nome, 100); const peso = Number(req.body.peso_avaliacao);
    if (!nome || !Number.isInteger(peso) || peso < 1 || peso > 5) return res.status(400).json({ error: 'Nome e peso entre 1 e 5 são obrigatórios.' });
    try { const result = await db.run('INSERT INTO Disciplinas (nome, peso_avaliacao, usuario_id) VALUES (?, ?, ?)', [nome, peso, req.user.id]); res.status(201).json(await db.get('SELECT * FROM Disciplinas WHERE id = ?', [result.lastID])); }
    catch { res.status(500).json({ error: 'Erro ao criar disciplina.' }); }
});

router.get('/tarefas', auth, async (req, res) => {
    try {
        const tarefas = await db.all(`SELECT t.*, d.nome AS disciplina_nome
            FROM Tarefas t
            JOIN Disciplinas d ON d.id = t.disciplina_id
            WHERE t.usuario_id = ?`, [req.user.id]);

        const tarefasComPrioridade = tarefas
            .map(incluirPrioridade)
            .sort((a, b) => (b.prioridade - a.prioridade) || a.data_entrega.localeCompare(b.data_entrega));

        res.json(tarefasComPrioridade);
    } catch (error) {
        res.status(400).json({ error: error.message || 'Não foi possível carregar as tarefas.' });
    }
});

router.post('/tarefas', auth, async (req, res) => {
    try {
        const titulo = clean(req.body.titulo, 150);
        const descricao = clean(req.body.descricao, 1000);
        const data = clean(req.body.data_entrega ?? req.body.data, 10);
        const peso = Number(req.body.peso_avaliacao ?? req.body.peso);
        const disciplinaId = Number(req.body.disciplina_id);

        if (!titulo) return res.status(400).json({ error: 'Título é obrigatório.' });
        validarData(data);
        const pesoValido = validarPeso(peso);

        if (!Number.isInteger(disciplinaId)) return res.status(400).json({ error: 'Disciplina inválida.' });

        const disciplina = await db.get('SELECT id FROM Disciplinas WHERE id = ? AND usuario_id = ?', [disciplinaId, req.user.id]);
        if (!disciplina) return res.status(400).json({ error: 'Disciplina inválida.' });

        const status = req.body.status === 'Concluída' ? 'Concluída' : 'Pendente';
        const result = await db.run(
            'INSERT INTO Tarefas (titulo, descricao, data_entrega, peso_avaliacao, status, disciplina_id, usuario_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [titulo, descricao, data, pesoValido, status, disciplinaId, req.user.id]
        );

        const tarefaCriada = await db.get('SELECT * FROM Tarefas WHERE id = ?', [result.lastID]);
        res.status(201).json(incluirPrioridade(tarefaCriada));
    } catch (error) {
        res.status(400).json({ error: error.message || 'Erro ao criar tarefa.' });
    }
});

router.put('/tarefas/:id', auth, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const atual = await db.get('SELECT * FROM Tarefas WHERE id = ? AND usuario_id = ?', [id, req.user.id]);
        if (!atual) return res.status(404).json({ error: 'Tarefa não encontrada.' });

        const titulo = clean(req.body.titulo ?? atual.titulo, 150);
        const descricao = clean(req.body.descricao ?? atual.descricao, 1000);
        const data = clean(req.body.data_entrega ?? req.body.data ?? atual.data_entrega, 10);
        const peso = Number(req.body.peso_avaliacao ?? req.body.peso ?? atual.peso_avaliacao);
        const disciplinaId = Number(req.body.disciplina_id ?? atual.disciplina_id);
        const status = req.body.status === 'Concluída' ? 'Concluída' : req.body.status === 'Pendente' ? 'Pendente' : atual.status;

        if (!titulo) return res.status(400).json({ error: 'Título é obrigatório.' });
        validarData(data);
        const pesoValido = validarPeso(peso);

        if (!Number.isInteger(disciplinaId)) return res.status(400).json({ error: 'Disciplina inválida.' });
        const disciplina = await db.get('SELECT id FROM Disciplinas WHERE id = ? AND usuario_id = ?', [disciplinaId, req.user.id]);
        if (!disciplina) return res.status(400).json({ error: 'Disciplina inválida.' });

        await db.run(
            'UPDATE Tarefas SET titulo = ?, descricao = ?, data_entrega = ?, peso_avaliacao = ?, status = ?, disciplina_id = ? WHERE id = ? AND usuario_id = ?',
            [titulo, descricao, data, pesoValido, status, disciplinaId, id, req.user.id]
        );

        const tarefaAtualizada = await db.get('SELECT * FROM Tarefas WHERE id = ?', [id]);
        res.json(incluirPrioridade(tarefaAtualizada));
    } catch (error) {
        res.status(400).json({ error: error.message || 'Erro ao atualizar tarefa.' });
    }
});

router.delete('/tarefas/:id', auth, async (req, res) => {
    const result = await db.run('DELETE FROM Tarefas WHERE id = ? AND usuario_id = ?', [Number(req.params.id), req.user.id]);
    if (!result.changes) return res.status(404).json({ error: 'Tarefa não encontrada.' });
    res.status(204).send();
});

module.exports = router;