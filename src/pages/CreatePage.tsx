import { useEffect, useMemo, useState } from 'react';
import { Bot, ExternalLink, KeyRound, Plus, RefreshCw, Sparkles, Trash2, UserRound, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { useConfirm } from '../features/ui/ConfirmProvider';

interface Child { id: string; nickname: string; age_band: '3-5' | '6-8' | '9-12'; avatar_key: string }
type Provider = 'openai' | 'gemini' | 'local_sdxl' | 'fal' | 'replicate' | 'huggingface' | 'stability';
interface Connection { id: string; provider: Provider; model: string; masked_hint: string; status: string }
interface Job { id: string; status: string; progress: number; artwork_id?: string; error_code?: string; error_message?: string }

const SUBJECT_KEYS = ['lion', 'rocket', 'turtle', 'dinoPicnic', 'flowerGarden', 'fireTruck'] as const;
const PROVIDER_KEY_GUIDES = {
  gemini: {
    labelKey: 'create.providers.guides.gemini',
    url: 'https://aistudio.google.com/app/apikey',
  },
  openai: {
    labelKey: 'create.providers.guides.openai',
    url: 'https://platform.openai.com/api-keys',
  },
  fal: {
    labelKey: 'create.providers.guides.fal',
    url: 'https://fal.ai/dashboard/keys',
  },
  replicate: {
    labelKey: 'create.providers.guides.replicate',
    url: 'https://replicate.com/account/api-tokens',
  },
  huggingface: {
    labelKey: 'create.providers.guides.huggingface',
    url: 'https://huggingface.co/settings/tokens',
  },
  stability: {
    labelKey: 'create.providers.guides.stability',
    url: 'https://platform.stability.ai/account/keys',
  },
} as const;
const LOCAL_AI_ENABLED = import.meta.env.VITE_LOCAL_AI_ENABLED !== 'false';
const CLOUD_PROVIDER_OPTIONS: Provider[] = ['gemini', 'openai', 'fal', 'replicate', 'huggingface', 'stability'];
const PROVIDER_OPTIONS: Provider[] = LOCAL_AI_ENABLED ? [...CLOUD_PROVIDER_OPTIONS, 'local_sdxl'] : CLOUD_PROVIDER_OPTIONS;
const TERMINAL_JOB_STATUSES = ['completed', 'failed', 'blocked', 'cancelled'];

export function CreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [children, setChildren] = useState<Child[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState<Child['age_band']>('6-8');
  const [provider, setProvider] = useState<Provider>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [showChildForm, setShowChildForm] = useState(false);
  const [showConnectionForm, setShowConnectionForm] = useState(false);
  const [form, setForm] = useState({ childProfileId: '', providerConnectionId: '', subjectPreset: '', customIdea: '', ageBand: '6-8', difficulty: 'easy', sceneDensity: 'simple-scene', lineWeight: 'thick', orientation: 'portrait' });
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState('');

  const providerLabels: Record<Provider, string> = {
    openai: 'OpenAI',
    gemini: 'Gemini',
    fal: 'fal.ai',
    replicate: 'Replicate',
    huggingface: 'Hugging Face',
    stability: 'Stability AI',
    local_sdxl: t('create.providers.localSdxlLabel'),
  };

  const subjects = useMemo(() => SUBJECT_KEYS.map((key) => t(`create.subjects.${key}`)), [t]);

  const jobStatusLabel = (nextJob: Job) => {
    if (nextJob.status === 'completed') return t('create.jobs.completed');
    if (nextJob.status === 'failed') return t('create.jobs.failed');
    if (nextJob.status === 'blocked') return t('create.jobs.blocked');
    if (nextJob.status === 'cancelled') return t('create.jobs.cancelled');
    return t('create.jobs.running');
  };

  const jobStatusMessage = (nextJob: Job) => {
    if (nextJob.error_message) return nextJob.error_message;
    if (nextJob.status === 'blocked') return t('create.jobs.blockedMessage');
    if (nextJob.status === 'failed') return t('create.jobs.failedMessage');
    return '';
  };

  const load = () => Promise.all([api<Child[]>('/child-profiles'), api<Connection[]>('/ai-connections')]).then(([nextChildren, nextConnections]) => {
    const availableConnections = LOCAL_AI_ENABLED ? nextConnections : nextConnections.filter((item) => item.provider !== 'local_sdxl');
    setChildren(nextChildren);
    setConnections(nextConnections);
    setForm((current) => {
      const child = nextChildren.find((item) => item.id === current.childProfileId) || nextChildren[0];
      const connection = availableConnections.find((item) => item.id === current.providerConnectionId && item.status === 'ready') || availableConnections.find((item) => item.status === 'ready');
      return { ...current, childProfileId: child?.id || '', providerConnectionId: connection?.id || '', ageBand: child?.age_band || current.ageBand };
    });
  });

  useEffect(() => {
    load().catch((reason) => setError(reason.message));
  }, []);

  useEffect(() => {
    if (!job || TERMINAL_JOB_STATUSES.includes(job.status)) return;
    const timer = window.setInterval(() => api<Job>(`/generations/${job.id}`).then((next) => {
      setJob(next);
      if (next.status === 'completed' && next.artwork_id) navigate(`/color/${next.artwork_id}`);
    }).catch((reason) => setError(reason.message)), 1800);
    return () => window.clearInterval(timer);
  }, [job?.id, job?.status, navigate]);

  const addChild = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      await api('/child-profiles', { method: 'POST', body: JSON.stringify({ nickname: childName, ageBand: childAge, avatarKey: 'sun' }) });
      setChildName('');
      setShowChildForm(false);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('create.errors.createProfile'));
    }
  };

  const removeChild = async (id: string) => {
    if (!(await confirm({ message: t('create.prompts.deleteChild'), confirmLabel: t('create.actions.deleteProfile'), danger: true }))) return;
    try {
      await api(`/child-profiles/${id}`, { method: 'DELETE' });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('create.errors.deleteProfile'));
    }
  };

  const addConnection = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      await api('/ai-connections', { method: 'POST', body: JSON.stringify({ provider, ...(provider === 'local_sdxl' ? {} : { apiKey }) }) });
      setApiKey('');
      setShowConnectionForm(false);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('create.errors.connectAi'));
    }
  };

  const testConnection = async (id: string) => {
    try {
      const result = await api<{ valid: boolean; message: string }>(`/ai-connections/${id}/test`, { method: 'POST' });
      setError(result.message);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('create.errors.testConnection'));
    }
  };

  const removeConnection = async (id: string) => {
    if (!(await confirm({ message: t('create.prompts.deleteConnection'), confirmLabel: t('create.actions.deleteConnection'), danger: true }))) return;
    try {
      await api(`/ai-connections/${id}`, { method: 'DELETE' });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('create.errors.deleteConnection'));
    }
  };

  const generate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setJob(null);
    try {
      const created = await api<Job>('/generations', { method: 'POST', body: JSON.stringify(form) });
      setJob(created);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('create.errors.generateFailed'));
    }
  };
  const visibleConnections = LOCAL_AI_ENABLED ? connections : connections.filter((connection) => connection.provider !== 'local_sdxl');

  return <div className="max-w-6xl mx-auto px-6 py-9 pb-28">
    <div className="mb-8"><span className="font-display font-black text-[#705d00]">{t('create.kicker')}</span><h1 className="font-display font-extrabold text-4xl md:text-5xl mt-1">{t('create.title')}</h1><p className="font-bold text-black/55 mt-2">{t('create.subtitle')}</p></div>
    {error && <div className="mb-6 bg-[#ffceca] border-2 border-black rounded-2xl p-4 font-bold">{error}</div>}
    <div className="grid lg:grid-cols-[.8fr_1.2fr] gap-7 items-start">
      <aside className="space-y-6">
        <section className="bg-[#e1f0ff] border-ink-thick rounded-3xl p-5 card-shadow"><div className="flex items-center justify-between"><h2 className="font-display font-black text-xl flex gap-2"><UserRound />{t('create.sections.child')}</h2>{children.length < 5 && <button onClick={() => setShowChildForm((value) => !value)} className="w-9 h-9 bg-white border-2 border-black rounded-full grid place-items-center">{showChildForm ? <X size={17} /> : <Plus size={17} />}</button>}</div>
          {!!children.length && <div className="mt-4 space-y-2">{children.map((child) => <div key={child.id} className={`flex border-2 border-black rounded-xl overflow-hidden ${form.childProfileId === child.id ? 'bg-[#ffd700]' : 'bg-white'}`}><button onClick={() => setForm({ ...form, childProfileId: child.id, ageBand: child.age_band })} className="flex-1 text-left px-4 py-3 font-bold">{child.nickname} · {t('create.ageBandLabel', { age: child.age_band })}</button><button onClick={() => removeChild(child.id)} title={t('create.actions.deleteProfile')} className="px-3 border-l-2 border-black bg-[#ffceca]"><Trash2 size={16} /></button></div>)}</div>}
          {(!children.length || showChildForm) && <form onSubmit={addChild} className="mt-4 space-y-3"><input required placeholder={t('create.fields.nicknamePlaceholder')} value={childName} onChange={(event) => setChildName(event.target.value)} className="w-full border-2 border-black rounded-xl px-3 py-2.5" /><select value={childAge} onChange={(event) => setChildAge(event.target.value as Child['age_band'])} className="w-full border-2 border-black rounded-xl px-3 py-2.5 bg-white"><option>3-5</option><option>6-8</option><option>9-12</option></select><button className="w-full bg-white border-2 border-black rounded-full py-2.5 font-black flex justify-center gap-2"><Plus />{t('create.actions.createProfile')}</button></form>}
        </section>
        <section className="bg-[#e6e0ff] border-ink-thick rounded-3xl p-5 card-shadow"><div className="flex items-center justify-between"><h2 className="font-display font-black text-xl flex gap-2"><KeyRound />{t('create.sections.ai')}</h2><button onClick={() => setShowConnectionForm((value) => !value)} className="w-9 h-9 bg-white border-2 border-black rounded-full grid place-items-center">{showConnectionForm ? <X size={17} /> : <Plus size={17} />}</button></div>
          {!!visibleConnections.length && <div className="mt-4 space-y-2">{visibleConnections.map((connection) => <div key={connection.id} className={`flex border-2 border-black rounded-xl overflow-hidden ${form.providerConnectionId === connection.id ? 'bg-[#ffd700]' : 'bg-white'}`}><button disabled={connection.status !== 'ready'} onClick={() => setForm({ ...form, providerConnectionId: connection.id })} className="flex-1 text-left px-4 py-3 font-bold disabled:opacity-40">{providerLabels[connection.provider]} {connection.masked_hint}<span className="block text-xs opacity-60">{connection.status === 'ready' ? t('create.connection.ready') : t('create.connection.check')}</span></button><button onClick={() => testConnection(connection.id)} title={t('create.actions.testConnection')} className="px-3 border-l-2 border-black bg-[#dff3e4]"><RefreshCw size={16} /></button><button onClick={() => removeConnection(connection.id)} title={t('create.actions.deleteConnection')} className="px-3 border-l-2 border-black bg-[#ffceca]"><Trash2 size={16} /></button></div>)}</div>}
          {(!visibleConnections.length || showConnectionForm) && <form onSubmit={addConnection} className="mt-4 space-y-3">
            <div className={`grid ${LOCAL_AI_ENABLED ? 'grid-cols-3' : 'grid-cols-2'} gap-2`}>{PROVIDER_OPTIONS.map((item) => <button type="button" key={item} onClick={() => setProvider(item)} className={`border-2 border-black rounded-xl py-2 px-1 font-black text-sm ${provider === item ? 'bg-[#ffd700]' : 'bg-white'}`}>{providerLabels[item]}</button>)}</div>
            {provider !== 'local_sdxl' && <a href={PROVIDER_KEY_GUIDES[provider].url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-2 rounded-xl border-2 border-dashed border-black bg-white/70 px-3 py-2.5 text-sm font-black hover:bg-white"><span>{t(PROVIDER_KEY_GUIDES[provider].labelKey)}</span><ExternalLink size={17} aria-hidden="true" className="shrink-0" /></a>}
            {provider !== 'local_sdxl' && <p className="rounded-xl border-2 border-black bg-[#ffe1dc] p-3 text-xs font-bold">{t('create.providers.billingRequiredHint')}</p>}
            {provider === 'local_sdxl' ? <p className="rounded-xl border-2 border-black bg-white/70 p-3 text-sm font-bold">{t('create.providers.localSdxlHint')}</p> : <><input type="password" required placeholder={t('create.fields.apiKeyPlaceholder')} value={apiKey} onChange={(event) => setApiKey(event.target.value)} className="w-full border-2 border-black rounded-xl px-3 py-2.5" /><p className="text-xs font-bold opacity-60">{t('create.providers.apiKeySecure')}</p></>}
            <button className="w-full bg-white border-2 border-black rounded-full py-2.5 font-black">{provider === 'local_sdxl' ? t('create.actions.connectLocal') : t('create.actions.connectAndVerify')}</button>
          </form>}
        </section>
      </aside>
      <form onSubmit={generate} className="bg-white border-ink-thick rounded-[32px] p-6 md:p-8 shadow-[8px_8px_0_0_#000] space-y-7">
        <div><h2 className="font-display font-black text-2xl flex gap-2"><Bot />{t('create.sections.scene')}</h2>
          <label className="block font-black mt-4">{t('create.fields.subjectLabel')}<textarea required maxLength={80} value={form.subjectPreset} onChange={(event) => setForm({ ...form, subjectPreset: event.target.value })} placeholder={t('create.fields.subjectPlaceholder')} className="mt-2 w-full min-h-16 border-2 border-black rounded-2xl p-4 font-medium" /></label>
          <p className="mt-3 text-xs font-black opacity-60">{t('create.fields.subjectExamplesLabel')}</p>
          <div className="flex flex-wrap gap-2 mt-2">{subjects.map((subject) => <button type="button" key={subject} onClick={() => setForm({ ...form, subjectPreset: subject })} className="border-2 border-black rounded-full px-3 py-1.5 text-sm font-bold bg-[#f7f9ff] hover:bg-[#ffd700]">{subject}</button>)}</div>
        </div>
        <label className="block font-black">{t('create.fields.customIdeaLabel')}<textarea maxLength={240} value={form.customIdea} onChange={(event) => setForm({ ...form, customIdea: event.target.value })} placeholder={t('create.fields.customIdeaPlaceholder')} className="mt-2 w-full min-h-24 border-2 border-black rounded-2xl p-4 font-medium" /><span className="float-right text-xs opacity-50">{form.customIdea.length}/240</span></label>
        <div className="grid sm:grid-cols-2 gap-4">{[
          ['create.fields.difficulty', 'difficulty', [['easy', 'create.options.easy'], ['medium', 'create.options.medium'], ['detailed', 'create.options.detailed']]],
          ['create.fields.sceneDensity', 'sceneDensity', [['single', 'create.options.single'], ['simple-scene', 'create.options.simpleScene'], ['full-scene', 'create.options.fullScene']]],
          ['create.fields.lineWeight', 'lineWeight', [['thick', 'create.options.thick'], ['medium', 'create.options.mediumWeight']]],
          ['create.fields.orientation', 'orientation', [['portrait', 'create.options.portrait'], ['landscape', 'create.options.landscape']]],
        ].map(([label, key, options]) => <label key={String(key)} className="font-black text-sm">{t(String(label))}<select value={String(form[key as keyof typeof form])} onChange={(event) => setForm({ ...form, [String(key)]: event.target.value })} className="mt-1 w-full bg-white border-2 border-black rounded-xl px-3 py-3">{(options as string[][]).map(([value, textKey]) => <option key={value} value={value}>{t(textKey)}</option>)}</select></label>)}</div>
        {job ? <div className={`${TERMINAL_JOB_STATUSES.includes(job.status) && job.status !== 'completed' ? 'bg-[#ffceca]' : 'bg-[#dff3e4]'} border-2 border-black rounded-2xl p-5`}>
          <div className="flex justify-between font-display font-black"><span>{jobStatusLabel(job)}</span><span>%{job.progress}</span></div>
          <div className="mt-3 h-4 bg-white border-2 border-black rounded-full overflow-hidden"><div className={`h-full transition-all ${TERMINAL_JOB_STATUSES.includes(job.status) && job.status !== 'completed' ? 'bg-[#ef4444]' : 'bg-[#22c55e]'}`} style={{ width: `${job.progress}%` }} /></div>
          {jobStatusMessage(job) && <p className="mt-3 text-sm font-bold text-[#82111d]">{jobStatusMessage(job)}</p>}
          {TERMINAL_JOB_STATUSES.includes(job.status) && job.status !== 'completed' && <button type="button" onClick={() => setJob(null)} className="mt-4 w-full bg-white border-2 border-black rounded-full py-2.5 font-black">{t('create.actions.retry')}</button>}
        </div> : <button disabled={!form.childProfileId || !form.providerConnectionId || !form.subjectPreset.trim()} className="w-full bg-[#001e30] text-white border-2 border-black rounded-full py-4 font-display font-black text-lg flex justify-center items-center gap-2 disabled:opacity-35"><Sparkles className="text-[#ffd700]" />{t('create.actions.generate')}</button>}
      </form>
    </div>
  </div>;
}
