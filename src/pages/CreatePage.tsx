import { useEffect, useState } from 'react';
import { Bot, ExternalLink, KeyRound, Plus, RefreshCw, Sparkles, Trash2, UserRound, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

interface Child { id: string; nickname: string; age_band: '3-5' | '6-8' | '9-12'; avatar_key: string }
type Provider = 'openai' | 'gemini' | 'local_sdxl';
interface Connection { id: string; provider: Provider; model: string; masked_hint: string; status: string }
interface Job { id: string; status: string; progress: number; artwork_id?: string; error_code?: string; error_message?: string }

const SUBJECTS = ['Sevimli aslan', 'Uzayda roket', 'Deniz kaplumbağası', 'Dinozor pikniği', 'Çiçek bahçesi', 'İtfaiye aracı'];
const PROVIDER_KEY_GUIDES = {
  gemini: {
    label: 'Google AI Studio’dan Gemini anahtarı al',
    url: 'https://aistudio.google.com/app/apikey',
  },
  openai: {
    label: 'OpenAI’dan API anahtarı al',
    url: 'https://platform.openai.com/api-keys',
  },
} as const;
const PROVIDER_LABELS: Record<Provider, string> = { openai: 'OpenAI', gemini: 'Gemini', local_sdxl: 'Bu Mac' };
const TERMINAL_JOB_STATUSES = ['completed', 'failed', 'blocked', 'cancelled'];

function jobStatusLabel(job: Job) {
  if (job.status === 'completed') return 'Boyama sayfan hazır';
  if (job.status === 'failed') return 'Üretim tamamlanamadı';
  if (job.status === 'blocked') return 'Güvenlik kontrolünde durduruldu';
  if (job.status === 'cancelled') return 'Üretim iptal edildi';
  return 'Atölye çalışıyor…';
}

function jobStatusMessage(job: Job) {
  if (job.error_message) return job.error_message;
  if (job.status === 'blocked') return 'Bu fikir çocuklara uygun güvenlik kurallarını karşılamıyor. Fikri değiştirip yeniden deneyin.';
  if (job.status === 'failed') return 'Üretim sırasında bir sorun oluştu. Bağlantıyı kontrol edip yeniden deneyin.';
  return '';
}

export function CreatePage() {
  const navigate = useNavigate();
  const [children, setChildren] = useState<Child[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState<Child['age_band']>('6-8');
  const [provider, setProvider] = useState<Provider>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [showChildForm, setShowChildForm] = useState(false);
  const [showConnectionForm, setShowConnectionForm] = useState(false);
  const [form, setForm] = useState({ childProfileId: '', providerConnectionId: '', subjectPreset: SUBJECTS[0], customIdea: '', ageBand: '6-8', difficulty: 'easy', sceneDensity: 'simple-scene', lineWeight: 'thick', orientation: 'portrait' });
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState('');
  const load = () => Promise.all([api<Child[]>('/child-profiles'), api<Connection[]>('/ai-connections')]).then(([nextChildren, nextConnections]) => {
    setChildren(nextChildren); setConnections(nextConnections);
    setForm((current) => {
      const child = nextChildren.find((item) => item.id === current.childProfileId) || nextChildren[0];
      const connection = nextConnections.find((item) => item.id === current.providerConnectionId && item.status === 'ready') || nextConnections.find((item) => item.status === 'ready');
      return { ...current, childProfileId: child?.id || '', providerConnectionId: connection?.id || '', ageBand: child?.age_band || current.ageBand };
    });
  });
  useEffect(() => { load().catch((reason) => setError(reason.message)); }, []);
  useEffect(() => {
    if (!job || TERMINAL_JOB_STATUSES.includes(job.status)) return;
    const timer = window.setInterval(() => api<Job>(`/generations/${job.id}`).then((next) => {
      setJob(next); if (next.status === 'completed' && next.artwork_id) navigate(`/color/${next.artwork_id}`);
    }).catch((reason) => setError(reason.message)), 1800);
    return () => window.clearInterval(timer);
  }, [job?.id, job?.status, navigate]);

  const addChild = async (event: React.FormEvent) => { event.preventDefault(); setError(''); try { await api('/child-profiles', { method: 'POST', body: JSON.stringify({ nickname: childName, ageBand: childAge, avatarKey: 'sun' }) }); setChildName(''); setShowChildForm(false); await load(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Profil oluşturulamadı.'); } };
  const removeChild = async (id: string) => { if (!window.confirm('Bu çocuk profili silinsin mi?')) return; try { await api(`/child-profiles/${id}`, { method: 'DELETE' }); await load(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Profil silinemedi.'); } };
  const addConnection = async (event: React.FormEvent) => { event.preventDefault(); setError(''); try { await api('/ai-connections', { method: 'POST', body: JSON.stringify({ provider, ...(provider === 'local_sdxl' ? {} : { apiKey }) }) }); setApiKey(''); setShowConnectionForm(false); await load(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Bağlantı kurulamadı.'); } };
  const testConnection = async (id: string) => { try { const result = await api<{ valid: boolean; message: string }>(`/ai-connections/${id}/test`, { method: 'POST' }); setError(result.message); await load(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Bağlantı test edilemedi.'); } };
  const removeConnection = async (id: string) => { if (!window.confirm('Bu AI bağlantısı ve şifreli anahtarı silinsin mi?')) return; try { await api(`/ai-connections/${id}`, { method: 'DELETE' }); await load(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Bağlantı silinemedi.'); } };
  const generate = async (event: React.FormEvent) => { event.preventDefault(); setError(''); setJob(null); try { const created = await api<Job>('/generations', { method: 'POST', body: JSON.stringify(form) }); setJob(created); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Üretim başlatılamadı.'); } };

  return <div className="max-w-6xl mx-auto px-6 py-9 pb-28">
    <div className="mb-8"><span className="font-display font-black text-[#705d00]">BOYAMA REÇETESİ</span><h1 className="font-display font-extrabold text-4xl md:text-5xl mt-1">Sen seç, atölye çizsin.</h1><p className="font-bold text-black/55 mt-2">Prompt yazmana gerek yok. Yaşa uygun çizgi ve detay kurallarını skill sistemi ekler.</p></div>
    {error && <div className="mb-6 bg-[#ffceca] border-2 border-black rounded-2xl p-4 font-bold">{error}</div>}
    <div className="grid lg:grid-cols-[.8fr_1.2fr] gap-7 items-start">
      <aside className="space-y-6">
        <section className="bg-[#e1f0ff] border-ink-thick rounded-3xl p-5 card-shadow"><div className="flex items-center justify-between"><h2 className="font-display font-black text-xl flex gap-2"><UserRound/>1. Çocuk profili</h2>{children.length < 5 && <button onClick={() => setShowChildForm((value) => !value)} className="w-9 h-9 bg-white border-2 border-black rounded-full grid place-items-center">{showChildForm ? <X size={17}/> : <Plus size={17}/>}</button>}</div>
          {!!children.length && <div className="mt-4 space-y-2">{children.map((child) => <div key={child.id} className={`flex border-2 border-black rounded-xl overflow-hidden ${form.childProfileId === child.id ? 'bg-[#ffd700]' : 'bg-white'}`}><button onClick={() => setForm({ ...form, childProfileId: child.id, ageBand: child.age_band })} className="flex-1 text-left px-4 py-3 font-bold">{child.nickname} · {child.age_band} yaş</button><button onClick={() => removeChild(child.id)} title="Profili sil" className="px-3 border-l-2 border-black bg-[#ffceca]"><Trash2 size={16}/></button></div>)}</div>}
          {(!children.length || showChildForm) && <form onSubmit={addChild} className="mt-4 space-y-3"><input required placeholder="Takma ad" value={childName} onChange={(e) => setChildName(e.target.value)} className="w-full border-2 border-black rounded-xl px-3 py-2.5"/><select value={childAge} onChange={(e) => setChildAge(e.target.value as Child['age_band'])} className="w-full border-2 border-black rounded-xl px-3 py-2.5 bg-white"><option>3-5</option><option>6-8</option><option>9-12</option></select><button className="w-full bg-white border-2 border-black rounded-full py-2.5 font-black flex justify-center gap-2"><Plus/>Profil oluştur</button></form>}
        </section>
        <section className="bg-[#e6e0ff] border-ink-thick rounded-3xl p-5 card-shadow"><div className="flex items-center justify-between"><h2 className="font-display font-black text-xl flex gap-2"><KeyRound/>2. Yapay zekân</h2><button onClick={() => setShowConnectionForm((value) => !value)} className="w-9 h-9 bg-white border-2 border-black rounded-full grid place-items-center">{showConnectionForm ? <X size={17}/> : <Plus size={17}/>}</button></div>
          {!!connections.length && <div className="mt-4 space-y-2">{connections.map((connection) => <div key={connection.id} className={`flex border-2 border-black rounded-xl overflow-hidden ${form.providerConnectionId === connection.id ? 'bg-[#ffd700]' : 'bg-white'}`}><button disabled={connection.status !== 'ready'} onClick={() => setForm({ ...form, providerConnectionId: connection.id })} className="flex-1 text-left px-4 py-3 font-bold disabled:opacity-40">{PROVIDER_LABELS[connection.provider]} {connection.masked_hint}<span className="block text-xs opacity-60">{connection.status === 'ready' ? 'Hazır' : 'Bağlantıyı kontrol et'}</span></button><button onClick={() => testConnection(connection.id)} title="Bağlantıyı test et" className="px-3 border-l-2 border-black bg-[#dff3e4]"><RefreshCw size={16}/></button><button onClick={() => removeConnection(connection.id)} title="Bağlantıyı sil" className="px-3 border-l-2 border-black bg-[#ffceca]"><Trash2 size={16}/></button></div>)}</div>}
          {(!connections.length || showConnectionForm) && <form onSubmit={addConnection} className="mt-4 space-y-3">
            <div className="grid grid-cols-3 gap-2">{(['gemini','openai','local_sdxl'] as const).map((item) => <button type="button" key={item} onClick={() => setProvider(item)} className={`border-2 border-black rounded-xl py-2 px-1 font-black text-sm ${provider === item ? 'bg-[#ffd700]' : 'bg-white'}`}>{PROVIDER_LABELS[item]}</button>)}</div>
            {provider !== 'local_sdxl' && <a
              href={PROVIDER_KEY_GUIDES[provider].url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between gap-2 rounded-xl border-2 border-dashed border-black bg-white/70 px-3 py-2.5 text-sm font-black hover:bg-white"
            >
              <span>{PROVIDER_KEY_GUIDES[provider].label}</span>
              <ExternalLink size={17} aria-hidden="true" className="shrink-0"/>
            </a>}
            {provider === 'local_sdxl' ? <p className="rounded-xl border-2 border-black bg-white/70 p-3 text-sm font-bold">SDXL-Lightning ve ColoringBook LoRA bu Mac üzerinde çalışır. API anahtarı ve üretim ücreti gerekmez.</p> : <><input type="password" required placeholder="API anahtarı" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="w-full border-2 border-black rounded-xl px-3 py-2.5"/><p className="text-xs font-bold opacity-60">Anahtar şifrelenir ve tekrar gösterilmez.</p></>}
            <button className="w-full bg-white border-2 border-black rounded-full py-2.5 font-black">{provider === 'local_sdxl' ? 'Bu Mac’e bağlan' : 'Bağla ve doğrula'}</button>
          </form>}
        </section>
      </aside>
      <form onSubmit={generate} className="bg-white border-ink-thick rounded-[32px] p-6 md:p-8 shadow-[8px_8px_0_0_#000] space-y-7">
        <div><h2 className="font-display font-black text-2xl flex gap-2"><Bot/>3. Sahneyi kur</h2><div className="grid sm:grid-cols-2 gap-3 mt-4">{SUBJECTS.map((subject) => <button type="button" key={subject} onClick={() => setForm({ ...form, subjectPreset: subject })} className={`border-2 border-black rounded-2xl p-4 text-left font-display font-black ${form.subjectPreset === subject ? 'bg-[#ffd700] shadow-[3px_3px_0_0_#000]' : 'bg-[#f7f9ff]'}`}>{subject}</button>)}</div></div>
        <label className="block font-black">Eklemek istediğin bir şey var mı?<textarea maxLength={240} value={form.customIdea} onChange={(e) => setForm({ ...form, customIdea: e.target.value })} placeholder="Örn. yanında üç büyük çiçek olsun" className="mt-2 w-full min-h-24 border-2 border-black rounded-2xl p-4 font-medium"/><span className="float-right text-xs opacity-50">{form.customIdea.length}/240</span></label>
        <div className="grid sm:grid-cols-2 gap-4">{[
          ['Zorluk','difficulty',[['easy','Kolay'],['medium','Orta'],['detailed','Detaylı']]],
          ['Sahne','sceneDensity',[['single','Tek karakter'],['simple-scene','Basit sahne'],['full-scene','Dolu sahne']]],
          ['Çizgi','lineWeight',[['thick','Kalın'],['medium','Orta']]],
          ['Sayfa','orientation',[['portrait','Dikey'],['landscape','Yatay']]],
        ].map(([label, key, options]) => <label key={String(key)} className="font-black text-sm">{String(label)}<select value={String(form[key as keyof typeof form])} onChange={(e) => setForm({ ...form, [String(key)]: e.target.value })} className="mt-1 w-full bg-white border-2 border-black rounded-xl px-3 py-3">{(options as string[][]).map(([value,text]) => <option key={value} value={value}>{text}</option>)}</select></label>)}</div>
        {job ? <div className={`${TERMINAL_JOB_STATUSES.includes(job.status) && job.status !== 'completed' ? 'bg-[#ffceca]' : 'bg-[#dff3e4]'} border-2 border-black rounded-2xl p-5`}>
          <div className="flex justify-between font-display font-black"><span>{jobStatusLabel(job)}</span><span>%{job.progress}</span></div>
          <div className="mt-3 h-4 bg-white border-2 border-black rounded-full overflow-hidden"><div className={`h-full transition-all ${TERMINAL_JOB_STATUSES.includes(job.status) && job.status !== 'completed' ? 'bg-[#ef4444]' : 'bg-[#22c55e]'}`} style={{ width: `${job.progress}%` }}/></div>
          {jobStatusMessage(job) && <p className="mt-3 text-sm font-bold text-[#82111d]">{jobStatusMessage(job)}</p>}
          {TERMINAL_JOB_STATUSES.includes(job.status) && job.status !== 'completed' && <button type="button" onClick={() => setJob(null)} className="mt-4 w-full bg-white border-2 border-black rounded-full py-2.5 font-black">Fikri değiştir ve yeniden dene</button>}
        </div> : <button disabled={!form.childProfileId || !form.providerConnectionId} className="w-full bg-[#001e30] text-white border-2 border-black rounded-full py-4 font-display font-black text-lg flex justify-center items-center gap-2 disabled:opacity-35"><Sparkles className="text-[#ffd700]"/>Boyama sayfasını üret</button>}
      </form>
    </div>
  </div>;
}
