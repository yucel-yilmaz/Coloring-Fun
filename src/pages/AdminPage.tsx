import { useEffect, useState } from 'react';
import { Check, Code2, Eye, RotateCcw, ShieldCheck, X } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../features/auth/AuthProvider';

interface Review { id: string; artwork: { id: string; title: string; subject: string; assets: Record<string, string> }; context?: { prompt?: string; model?: string; provider?: string; qualityScore?: number; duplicateCount?: number } }
interface SkillVersion { id: string; version: number; status: string; system_template: string; negative_template: string; change_note: string; created_at: string }
interface Skill { id: string; slug: string; name: string; active_version_id: string; ai_skill_versions: SkillVersion[] }
interface Child { id: string; nickname: string }
interface Connection { id: string; provider: string; status: string }

export function AdminPage() {
  const auth = useAuth();
  const [tab, setTab] = useState<'reviews' | 'skills'>('reviews');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSlug, setSelectedSlug] = useState('coloring-page-generator');
  const [error, setError] = useState('');
  const [template, setTemplate] = useState('');
  const [negative, setNegative] = useState('');
  const [note, setNote] = useState('');
  const [children, setChildren] = useState<Child[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [testMessage, setTestMessage] = useState('');
  const load = () => Promise.all([api<Review[]>('/admin/reviews'), auth.profile?.role === 'admin' ? api<Skill[]>('/admin/skills') : Promise.resolve([])]).then(([nextReviews, nextSkills]) => {
    setReviews(nextReviews); setSkills(nextSkills);
  }).catch((reason) => setError(reason.message));
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (auth.profile?.role !== 'admin') return;
    Promise.all([api<Child[]>('/child-profiles'), api<Connection[]>('/ai-connections')]).then(([nextChildren, nextConnections]) => { setChildren(nextChildren); setConnections(nextConnections.filter((item) => item.status === 'ready')); }).catch(() => undefined);
  }, [auth.profile?.role]);
  useEffect(() => {
    const skill = skills.find((item) => item.slug === selectedSlug);
    const active = skill?.ai_skill_versions.find((version) => version.id === skill.active_version_id);
    if (active) { setTemplate(active.system_template); setNegative(active.negative_template); setNote(''); }
  }, [selectedSlug, skills]);
  const decide = async (review: Review, decision: 'approve' | 'reject' | 'request_changes') => {
    const reasonCode = decision === 'approve' ? undefined : window.prompt('Neden kodu', decision === 'reject' ? 'quality' : 'needs_changes') || undefined;
    const noteValue = decision === 'approve' ? undefined : window.prompt('Kullanıcıya açıklama') || undefined;
    if (decision !== 'approve' && (!reasonCode || !noteValue)) return;
    try { await api(`/admin/reviews/${review.id}/decision`, { method: 'POST', body: JSON.stringify({ decision, reasonCode, note: noteValue }) }); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Karar kaydedilemedi.'); }
  };
  const saveDraft = async () => {
    try { await api(`/admin/skills/${selectedSlug}/versions`, { method: 'POST', body: JSON.stringify({ systemTemplate: template, negativeTemplate: negative, changeNote: note, qualityRules: selectedSlug === 'colorability-evaluator' ? { minimumScore: 75, maxRetries: 1 } : {}, providerOverrides: {} }) }); setNote(''); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Sürüm kaydedilemedi.'); }
  };
  const publish = async (versionId: string, rollback = false) => {
    try { await api(`/admin/skills/${selectedSlug}/${rollback ? 'rollback' : 'publish'}`, { method: 'POST', body: JSON.stringify({ versionId }) }); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Sürüm yayınlanamadı.'); }
  };
  const testSkill = async () => {
    setTestMessage('');
    try {
      const result = await api<{ compiledPrompt: string; jobId?: string }>(`/admin/skills/${selectedSlug}/test`, { method: 'POST', body: JSON.stringify({ template, values: { ageBand: '6-8', subject: 'Sevimli aslan', customIdea: 'üç büyük çiçek', sceneDensity: 'simple-scene', difficulty: 'easy', lineWeight: 'thick' }, providerConnectionId: connections[0]?.id, childProfileId: children[0]?.id }) });
      setTestMessage(result.jobId ? `Test üretimi kuyruğa alındı: ${result.jobId}` : `Şablon geçerli. Önizleme: ${result.compiledPrompt.slice(0, 180)}…`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Skill testi çalışmadı.'); }
  };
  const selectedSkill = skills.find((item) => item.slug === selectedSlug);
  return <div className="max-w-6xl mx-auto px-6 py-9 pb-28">
    <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 border-b-4 border-black pb-6"><div><span className="font-display font-black text-[#705d00] flex gap-2"><ShieldCheck/>GÜVENLİ ATÖLYE</span><h1 className="font-display font-extrabold text-4xl mt-1">Yönetim masası</h1></div><div className="flex gap-2"><button onClick={() => setTab('reviews')} className={`border-2 border-black rounded-full px-5 py-2 font-black ${tab === 'reviews' ? 'bg-[#ffd700]' : 'bg-white'}`}>İnceleme ({reviews.length})</button>{auth.profile?.role === 'admin' && <button onClick={() => setTab('skills')} className={`border-2 border-black rounded-full px-5 py-2 font-black ${tab === 'skills' ? 'bg-[#e6e0ff]' : 'bg-white'}`}>AI Skill’leri</button>}</div></div>
    {error && <div className="mt-6 bg-[#ffceca] border-2 border-black rounded-2xl p-4 font-bold">{error}</div>}
    {tab === 'reviews' && <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">{reviews.map((review) => <article key={review.id} className="bg-white border-ink-thick rounded-3xl p-4 card-shadow"><div className="aspect-[3/4] border-2 border-black rounded-2xl overflow-hidden bg-[#f7f9ff]"><img src={review.artwork.assets.thumbnail || review.artwork.assets.processed} className="w-full h-full object-contain" alt={review.artwork.title}/></div><h2 className="font-display font-black text-xl mt-4">{review.artwork.title}</h2><p className="text-sm font-bold text-black/50">{review.artwork.subject}</p><div className="mt-3 bg-[#f7f9ff] border-2 border-black rounded-xl p-3 text-xs font-bold space-y-1"><p>Sağlayıcı: {review.context?.provider || '—'} · {review.context?.model || '—'}</p><p>Kalite: {review.context?.qualityScore ?? '—'}/100 · Benzer: {review.context?.duplicateCount || 0}</p>{review.context?.prompt && <details><summary className="cursor-pointer">Derlenmiş prompt</summary><p className="mt-2 max-h-28 overflow-auto font-mono font-medium break-words">{review.context.prompt}</p></details>}</div><div className="grid grid-cols-3 gap-2 mt-4"><button onClick={() => decide(review, 'approve')} title="Onayla" className="bg-[#dff3e4] border-2 border-black rounded-xl py-2 grid place-items-center"><Check/></button><button onClick={() => decide(review, 'request_changes')} title="Düzeltme iste" className="bg-[#fff2b2] border-2 border-black rounded-xl py-2 grid place-items-center"><Eye/></button><button onClick={() => decide(review, 'reject')} title="Reddet" className="bg-[#ffceca] border-2 border-black rounded-xl py-2 grid place-items-center"><X/></button></div></article>)}{!reviews.length && <p className="font-display font-black text-xl text-black/50">Bekleyen çalışma yok.</p>}</div>}
    {tab === 'skills' && selectedSkill && <><div className="mt-7 flex gap-2 overflow-x-auto pb-2">{skills.map((skill) => <button key={skill.id} onClick={() => setSelectedSlug(skill.slug)} className={`shrink-0 border-2 border-black rounded-full px-4 py-2 text-sm font-black ${selectedSlug === skill.slug ? 'bg-[#e6e0ff] card-shadow' : 'bg-white'}`}>{skill.name}</button>)}</div><div className="grid lg:grid-cols-[1.2fr_.8fr] gap-7 mt-5 items-start"><section className="bg-white border-ink-thick rounded-3xl p-6 card-shadow"><h2 className="font-display font-black text-2xl flex gap-2"><Code2/>{selectedSkill.name}</h2><p className="text-sm font-bold text-black/50 mt-1">İzinli değişkenler: ageBand, subject, customIdea, sceneDensity, difficulty, lineWeight</p><label className="block font-black mt-5">Sistem şablonu<textarea value={template} onChange={(e) => setTemplate(e.target.value)} className="mt-2 w-full min-h-64 border-2 border-black rounded-2xl p-4 font-mono text-sm"/></label><label className="block font-black mt-4">Negatif prompt<textarea value={negative} onChange={(e) => setNegative(e.target.value)} className="mt-2 w-full min-h-28 border-2 border-black rounded-2xl p-4 font-mono text-sm"/></label><label className="block font-black mt-4">Değişiklik notu<input value={note} onChange={(e) => setNote(e.target.value)} className="mt-2 w-full border-2 border-black rounded-xl px-4 py-3"/></label>{testMessage && <p className="mt-4 bg-[#e1f0ff] border-2 border-black rounded-xl p-3 text-sm font-bold break-words">{testMessage}</p>}<div className="flex flex-wrap gap-2 mt-5"><button onClick={testSkill} className="bg-[#fff2b2] border-2 border-black rounded-full px-6 py-3 font-black">Şablonu test et</button><button disabled={note.length < 3} onClick={saveDraft} className="bg-[#001e30] text-white border-2 border-black rounded-full px-6 py-3 font-black disabled:opacity-40">Taslak sürüm oluştur</button></div></section><aside className="space-y-3"><h2 className="font-display font-black text-xl">Sürüm geçmişi</h2>{[...selectedSkill.ai_skill_versions].sort((a,b) => b.version-a.version).map((version) => <div key={version.id} className={`border-2 border-black rounded-2xl p-4 ${version.id === selectedSkill.active_version_id ? 'bg-[#dff3e4]' : 'bg-white'}`}><div className="flex justify-between"><span className="font-display font-black">v{version.version}</span><span className="text-xs font-black uppercase">{version.id === selectedSkill.active_version_id ? 'Aktif' : version.status}</span></div><p className="text-sm font-bold text-black/50 mt-2">{version.change_note}</p>{version.id !== selectedSkill.active_version_id && <button onClick={() => publish(version.id, version.status === 'archived')} className="mt-3 border-2 border-black rounded-full px-4 py-2 text-sm font-black flex gap-2">{version.status === 'archived' ? <RotateCcw size={16}/> : <Check size={16}/>} {version.status === 'archived' ? 'Geri al' : 'Yayınla'}</button>}</div>)}</aside></div></>}
  </div>;
}
