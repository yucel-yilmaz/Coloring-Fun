import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Check, Code2, Eye, Pencil, Plus, RotateCcw, Save, Search, ShieldCheck, Trash2, X } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../features/auth/AuthProvider';
import { slugifyCategory } from '../features/app/categories';

type AdminTab = 'reviews' | 'catalog' | 'artworks' | 'skills';
type Category = string;
type AgeBand = '3-5' | '6-8' | '9-12';
type Difficulty = 'easy' | 'medium' | 'detailed';

interface Review { id: string; artwork: { id: string; title: string; subject: string; assets: Record<string, string> }; context?: { prompt?: string; model?: string; provider?: string; qualityScore?: number; duplicateCount?: number } }
interface SkillVersion { id: string; version: number; status: string; system_template: string; negative_template: string; change_note: string; created_at: string }
interface Skill { id: string; slug: string; name: string; active_version_id: string; ai_skill_versions: SkillVersion[] }
interface Child { id: string; nickname: string }
interface Connection { id: string; provider: string; status: string }
interface Artwork {
  id: string;
  title: string;
  subject: string;
  category: Category;
  age_band: AgeBand | null;
  difficulty: Difficulty | null;
  source: 'generated' | 'colored';
  status: string;
  created_at: string;
  assets: Record<string, string>;
}
interface CatalogPage {
  id: string;
  title: string;
  nameTr: string;
  category: Category;
  lineArtUrl: string;
}
interface NewCatalogPage {
  title: string;
  category: Category;
  lineArtUrl: string;
  imageDataUrl: string;
}

const BASE_CATEGORIES: Category[] = ['animals', 'dinos', 'vehicles', 'people', 'places', 'space'];
const STATUSES = ['all', 'private', 'submitted', 'under_review', 'published', 'changes_requested', 'rejected', 'withdrawn', 'taken_down', 'archived'];
const STATUS_LABELS: Record<string, string> = { all: 'Hepsi', private: 'Özel', submitted: 'Gönderildi', under_review: 'İncelemede', published: 'Yayında', changes_requested: 'Düzeltme', rejected: 'Reddedildi', withdrawn: 'Geri çekildi', taken_down: 'Kaldırıldı', archived: 'Arşiv' };
const DIFFICULTY_LABELS: Record<Difficulty, string> = { easy: 'Kolay', medium: 'Orta', detailed: 'Detaylı' };

function artworkDraft(item: Artwork) {
  return {
    title: item.title,
    subject: item.subject || '',
    category: item.category || 'animals',
    ageBand: item.age_band || '',
    difficulty: item.difficulty || '',
    status: item.status,
  };
}

