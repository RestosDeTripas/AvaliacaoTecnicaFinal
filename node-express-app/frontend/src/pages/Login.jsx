import { useState } from 'react';
import { ArrowRight, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated, loading } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-lg font-semibold text-slate-700">
        Carregando...
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.email.trim() || !form.password.trim()) {
      setError('Preencha e-mail e senha para continuar.');
      return;
    }

    const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
    if (!emailIsValid) {
      setError('Informe um e-mail válido.');
      return;
    }

    try {
      setSubmitting(true);
      await login(form.email.trim(), form.password);
      navigate('/dashboard', { replace: true });
    } catch (submitError) {
      setError(submitError.message || 'Não foi possível entrar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/60 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="bg-slate-900 px-8 py-10 text-white lg:px-12 lg:py-16">
          <div className="mb-8 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            App de autenticação
          </div>
          <h1 className="max-w-md text-4xl font-bold tracking-tight text-white lg:text-6xl">
            Acesse sua conta com segurança.
          </h1>
          <p className="mt-6 max-w-md text-base text-slate-300 lg:text-lg">
            Gerencie o seu acesso de forma simples, com sessão persistente e rotas protegidas.
          </p>
        </section>

        <section className="flex items-center justify-center bg-white px-6 py-10 lg:px-10">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              <LockKeyhole className="h-5 w-5 text-emerald-600" />
              Login
            </div>

            <h2 className="text-3xl font-bold text-slate-900">Bem-vindo de volta</h2>
            <p className="mt-2 text-sm text-slate-500">Entre para acessar o painel do sistema.</p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    placeholder="usuario@email.com"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">
                  Senha
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  placeholder="Sua senha"
                  autoComplete="current-password"
                />
              </div>

              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? 'Entrando...' : 'Entrar'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Ainda não tem conta?{' '}
              <Link to="/register" className="font-semibold text-emerald-600 hover:text-emerald-500">
                Criar conta
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
