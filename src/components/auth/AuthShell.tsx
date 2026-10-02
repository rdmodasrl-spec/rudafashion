import React from 'react';
import { Eye, EyeOff, Globe2, type LucideIcon } from 'lucide-react';
import { useB2B } from '../../context/B2BContext';
import { isLanguage, LANGUAGE_OPTIONS } from '../../i18n/translations';

type AuthShellProps = {
  title: string;
  subtitle?: string;
  logoSrc?: string;
  children: React.ReactNode;
};

export const AuthLanguageSelector: React.FC = () => {
  const { languagePreference, setLang, setAutoLanguage, t } = useB2B();

  return (
    <label className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 text-xs font-medium text-neutral-700 shadow-sm">
      <Globe2 aria-hidden="true" className="h-3.5 w-3.5 text-neutral-500" />
      <span className="sr-only">{t('authLanguageSelect')}</span>
      <select
        aria-label={t('authLanguageSelect')}
        value={languagePreference}
        onChange={event => {
          if (event.target.value === 'auto') setAutoLanguage();
          else if (isLanguage(event.target.value)) setLang(event.target.value);
        }}
        className="cursor-pointer appearance-none bg-transparent outline-none"
      >
        <option value="auto">{t('authLanguageAuto')}</option>
        {LANGUAGE_OPTIONS.map(language => <option key={language.code} value={language.code}>{language.nativeName}</option>)}
      </select>
    </label>
  );
};

export const AuthShell: React.FC<AuthShellProps> = ({ title, subtitle, logoSrc, children }) => (
  <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-8 text-neutral-950 sm:py-12">
    <div className="w-full max-w-md">
      <div className="mb-3 flex justify-end">
        <AuthLanguageSelector />
      </div>
      <header className="mb-5 text-center sm:mb-6">
        {logoSrc
          ? <img src={logoSrc} alt="RUDA" className="mx-auto mb-3 h-16 w-40 object-contain" />
          : <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-950 font-serif text-xl font-black text-white">R</div>}
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mx-auto mt-2 max-w-sm text-sm leading-5 text-neutral-600">{subtitle}</p>}
      </header>
      <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        {children}
      </section>
    </div>
  </main>
);

type AuthFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon?: LucideIcon;
};

const fieldClassName = 'w-full rounded-lg border border-neutral-300 bg-white py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 disabled:bg-neutral-100';

export const AuthField: React.FC<AuthFieldProps> = ({ label, icon: Icon, className = '', ...inputProps }) => (
  <label className="block space-y-1.5">
    <span className="block text-sm font-medium text-neutral-700">{label}</span>
    <span className="relative block">
      {Icon && <Icon aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />}
      <input {...inputProps} className={`${fieldClassName} ${Icon ? 'pl-10 pr-3' : 'px-3'} ${className}`} />
    </span>
  </label>
);

type AuthPasswordFieldProps = Omit<AuthFieldProps, 'icon' | 'type'>;

export const AuthPasswordField: React.FC<AuthPasswordFieldProps> = ({ label, className = '', ...inputProps }) => {
  const { t } = useB2B();
  const [visible, setVisible] = React.useState(false);
  return (
    <label className="block space-y-1.5">
      <span className="block text-sm font-medium text-neutral-700">{label}</span>
      <span className="relative block">
        <input {...inputProps} type={visible ? 'text' : 'password'} className={`${fieldClassName} py-3 pl-3 pr-11 ${className}`} />
        <button
          type="button"
          onClick={() => setVisible(value => !value)}
          aria-label={visible ? t('authHidePassword') : t('authShowPassword')}
          title={visible ? t('authHidePassword') : t('authShowPassword')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-950"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </span>
    </label>
  );
};

export const AuthPrimaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className = '', children, ...props }) => (
  <button {...props} className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}>
    {children}
  </button>
);

export const AuthErrorMessage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{children}</p>
);