export function AdminPage() {
  const auth = useAuth();
  const [tab, setTab] = useState<AdminTab>('reviews');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [catalogPages, setCatalogPages] = useState<CatalogPage[]>([]);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSlug, setSelectedSlug] = useState('coloring-page-generator');
  const [error, setError] = useState('');
  const [template, setTemplate] = useState('');
  const [negative, setNegative] = useState('');
  const [note, setNote] = useState('');
  const [children, setChildren] = useState<Child[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [testMessage, setTestMessage] = useState('');
  const [artworkStatus, setArtworkStatus] = useState('all');
  const [artworkSearch, setArtworkSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ReturnType<typeof artworkDraft> | null>(null);
  const [catalogEditingId, setCatalogEditingId] = useState<string | null>(null);
  const [catalogDraft, setCatalogDraft] = useState<{ title: string; category: Category } | null>(null);
  const [newCatalogPage, setNewCatalogPage] = useState<NewCatalogPage>({ title: '', category: 'animals', lineArtUrl: '', imageDataUrl: '' });
  const [newCatalogFileName, setNewCatalogFileName] = useState('');

  const isAdmin = auth.profile?.role === 'admin';
  const loadReviewsAndSkills = () => Promise.all([
    api<Review[]>('/admin/reviews'),
    isAdmin ? api<Skill[]>('/admin/skills') : Promise.resolve([]),
  ]).then(([nextReviews, nextSkills]) => {
    setReviews(nextReviews);
    setSkills(nextSkills);
  }).catch((reason) => setError(reason.message));
  const loadArtworks = () => {
    if (!isAdmin) return Promise.resolve();
    const params = new URLSearchParams({ status: artworkStatus });
    if (artworkSearch.trim()) params.set('search', artworkSearch.trim());
    return api<Artwork[]>(`/admin/artworks?${params.toString()}`).then(setArtworks).catch((reason) => setError(reason.message));
  };
  const loadCatalogPages = () => {
    if (!isAdmin) return Promise.resolve();
    return api<CatalogPage[]>('/admin/coloring-pages').then(setCatalogPages).catch((reason) => setError(reason.message));
  };

  useEffect(() => { loadReviewsAndSkills(); }, [isAdmin]);
  useEffect(() => { loadArtworks(); }, [isAdmin, artworkStatus]);
  useEffect(() => { loadCatalogPages(); }, [isAdmin]);
  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([api<Child[]>('/child-profiles'), api<Connection[]>('/ai-connections')]).then(([nextChildren, nextConnections]) => {
      setChildren(nextChildren);
      setConnections(nextConnections.filter((item) => item.status === 'ready'));
    }).catch(() => undefined);
  }, [isAdmin]);
  useEffect(() => {
    const skill = skills.find((item) => item.slug === selectedSlug);
    const active = skill?.ai_skill_versions.find((version) => version.id === skill.active_version_id);
    if (active) { setTemplate(active.system_template); setNegative(active.negative_template); setNote(''); }
  }, [selectedSlug, skills]);

  const load = async () => {
    await Promise.all([loadReviewsAndSkills(), loadArtworks(), loadCatalogPages()]);
  };
  const decide = async (review: Review, decision: 'approve' | 'reject' | 'request_changes') => {
    const reasonCode = decision === 'approve' ? undefined : window.prompt('Neden kodu', decision === 'reject' ? 'quality' : 'needs_changes') || undefined;
    const noteValue = decision === 'approve' ? undefined : window.prompt('Kullanıcıya açıklama') || undefined;
    if (decision !== 'approve' && (!reasonCode || !noteValue)) return;
    try { await api(`/admin/reviews/${review.id}/decision`, { method: 'POST', body: JSON.stringify({ decision, reasonCode, note: noteValue }) }); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Karar kaydedilemedi.'); }
  };
  const startEdit = (item: Artwork) => { setEditingId(item.id); setDraft(artworkDraft(item)); };
  const saveArtwork = async (item: Artwork) => {
    if (!draft) return;
    try {
      await api(`/admin/artworks/${item.id}`, { method: 'PATCH', body: JSON.stringify({ ...draft, category: slugifyCategory(draft.category), ageBand: draft.ageBand || null, difficulty: draft.difficulty || null }) });
      setEditingId(null);
      setDraft(null);
      await loadArtworks();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Görsel güncellenemedi.'); }
  };
  const removeArtwork = async (item: Artwork) => {
    if (!window.confirm(`“${item.title}” görseli ve dosyaları kalıcı olarak silinsin mi?`)) return;
    try { await api(`/admin/artworks/${item.id}`, { method: 'DELETE' }); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Görsel silinemedi.'); }
  };
  const startCatalogEdit = (item: CatalogPage) => {
    setCatalogEditingId(item.id);
    setCatalogDraft({ title: item.title || item.nameTr, category: item.category });
  };
  const saveCatalogPage = async (item: CatalogPage) => {
    if (!catalogDraft) return;
    try {
      await api(`/admin/coloring-pages/${item.id}`, { method: 'PATCH', body: JSON.stringify({ ...catalogDraft, category: slugifyCategory(catalogDraft.category) }) });
      setCatalogEditingId(null);
      setCatalogDraft(null);
      await loadCatalogPages();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Boyama sayfası güncellenemedi.'); }
  };
  const createCatalogPage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newCatalogPage.title.trim() || (!newCatalogPage.lineArtUrl.trim() && !newCatalogPage.imageDataUrl)) return;
    try {
      await api('/admin/coloring-pages', { method: 'POST', body: JSON.stringify({ ...newCatalogPage, title: newCatalogPage.title.trim(), category: slugifyCategory(newCatalogPage.category), lineArtUrl: newCatalogPage.lineArtUrl.trim() || undefined }) });
      setNewCatalogPage({ title: '', category: 'animals', lineArtUrl: '', imageDataUrl: '' });
      setNewCatalogFileName('');
      await loadCatalogPages();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Boyama sayfası eklenemedi.'); }
  };
  const selectCatalogFile = (file?: File) => {
    if (!file) {
      setNewCatalogPage({ ...newCatalogPage, imageDataUrl: '' });
      setNewCatalogFileName('');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setNewCatalogPage((current) => ({ ...current, imageDataUrl: String(reader.result || '') }));
      setNewCatalogFileName(file.name);
    };
    reader.readAsDataURL(file);
  };
  const removeCatalogPage = async (item: CatalogPage) => {
    if (!window.confirm(`“${item.title || item.nameTr}” Boyama Seç bölümünden silinsin mi?`)) return;
    try { await api(`/admin/coloring-pages/${item.id}`, { method: 'DELETE' }); await loadCatalogPages(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Boyama sayfası silinemedi.'); }
  };
  const saveDraft = async () => {
    try { await api(`/admin/skills/${selectedSlug}/versions`, { method: 'POST', body: JSON.stringify({ systemTemplate: template, negativeTemplate: negative, changeNote: note, qualityRules: selectedSlug === 'colorability-evaluator' ? { minimumScore: 75, maxRetries: 1 } : {}, providerOverrides: {} }) }); setNote(''); await loadReviewsAndSkills(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Sürüm kaydedilemedi.'); }
  };
  const publish = async (versionId: string, rollback = false) => {
    try { await api(`/admin/skills/${selectedSlug}/${rollback ? 'rollback' : 'publish'}`, { method: 'POST', body: JSON.stringify({ versionId }) }); await loadReviewsAndSkills(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Sürüm yayınlanamadı.'); }
  };
  const testSkill = async () => {
    setTestMessage('');
    try {
      const result = await api<{ compiledPrompt: string; jobId?: string }>(`/admin/skills/${selectedSlug}/test`, { method: 'POST', body: JSON.stringify({ template, values: { ageBand: '6-8', subject: 'Sevimli aslan', customIdea: 'üç büyük çiçek', sceneDensity: 'simple-scene', difficulty: 'easy', lineWeight: 'thick' }, providerConnectionId: connections[0]?.id, childProfileId: children[0]?.id }) });
      setTestMessage(result.jobId ? `Test üretimi kuyruğa alındı: ${result.jobId}` : `Şablon geçerli. Önizleme: ${result.compiledPrompt.slice(0, 180)}...`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Skill testi çalışmadı.'); }
  };

  const selectedSkill = skills.find((item) => item.slug === selectedSlug);
  const categoryOptions = Array.from(
    new Set([...BASE_CATEGORIES, ...catalogPages.map((page) => page.category), ...artworks.map((item) => item.category)].filter(Boolean)),
  ).sort();
  return <div className="max-w-6xl mx-auto px-6 py-9 pb-28">
    <datalist id="admin-categories">{categoryOptions.map((category) => <option key={category} value={category} />)}</datalist>
    <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 border-b-4 border-black pb-6">
      <div><span className="font-display font-black text-[#705d00] flex gap-2"><ShieldCheck/>GÜVENLİ ATÖLYE</span><h1 className="font-display font-extrabold text-4xl mt-1">Yönetim masası</h1></div>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setTab('reviews')} className={`border-2 border-black rounded-full px-5 py-2 font-black ${tab === 'reviews' ? 'bg-[#ffd700]' : 'bg-white'}`}>İnceleme ({reviews.length})</button>
        {isAdmin && <button onClick={() => setTab('catalog')} className={`border-2 border-black rounded-full px-5 py-2 font-black ${tab === 'catalog' ? 'bg-[#fff2b2]' : 'bg-white'}`}>Boyama Seç ({catalogPages.length})</button>}
        {isAdmin && <button onClick={() => setTab('artworks')} className={`border-2 border-black rounded-full px-5 py-2 font-black ${tab === 'artworks' ? 'bg-[#dff3e4]' : 'bg-white'}`}>Görseller ({artworks.length})</button>}
        {isAdmin && <button onClick={() => setTab('skills')} className={`border-2 border-black rounded-full px-5 py-2 font-black ${tab === 'skills' ? 'bg-[#e6e0ff]' : 'bg-white'}`}>AI Skill'leri</button>}
      </div>
    </div>
    {error && <div className="mt-6 bg-[#ffceca] border-2 border-black rounded-2xl p-4 font-bold">{error}</div>}
    {tab === 'reviews' && <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">{reviews.map((review) => <article key={review.id} className="bg-white border-ink-thick rounded-3xl p-4 card-shadow"><div className="aspect-[3/4] border-2 border-black rounded-2xl overflow-hidden bg-[#f7f9ff]"><img src={review.artwork.assets.thumbnail || review.artwork.assets.processed} className="w-full h-full object-contain" alt={review.artwork.title}/></div><h2 className="font-display font-black text-xl mt-4">{review.artwork.title}</h2><p className="text-sm font-bold text-black/50">{review.artwork.subject}</p><div className="mt-3 bg-[#f7f9ff] border-2 border-black rounded-xl p-3 text-xs font-bold space-y-1"><p>Sağlayıcı: {review.context?.provider || '-'} · {review.context?.model || '-'}</p><p>Kalite: {review.context?.qualityScore ?? '-'}/100 · Benzer: {review.context?.duplicateCount || 0}</p>{review.context?.prompt && <details><summary className="cursor-pointer">Derlenmiş prompt</summary><p className="mt-2 max-h-28 overflow-auto font-mono font-medium break-words">{review.context.prompt}</p></details>}</div><div className="grid grid-cols-3 gap-2 mt-4"><button onClick={() => decide(review, 'approve')} title="Onayla" className="bg-[#dff3e4] border-2 border-black rounded-xl py-2 grid place-items-center"><Check/></button><button onClick={() => decide(review, 'request_changes')} title="Düzeltme iste" className="bg-[#fff2b2] border-2 border-black rounded-xl py-2 grid place-items-center"><Eye/></button><button onClick={() => decide(review, 'reject')} title="Reddet" className="bg-[#ffceca] border-2 border-black rounded-xl py-2 grid place-items-center"><X/></button></div></article>)}{!reviews.length && <p className="font-display font-black text-xl text-black/50">Bekleyen çalışma yok.</p>}</div>}
    {tab === 'catalog' && isAdmin && <section className="mt-8">
      <form onSubmit={createCatalogPage} className="bg-white border-ink-thick rounded-3xl p-5 card-shadow mb-7">
        <div className="flex items-center gap-2 mb-4">
          <Plus size={20}/>
          <h2 className="font-display font-black text-2xl">Yeni boyama sayfası ekle</h2>
        </div>
        <div className="grid md:grid-cols-[1fr_180px] gap-3">
          <label className="block text-sm font-black">Başlık<input value={newCatalogPage.title} onChange={(event) => setNewCatalogPage({ ...newCatalogPage, title: event.target.value })} placeholder="Örn. Uçan balon" className="mt-1 w-full border-2 border-black rounded-xl px-3 py-2 font-bold"/></label>
          <label className="block text-sm font-black">Kategori<input list="admin-categories" value={newCatalogPage.category} onChange={(event) => setNewCatalogPage({ ...newCatalogPage, category: event.target.value })} placeholder="animals, uzay, deniz-canlilari…" className="mt-1 w-full border-2 border-black rounded-xl px-3 py-2 font-bold bg-white"/><span className="mt-1 block text-[11px] font-bold text-black/45">Var olanı seç ya da yeni kategori yaz</span></label>
        </div>
        <div className="grid md:grid-cols-2 gap-3 mt-3">
          <label className="block text-sm font-black">Bilgisayardan görsel<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => selectCatalogFile(event.target.files?.[0])} className="mt-1 w-full border-2 border-black rounded-xl px-3 py-2 font-bold bg-white"/></label>
          <label className="block text-sm font-black">Görsel URL<input value={newCatalogPage.lineArtUrl} onChange={(event) => setNewCatalogPage({ ...newCatalogPage, lineArtUrl: event.target.value })} placeholder="https://... veya /animals/dosya.jpg" className="mt-1 w-full border-2 border-black rounded-xl px-3 py-2 font-bold"/></label>
        </div>
        {newCatalogFileName && <p className="mt-2 text-xs font-bold text-black/55">Seçilen dosya: {newCatalogFileName}</p>}
        <button disabled={!newCatalogPage.title.trim() || (!newCatalogPage.lineArtUrl.trim() && !newCatalogPage.imageDataUrl)} className="mt-4 bg-[#ffd700] border-2 border-black rounded-full px-5 py-2.5 font-black flex items-center gap-2 disabled:opacity-40"><Plus size={17}/>Ekle</button>
      </form>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">{catalogPages.map((item) => {
      const active = catalogEditingId === item.id && catalogDraft;
      return <article key={item.id} className="bg-white border-ink-thick rounded-3xl p-4 card-shadow">
        <div className="aspect-[3/4] border-2 border-black rounded-2xl overflow-hidden bg-[#f7f9ff] grid place-items-center"><img src={item.lineArtUrl} className="w-full h-full object-contain" alt={item.title || item.nameTr}/></div>
        {!active && <><div className="flex justify-between gap-2 mt-4"><h2 className="font-display font-black text-xl">{item.title || item.nameTr}</h2></div><p className="text-sm font-bold text-black/50">{item.category}</p><div className="grid grid-cols-2 gap-2 mt-4"><button onClick={() => startCatalogEdit(item)} className="bg-[#fff2b2] border-2 border-black rounded-xl py-2 font-black flex items-center justify-center gap-2"><Pencil size={17}/>Düzenle</button><button onClick={() => removeCatalogPage(item)} className="bg-[#ffceca] border-2 border-black rounded-xl py-2 font-black flex items-center justify-center gap-2"><Trash2 size={17}/>Sil</button></div></>}
        {active && <div className="mt-4 space-y-3">
          <label className="block text-sm font-black">Başlık<input value={catalogDraft.title} onChange={(event) => setCatalogDraft({ ...catalogDraft, title: event.target.value })} className="mt-1 w-full border-2 border-black rounded-xl px-3 py-2 font-bold"/></label>
          <label className="block text-sm font-black">Kategori<input list="admin-categories" value={catalogDraft.category} onChange={(event) => setCatalogDraft({ ...catalogDraft, category: event.target.value })} placeholder="animals, uzay…" className="mt-1 w-full border-2 border-black rounded-xl px-3 py-2 font-bold bg-white"/></label>
          <div className="grid grid-cols-2 gap-2"><button onClick={() => saveCatalogPage(item)} className="bg-[#dff3e4] border-2 border-black rounded-xl py-2 font-black flex items-center justify-center gap-2"><Save size={17}/>Kaydet</button><button onClick={() => { setCatalogEditingId(null); setCatalogDraft(null); }} className="bg-white border-2 border-black rounded-xl py-2 font-black">Vazgeç</button></div>
        </div>}
      </article>;
    })}{!catalogPages.length && <p className="font-display font-black text-xl text-black/50">Katalog görseli bulunamadı.</p>}</div>
    </section>}
    {tab === 'artworks' && isAdmin && <section className="mt-8">
      <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
        <div className="flex flex-wrap gap-2">{STATUSES.map((status) => <button key={status} onClick={() => setArtworkStatus(status)} className={`border-2 border-black rounded-full px-4 py-2 text-sm font-black ${artworkStatus === status ? 'bg-[#dff3e4] card-shadow' : 'bg-white'}`}>{STATUS_LABELS[status] || status}</button>)}</div>
        <form onSubmit={(event) => { event.preventDefault(); loadArtworks(); }} className="flex gap-2">
          <input value={artworkSearch} onChange={(event) => setArtworkSearch(event.target.value)} placeholder="Başlık veya konu ara" className="min-w-0 border-2 border-black rounded-full px-4 py-2 font-bold"/>
          <button className="w-11 bg-[#ffd700] border-2 border-black rounded-full grid place-items-center" title="Ara"><Search size={18}/></button>
        </form>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">{artworks.map((item) => {
        const preview = item.assets.thumbnail || item.assets.processed || item.assets.colored;
        const active = editingId === item.id && draft;
        return <article key={item.id} className="bg-white border-ink-thick rounded-3xl p-4 card-shadow">
          <div className="aspect-[3/4] border-2 border-black rounded-2xl overflow-hidden bg-[#f7f9ff] grid place-items-center">{preview ? <img src={preview} className="w-full h-full object-contain" alt={item.title}/> : <Eye/>}</div>
          {!active && <><div className="flex justify-between gap-2 mt-4"><h2 className="font-display font-black text-xl">{item.title}</h2><span className="h-fit text-[11px] font-black bg-[#e1f0ff] border border-black rounded-full px-2 py-1">{STATUS_LABELS[item.status] || item.status}</span></div><p className="text-sm font-bold text-black/50">{item.subject || item.source}</p><p className="text-xs font-bold text-black/45 mt-1">{item.category} · {item.age_band || '-'} · {item.difficulty ? DIFFICULTY_LABELS[item.difficulty] : '-'}</p><div className="grid grid-cols-2 gap-2 mt-4"><button onClick={() => startEdit(item)} className="bg-[#fff2b2] border-2 border-black rounded-xl py-2 font-black flex items-center justify-center gap-2"><Pencil size={17}/>Düzenle</button><button onClick={() => removeArtwork(item)} className="bg-[#ffceca] border-2 border-black rounded-xl py-2 font-black flex items-center justify-center gap-2"><Trash2 size={17}/>Sil</button></div></>}
          {active && <div className="mt-4 space-y-3">
            <label className="block text-sm font-black">Başlık<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className="mt-1 w-full border-2 border-black rounded-xl px-3 py-2 font-bold"/></label>
            <label className="block text-sm font-black">Konu<input value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} className="mt-1 w-full border-2 border-black rounded-xl px-3 py-2 font-bold"/></label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-sm font-black">Kategori<input list="admin-categories" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} placeholder="animals, uzay…" className="mt-1 w-full border-2 border-black rounded-xl px-3 py-2 font-bold bg-white"/></label>
              <label className="block text-sm font-black">Durum<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })} className="mt-1 w-full border-2 border-black rounded-xl px-3 py-2 font-bold bg-white">{STATUSES.filter((status) => status !== 'all').map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</select></label>
              <label className="block text-sm font-black">Yaş<select value={draft.ageBand} onChange={(event) => setDraft({ ...draft, ageBand: event.target.value as AgeBand | '' })} className="mt-1 w-full border-2 border-black rounded-xl px-3 py-2 font-bold bg-white"><option value="">-</option>{(['3-5','6-8','9-12'] as const).map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
              <label className="block text-sm font-black">Zorluk<select value={draft.difficulty} onChange={(event) => setDraft({ ...draft, difficulty: event.target.value as Difficulty | '' })} className="mt-1 w-full border-2 border-black rounded-xl px-3 py-2 font-bold bg-white"><option value="">-</option>{(['easy','medium','detailed'] as const).map((value) => <option key={value} value={value}>{DIFFICULTY_LABELS[value]}</option>)}</select></label>
            </div>
            <div className="grid grid-cols-2 gap-2"><button onClick={() => saveArtwork(item)} className="bg-[#dff3e4] border-2 border-black rounded-xl py-2 font-black flex items-center justify-center gap-2"><Save size={17}/>Kaydet</button><button onClick={() => { setEditingId(null); setDraft(null); }} className="bg-white border-2 border-black rounded-xl py-2 font-black">Vazgeç</button></div>
          </div>}
        </article>;
      })}{!artworks.length && <p className="font-display font-black text-xl text-black/50">Görsel bulunamadı.</p>}</div>
    </section>}
    {tab === 'skills' && selectedSkill && <><div className="mt-7 flex gap-2 overflow-x-auto pb-2">{skills.map((skill) => <button key={skill.id} onClick={() => setSelectedSlug(skill.slug)} className={`shrink-0 border-2 border-black rounded-full px-4 py-2 text-sm font-black ${selectedSlug === skill.slug ? 'bg-[#e6e0ff] card-shadow' : 'bg-white'}`}>{skill.name}</button>)}</div><div className="grid lg:grid-cols-[1.2fr_.8fr] gap-7 mt-5 items-start"><section className="bg-white border-ink-thick rounded-3xl p-6 card-shadow"><h2 className="font-display font-black text-2xl flex gap-2"><Code2/>{selectedSkill.name}</h2><p className="text-sm font-bold text-black/50 mt-1">İzinli değişkenler: ageBand, subject, customIdea, sceneDensity, difficulty, lineWeight</p><label className="block font-black mt-5">Sistem şablonu<textarea value={template} onChange={(e) => setTemplate(e.target.value)} className="mt-2 w-full min-h-64 border-2 border-black rounded-2xl p-4 font-mono text-sm"/></label><label className="block font-black mt-4">Negatif prompt<textarea value={negative} onChange={(e) => setNegative(e.target.value)} className="mt-2 w-full min-h-28 border-2 border-black rounded-2xl p-4 font-mono text-sm"/></label><label className="block font-black mt-4">Değişiklik notu<input value={note} onChange={(e) => setNote(e.target.value)} className="mt-2 w-full border-2 border-black rounded-xl px-4 py-3"/></label>{testMessage && <p className="mt-4 bg-[#e1f0ff] border-2 border-black rounded-xl p-3 text-sm font-bold break-words">{testMessage}</p>}<div className="flex flex-wrap gap-2 mt-5"><button onClick={testSkill} className="bg-[#fff2b2] border-2 border-black rounded-full px-6 py-3 font-black">Şablonu test et</button><button disabled={note.length < 3} onClick={saveDraft} className="bg-[#001e30] text-white border-2 border-black rounded-full px-6 py-3 font-black disabled:opacity-40">Taslak sürüm oluştur</button></div></section><aside className="space-y-3"><h2 className="font-display font-black text-xl">Sürüm geçmişi</h2>{[...selectedSkill.ai_skill_versions].sort((a,b) => b.version-a.version).map((version) => <div key={version.id} className={`border-2 border-black rounded-2xl p-4 ${version.id === selectedSkill.active_version_id ? 'bg-[#dff3e4]' : 'bg-white'}`}><div className="flex justify-between"><span className="font-display font-black">v{version.version}</span><span className="text-xs font-black uppercase">{version.id === selectedSkill.active_version_id ? 'Aktif' : version.status}</span></div><p className="text-sm font-bold text-black/50 mt-2">{version.change_note}</p>{version.id !== selectedSkill.active_version_id && <button onClick={() => publish(version.id, version.status === 'archived')} className="mt-3 border-2 border-black rounded-full px-4 py-2 text-sm font-black flex gap-2">{version.status === 'archived' ? <RotateCcw size={16}/> : <Check size={16}/>} {version.status === 'archived' ? 'Geri al' : 'Yayınla'}</button>}</div>)}</aside></div></>}
  </div>;
}
