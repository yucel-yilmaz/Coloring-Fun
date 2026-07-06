import { useEffect, useState } from 'react';
import { Clock3, Globe2, Paintbrush, Send, Sparkles, Trash2, Undo2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

interface Artwork { id: string; title: string; source: 'generated' | 'colored'; status: string; category: string; created_at: string; assets: Record<string, string> }

const STATUS: Record<string, string> = { private: 'Özel', submitted: 'İncelemede', under_review: 'İncelemede', published: 'Yayında', rejected: 'Reddedildi', changes_requested: 'Düzeltme bekliyor', taken_down: 'Yayından kaldırıldı' };

export function CloudGalleryPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'mine' | 'community'>('mine');
  const [items, setItems] = useState<Artwork[]>([]);
  const [error, setError] = useState('');
  const load = () => api<Artwork[]>(tab === 'mine' ? '/artworks?scope=private' : '/artworks/public').then(setItems).catch((reason) => setError(reason.message));
  useEffect(() => { load(); }, [tab]);
  const submit = async (item: Artwork) => {
    const title = window.prompt('Toplulukta görünecek başlık', item.title)?.trim();
    if (!title || !window.confirm('Bu çalışmayı paylaşma hakkına sahip olduğunu ve admin incelemesine göndermek istediğini onaylıyor musun?')) return;
    try { await api(`/artworks/${item.id}/submit`, { method: 'POST', body: JSON.stringify({ title, category: item.category || 'animals', rightsConfirmed: true }) }); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Gönderilemedi.'); }
  };
  const remove = async (item: Artwork) => {
    if (!window.confirm(`“${item.title}” kalıcı olarak silinsin mi?`)) return;
    try { await api(`/artworks/${item.id}`, { method: 'DELETE' }); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Çalışma silinemedi.'); }
  };
  const withdraw = async (item: Artwork) => {
    if (!window.confirm('Bu çalışma topluluk galerisinden kaldırılsın mı?')) return;
    try { await api(`/artworks/${item.id}/withdraw`, { method: 'POST' }); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Yayın geri çekilemedi.'); }
  };
  return <div className="max-w-6xl mx-auto px-6 py-9 pb-28">
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b-4 border-black pb-6"><div><h1 className="font-display font-extrabold text-4xl md:text-5xl">Boyama rafın</h1><p className="font-bold text-black/50 mt-2">Özel çalışmaların ve onaylanan topluluk sayfaları.</p></div><div className="flex gap-2">{([['mine','Benim rafım'],['community','Topluluk']] as const).map(([value,label]) => <button key={value} onClick={() => setTab(value)} className={`border-2 border-black rounded-full px-5 py-2.5 font-display font-black ${tab === value ? 'bg-[#ffd700] card-shadow' : 'bg-white'}`}>{value === 'mine' ? <Paintbrush className="inline mr-2" size={17}/> : <Globe2 className="inline mr-2" size={17}/>} {label}</button>)}</div></div>
    {error && <div className="mt-6 bg-[#ffceca] border-2 border-black rounded-2xl p-4 font-bold">{error}</div>}
    {!items.length && <div className="mt-8 bg-white border-ink-thick rounded-3xl p-12 text-center card-shadow"><Sparkles className="mx-auto text-[#705d00]" size={42}/><h2 className="font-display font-black text-2xl mt-4">Raf henüz boş</h2><p className="font-bold text-black/50 mt-2">İlk kişisel boyama sayfanı oluştur.</p><Link to="/create" className="inline-block mt-5 bg-[#ffd700] border-2 border-black rounded-full px-6 py-3 font-black card-shadow">Hayal etmeye başla</Link></div>}
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-7 mt-8">{items.map((item) => {
      const preview = item.assets.thumbnail || item.assets.processed || item.assets.colored;
      return <article key={item.id} className="bg-white border-ink-thick rounded-[28px] p-4 card-shadow"><div className="aspect-[3/4] rounded-2xl border-2 border-black bg-[#f7f9ff] overflow-hidden flex items-center justify-center">{preview ? <img src={preview} className="w-full h-full object-contain" alt={item.title}/> : <Clock3/>}</div><div className="px-2 pt-4"><div className="flex justify-between gap-2"><h2 className="font-display font-black text-xl">{item.title}</h2><span className="h-fit text-[11px] font-black bg-[#e1f0ff] border border-black rounded-full px-2 py-1">{STATUS[item.status] || item.status}</span></div><div className="flex gap-2 mt-4">{item.assets.processed && <button onClick={() => navigate(`/color/${item.id}`)} className="flex-1 bg-[#ffd700] border-2 border-black rounded-full py-2 font-black">Boya</button>}{tab === 'mine' && item.source === 'generated' && ['private','changes_requested','rejected','withdrawn'].includes(item.status) && <button onClick={() => submit(item)} title="Topluluğa gönder" className="w-11 bg-[#dff3e4] border-2 border-black rounded-full grid place-items-center"><Send size={18}/></button>}{tab === 'mine' && item.status === 'published' && <button onClick={() => withdraw(item)} title="Yayından çek" className="w-11 bg-[#fff2b2] border-2 border-black rounded-full grid place-items-center"><Undo2 size={18}/></button>}{tab === 'mine' && <button onClick={() => remove(item)} title="Sil" className="w-11 bg-[#ffceca] border-2 border-black rounded-full grid place-items-center"><Trash2 size={18}/></button>}</div></div></article>;
    })}</div>
  </div>;
}
