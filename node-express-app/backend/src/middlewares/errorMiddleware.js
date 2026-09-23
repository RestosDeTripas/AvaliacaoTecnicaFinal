module.exports = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Erro interno do servidor.';

    if (statusCode >= 500) {
        console.error('[ERROR]', message);
    }

    res.status(statusCode).json({
        error: message
    });
};
