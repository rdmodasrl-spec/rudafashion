import React, { useState } from 'react';
import { ShieldCheck, Eye, EyeOff, Lock, User, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useB2B } from '../../context/B2BContext';
import { AuthShell } from './AuthShell';

export const AdminLogin: React.FC = () => {
  const { loginAsAdmin, adminIpWhitelistInfo, lang, localizeCopy } = useB2B();
  const ipAllowed = adminIpWhitelistInfo?.allowed !== false;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const isZh = lang === 'zh';

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const ok = await loginAsAdmin(username, password);
      if (!ok) setErr(localizeCopy("管理员账号或密码错误", "Nome utente o password non validi"));
    } catch {
      setErr(localizeCopy("登录失败", "Login failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title={localizeCopy("平台管理登录", "Accesso amministratore")} subtitle={localizeCopy("仅限授权管理员使用。", "Accesso riservato agli amministratori autorizzati.")}>
          <form onSubmit={handle} className="p-6 sm:p-8 space-y-5">
            {!ipAllowed && (
              <div className="text-xs text-red-700 bg-red-50 border-2 border-red-300 rounded-md px-3 py-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">                  {localizeCopy("⚠️ 当前网络未获授权", "⚠️ Rete non autorizzata")}</div>
                  <div className="mt-1 opacity-90">
                    {localizeCopy("当前网络地址 ", "La rete ")}
                    <span className="font-mono font-bold">{adminIpWhitelistInfo?.ip || '—'}</span>
                    {localizeCopy(" 未获管理中心授权，请联系平台管理员。", " non è autorizzata. Contatta l’amministratore.")}
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">
                {localizeCopy("管理员账号 *", "Admin Username *")}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value.trim())}
                  required
                  autoComplete="off"
                  className="w-full pl-10 pr-3 py-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">
                {localizeCopy("密码 *", "Password *")}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-10 py-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {err && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{err}</div>}

            <button
              type="submit"
              disabled={loading || !ipAllowed}
              className="w-full bg-black text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-neutral-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md"
            >
              <ShieldCheck className="w-4 h-4" />
              {loading
                ? (localizeCopy("验证中...", "Verifica in corso..."))
                : (localizeCopy("登录管理中心", "Accedi alla gestione"))}
            </button>

          </form>
    </AuthShell>
  );
};
