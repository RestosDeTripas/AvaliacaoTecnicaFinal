module.exports = {
    PORT: process.env.PORT || 5000,
    JWT_SECRET: process.env.JWT_SECRET || 'development-only-secret',
    DATABASE_FILE: process.env.DATABASE_FILE || './data/tarefas.sqlite'
};