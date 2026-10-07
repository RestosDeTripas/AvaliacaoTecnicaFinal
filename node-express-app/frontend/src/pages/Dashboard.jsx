import { LogOut, ShieldCheck, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl shadow-slate-200/60">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Dashboard</p>
              <h1 className="text-2xl font-bold text-slate-900">Painel</h1>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>

        <div className="rounded-2xl bg-slate-50 p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-full bg-emerald-600 p-2 text-white">
              <UserRound className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Bem-vindo</p>
              <h2 className="text-xl font-semibold text-slate-900">{user?.nome || 'Usuário'}</h2>
            </div>
          </div>

          <p className="text-slate-600">Você está autenticado e pode acessar as rotas protegidas.</p>
        </div>
      </div>
    </main>
  );
}
