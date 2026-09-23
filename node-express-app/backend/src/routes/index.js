const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');
const { JWT_SECRET } = require('../config/env');
const { calcularPrioridade, validarData, validarPeso } = require('../prioridade');

const router = express.Router();

const clean = (value, max = 255) => {
    if (typeof value !== 'string') return '';
    return value.trim().replace(/[<>]/g, '').replace(/&(?!(?:amp|lt|gt|quot|#\d+|#x[\da-f]+);)/gi, '&amp;').slice(0, max);
};

const auth = (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

    if (!token) {
        return res.status(401).json({ error: 'Token inválido ou ausente.' });
    }

    try {
        req.user = jwt.verify(token, JWT_SECRET);
        return next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido ou ausente.' });
    }
};

const incluirPrioridade = (tarefa) => {
    if (!tarefa) return tarefa;
    const prioridade = tarefa.status === 'Concluída' ? 0 : calcularPrioridade(tarefa.data_entrega, tarefa.peso_avaliacao);
    return { ...tarefa, prioridade };
};

const validarStatus = (status) => {
    const validos = ['Pendente', 'Concluída'];
    if (!validos.includes(status)) {
        const error = new Error('Status inválido. Use Pendente ou Concluída.');
        error.statusCode = 400;
        throw error;
    }
    return status;
};

const validarDisciplinaDoUsuario = async (disciplinaId, usuarioId) => {
    if (!Number.isInteger(disciplinaId)) {
        const error = new Error('Disciplina inválida.');
        error.statusCode = 400;
        throw error;
    }

    const disciplina = await db.get('SELECT id FROM Disciplinas WHERE id = ? AND usuario_id = ?', [disciplinaId, usuarioId]);
    if (!disciplina) {
        const error = new Error('Disciplina inválida.');
        error.statusCode = 400;
        throw error;
    }

    return disciplina;
};

router.get('/health', (req, res) => {
    res.json({ status: 'OK' });
});

router.post('/auth/register', async (req, res, next) => {
    try {
        const nome = clean(req.body.nome, 80);
        const email = clean(req.body.email, 160).toLowerCase();
        const senha = typeof req.body.senha === 'string' ? req.body.senha : '';

        if (!nome || !/^\S+@\S+\.\S+$/.test(email) || senha.length < 6) {
            const error = new Error('Nome, email válido e senha com ao menos 6 caracteres são obrigatórios.');
            error.statusCode = 400;
            throw error;
        }

        const result = await db.run('INSERT INTO Usuarios (nome, email, senha) VALUES (?, ?, ?)', [nome, email, await bcrypt.hash(senha, 10)]);
        res.status(201).json({ token: jwt.sign({ id: result.lastID, nome }, JWT_SECRET), usuario: { id: result.lastID, nome, email } });
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT') {
            const constrained = new Error('Email já cadastrado.');
            constrained.statusCode = 409;
            return next(constrained);
        }
        next(error);
    }
});

router.post('/auth/login', async (req, res, next) => {
    try {
        const email = clean(req.body.email, 160).toLowerCase();
        const usuario = await db.get('SELECT * FROM Usuarios WHERE email = ?', [email]);

        if (!usuario || !(await bcrypt.compare(req.body.senha || '', usuario.senha))) {
            const error = new Error('Email ou senha inválidos.');
            error.statusCode = 401;
            throw error;
        }

        res.json({ token: jwt.sign({ id: usuario.id, nome: usuario.nome }, JWT_SECRET), usuario: { id: usuario.id, nome: usuario.nome, email } });
    } catch (error) {
        next(error);
    }
});

router.get('/disciplinas', auth, async (req, res, next) => {
    try {
        const disciplinas = await db.all('SELECT * FROM Disciplinas WHERE usuario_id = ? ORDER BY nome', [req.user.id]);
        res.json(disciplinas);
    } catch (error) {
        next(error);
    }
});

router.post('/disciplinas', auth, async (req, res, next) => {
    try {
        const nome = clean(req.body.nome, 100);
        const peso = Number(req.body.peso_avaliacao);

        if (!nome) {
            const error = new Error('Nome da disciplina é obrigatório.');
            error.statusCode = 400;
            throw error;
        }

        const pesoValido = validarPeso(peso);
        const result = await db.run('INSERT INTO Disciplinas (nome, peso_avaliacao, usuario_id) VALUES (?, ?, ?)', [nome, pesoValido, req.user.id]);
        const disciplina = await db.get('SELECT * FROM Disciplinas WHERE id = ?', [result.lastID]);
        res.status(201).json(disciplina);
    } catch (error) {
        next(error);
    }
});

router.get('/tarefas', auth, async (req, res, next) => {
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
        next(error);
    }
});

router.post('/tarefas', auth, async (req, res, next) => {
    try {
        const titulo = clean(req.body.titulo, 150);
        const descricao = clean(req.body.descricao ?? '', 1000);
        const data = typeof req.body.data_entrega === 'string' ? req.body.data_entrega.trim() : '';
        const peso = Number(req.body.peso_avaliacao);
        const disciplinaId = Number(req.body.disciplina_id);

        if (!titulo) {
            const error = new Error('Título é obrigatório.');
            error.statusCode = 400;
            throw error;
        }

        validarData(data);
        const pesoValido = validarPeso(peso);
        await validarDisciplinaDoUsuario(disciplinaId, req.user.id);

        const status = validarStatus(req.body.status || 'Pendente');
        const result = await db.run(
            'INSERT INTO Tarefas (titulo, descricao, data_entrega, peso_avaliacao, status, disciplina_id, usuario_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [titulo, descricao, data, pesoValido, status, disciplinaId, req.user.id]
        );

        const tarefaCriada = await db.get('SELECT * FROM Tarefas WHERE id = ?', [result.lastID]);
        res.status(201).json(incluirPrioridade(tarefaCriada));
    } catch (error) {
        next(error);
    }
});

router.put('/tarefas/:id', auth, async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            const error = new Error('ID da tarefa inválido.');
            error.statusCode = 400;
            throw error;
        }

        const atual = await db.get('SELECT * FROM Tarefas WHERE id = ? AND usuario_id = ?', [id, req.user.id]);
        if (!atual) {
            const error = new Error('Tarefa não encontrada.');
            error.statusCode = 404;
            throw error;
        }

        const titulo = typeof req.body.titulo === 'undefined' ? atual.titulo : clean(req.body.titulo, 150);
        const descricao = typeof req.body.descricao === 'undefined' ? atual.descricao : clean(req.body.descricao, 1000);
        const data = typeof req.body.data_entrega === 'undefined' ? atual.data_entrega : (typeof req.body.data_entrega === 'string' ? req.body.data_entrega.trim() : '');
        const peso = typeof req.body.peso_avaliacao === 'undefined' ? atual.peso_avaliacao : Number(req.body.peso_avaliacao);
        const disciplinaId = typeof req.body.disciplina_id === 'undefined' ? atual.disciplina_id : Number(req.body.disciplina_id);
        const status = typeof req.body.status === 'undefined' ? atual.status : validarStatus(req.body.status);

        if (!titulo) {
            const error = new Error('Título é obrigatório.');
            error.statusCode = 400;
            throw error;
        }

        validarData(data);
        const pesoValido = validarPeso(peso);
        await validarDisciplinaDoUsuario(disciplinaId, req.user.id);

        await db.run(
            'UPDATE Tarefas SET titulo = ?, descricao = ?, data_entrega = ?, peso_avaliacao = ?, status = ?, disciplina_id = ? WHERE id = ? AND usuario_id = ?',
            [titulo, descricao, data, pesoValido, status, disciplinaId, id, req.user.id]
        );

        const tarefaAtualizada = await db.get('SELECT * FROM Tarefas WHERE id = ?', [id]);
        res.json(incluirPrioridade(tarefaAtualizada));
    } catch (error) {
        next(error);
    }
});

router.delete('/tarefas/:id', auth, async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            const error = new Error('ID da tarefa inválido.');
            error.statusCode = 400;
            throw error;
        }

        const result = await db.run('DELETE FROM Tarefas WHERE id = ? AND usuario_id = ?', [id, req.user.id]);
        if (!result.changes) {
            const error = new Error('Tarefa não encontrada.');
            error.statusCode = 404;
            throw error;
        }

        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

module.exports = router;