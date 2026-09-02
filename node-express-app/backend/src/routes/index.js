const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');
const { JWT_SECRET } = require('../config/env');

const router = express.Router();

const clean = (value, max = 255) => typeof value === 'string' ? value.trim().replace(/[<>]/g, '').slice(0, max) : '';
const auth = (req, res, next) => {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    try { req.user = jwt.verify(token, JWT_SECRET); next(); }
    catch { res.status(401).json({ error: 'Token inválido ou ausente.' }); }
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
    const tarefas = await db.all(`SELECT t.*, d.nome AS disciplina_nome, d.peso_avaliacao,
        ROUND((d.peso_avaliacao * 100.0) / MAX(1, (julianday(t.data_entrega) - julianday('now') + 1)), 2) AS prioridade
        FROM Tarefas t JOIN Disciplinas d ON d.id = t.disciplina_id
        WHERE t.usuario_id = ? ORDER BY prioridade DESC, t.data_entrega ASC`, [req.user.id]);
    res.json(tarefas);
});
router.post('/tarefas', auth, async (req, res) => {
    const titulo = clean(req.body.titulo, 150); const descricao = clean(req.body.descricao, 1000); const data = clean(req.body.data_entrega, 10); const disciplinaId = Number(req.body.disciplina_id);
    if (!titulo || !/^\d{4}-\d{2}-\d{2}$/.test(data) || !Number.isInteger(disciplinaId)) return res.status(400).json({ error: 'Título, data de entrega e disciplina são obrigatórios.' });
    const disciplina = await db.get('SELECT id FROM Disciplinas WHERE id = ? AND usuario_id = ?', [disciplinaId, req.user.id]);
    if (!disciplina) return res.status(400).json({ error: 'Disciplina inválida.' });
    const result = await db.run('INSERT INTO Tarefas (titulo, descricao, data_entrega, peso_avaliacao, status, disciplina_id, usuario_id) VALUES (?, ?, ?, (SELECT peso_avaliacao FROM Disciplinas WHERE id = ?), ?, ?, ?)', [titulo, descricao, data, disciplinaId, req.body.status === 'Concluída' ? 'Concluída' : 'Pendente', disciplinaId, req.user.id]);
    res.status(201).json(await db.get('SELECT * FROM Tarefas WHERE id = ?', [result.lastID]));
});
router.put('/tarefas/:id', auth, async (req, res) => {
    const id = Number(req.params.id); const atual = await db.get('SELECT * FROM Tarefas WHERE id = ? AND usuario_id = ?', [id, req.user.id]);
    if (!atual) return res.status(404).json({ error: 'Tarefa não encontrada.' });
    const titulo = clean(req.body.titulo ?? atual.titulo, 150); const descricao = clean(req.body.descricao ?? atual.descricao, 1000); const data = clean(req.body.data_entrega ?? atual.data_entrega, 10); const status = req.body.status === 'Concluída' || (req.body.status === undefined && atual.status === 'Pendente') ? (req.body.status === undefined ? 'Concluída' : req.body.status) : 'Pendente';
    if (!titulo || !/^\d{4}-\d{2}-\d{2}$/.test(data)) return res.status(400).json({ error: 'Dados da tarefa inválidos.' });
    await db.run('UPDATE Tarefas SET titulo = ?, descricao = ?, data_entrega = ?, status = ? WHERE id = ? AND usuario_id = ?', [titulo, descricao, data, status, id, req.user.id]);
    res.json(await db.get('SELECT * FROM Tarefas WHERE id = ?', [id]));
});
router.delete('/tarefas/:id', auth, async (req, res) => { const result = await db.run('DELETE FROM Tarefas WHERE id = ? AND usuario_id = ?', [Number(req.params.id), req.user.id]); if (!result.changes) return res.status(404).json({ error: 'Tarefa não encontrada.' }); res.status(204).send(); });

module.exports = router;