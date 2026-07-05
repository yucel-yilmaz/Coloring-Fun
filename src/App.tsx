import { useState, useEffect } from 'react';
import { 
  Palette, 
  Home, 
  Images, 
  Settings, 
  User, 
  ArrowRight, 
  Sparkles,
  Heart,
  HelpCircle
} from 'lucide-react';
import { Animal, GalleryItem } from './types';
import { ANIMALS, DEFAULT_GALLERY } from './data';
import ColoringBoard from './components/ColoringBoard';
import ArtGallery from './components/ArtGallery';
import SettingsPanel from './components/SettingsPanel';
import { playBubblePop, playToolSelect } from './utils/audio';
import { getProxiedImageUrl } from './utils/image';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'gallery' | 'settings'>('home');
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  
  // Persistent Gallery State
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>(() => {
    const saved = localStorage.getItem('coloring_gallery');
    return saved ? JSON.parse(saved) : DEFAULT_GALLERY;
  });

  // Persistent Sound Settings State
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('coloring_sound');
    return saved ? JSON.parse(saved) === true : true;
  });

  const [activeCategory, setActiveCategory] = useState<'all' | 'animals' | 'dinos'>('all');

  // Save gallery to localStorage when updated
  useEffect(() => {
    localStorage.setItem('coloring_gallery', JSON.stringify(galleryItems));
  }, [galleryItems]);

  // Save sound setting to localStorage
  useEffect(() => {
    localStorage.setItem('coloring_sound', JSON.stringify(soundEnabled));
  }, [soundEnabled]);

  const handleSelectAnimal = (animal: Animal) => {
    playBubblePop();
    setSelectedAnimal(animal);
  };

  const handleSaveMasterpiece = (title: string, dataUrl: string) => {
    const newItem: GalleryItem = {
      id: `saved-${Date.now()}`,
      title: title || 'İsimsiz Şaheser',
      animalId: selectedAnimal?.id || 'custom',
      date: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }),
      imageUrl: dataUrl,
      isStarred: false
    };

    setGalleryItems(prev => [newItem, ...prev]);
    setActiveTab('gallery');
  };

  const handleDeleteItem = (id: string) => {
    setGalleryItems(prev => prev.filter(item => item.id !== id));
  };

  const handleToggleStar = (id: string) => {
    setGalleryItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, isStarred: !item.isStarred };
      }
      return item;
    }));
  };

  const handleResetGallery = () => {
    setGalleryItems(DEFAULT_GALLERY);
  };

  const filteredAnimals = ANIMALS.filter(animal => {
    if (activeCategory === 'all') return true;
    return animal.category === activeCategory;
  });

  // If in drawing mode, render the ColoringBoard directly (hides general headers/navbars for full screen feel)
  if (selectedAnimal) {
    return (
      <ColoringBoard 
        animal={selectedAnimal}
        onSave={handleSaveMasterpiece}
        onBack={() => {
          playToolSelect();
          setSelectedAnimal(null);
        }}
      />
    );
  }

  return (
    <div className="bg-[#f7f9ff] min-h-screen flex flex-col font-sans text-[#001e30] selection:bg-[#ffd700]">
      
      {/* Top Navigation Header */}
      <header className="bg-white w-full top-0 sticky z-40 border-b-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex justify-between items-center px-6 md:px-16 py-4">
        {/* Brand/Logo */}
        <div 
          onClick={() => { playToolSelect(); setActiveTab('home'); }}
          className="flex items-center gap-2.5 cursor-pointer hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
        >
          <div className="w-12 h-12 rounded-full bg-[#ffd700] border-ink flex items-center justify-center animate-wobble-hover">
            <Palette className="text-[#705d00] w-6 h-6 stroke-[3px]" />
          </div>
          <h1 className="font-display font-extrabold text-2xl text-[#705d00] tracking-tight">
            Coloring Fun!
          </h1>
        </div>

        {/* Desktop Navigation Link Tabs (Hidden on Mobile) */}
        <nav className="hidden md:flex items-center gap-8">
          <button 
            onClick={() => { playToolSelect(); setActiveTab('home'); }}
            className={`font-display font-black text-lg flex items-center gap-2 pb-1 cursor-pointer transition-colors ${
              activeTab === 'home' 
                ? 'text-[#705d00] border-b-4 border-[#705d00]' 
                : 'text-black/60 hover:text-[#705d00]'
            }`}
          >
            <Home size={18} />
            Boyama Seç
          </button>
          <button 
            onClick={() => { playToolSelect(); setActiveTab('gallery'); }}
            className={`font-display font-black text-lg flex items-center gap-2 pb-1 cursor-pointer transition-colors ${
              activeTab === 'gallery' 
                ? 'text-[#705d00] border-b-4 border-[#705d00]' 
                : 'text-black/60 hover:text-[#705d00]'
            }`}
          >
            <Images size={18} />
            Sanat Galerisi
          </button>
          <button 
            onClick={() => { playToolSelect(); setActiveTab('settings'); }}
            className={`font-display font-black text-lg flex items-center gap-2 pb-1 cursor-pointer transition-colors ${
              activeTab === 'settings' 
                ? 'text-[#705d00] border-b-4 border-[#705d00]' 
                : 'text-black/60 hover:text-[#705d00]'
            }`}
          >
            <Settings size={18} />
            Ayarlar
          </button>
        </nav>

        {/* User Account Mock Button */}
        <button 
          onClick={() => { playBubblePop(); setActiveTab('settings'); }}
          className="w-12 h-12 rounded-full bg-white border-ink flex items-center justify-center hover:translate-x-[2px] hover:translate-y-[2px] transition-all card-shadow cursor-pointer text-black"
        >
          <User size={24} className="stroke-[2.5px]" />
        </button>
      </header>

      {/* Main Content Body */}
      <main className="flex-grow">
        {activeTab === 'home' && (
          <div className="max-w-5xl mx-auto px-6 md:px-12 py-8 md:py-12 pb-32 animate-pop">
            
            {/* Header / Intro section */}
            <div className="mb-10 text-left">
              <h2 className="font-display font-extrabold text-4xl md:text-5xl text-black tracking-tight leading-none">
                Bir Arkadaş Seç ve Boya! 🦁
              </h2>
              <p className="font-sans font-semibold text-black/60 mt-3 text-lg md:text-xl">
                Kendi şaheserini yaratmak için bir hayvana veya dinozora dokun.
              </p>
            </div>

            {/* Category selection Filters */}
            <div className="flex gap-3 mb-8 overflow-x-auto pb-1">
              <button
                onClick={() => { playToolSelect(); setActiveCategory('all'); }}
                className={`px-5 py-2.5 font-display font-black text-sm rounded-full border-2 border-black cursor-pointer transition-all ${activeCategory === 'all' ? 'bg-[#ffd700] shadow-[2px_2px_0px_0px_#000000]' : 'bg-white card-shadow'}`}
              >
                Hepsi ✨
              </button>
              <button
                onClick={() => { playToolSelect(); setActiveCategory('animals'); }}
                className={`px-5 py-2.5 font-display font-black text-sm rounded-full border-2 border-black cursor-pointer transition-all ${activeCategory === 'animals' ? 'bg-[#cbe6ff]' : 'bg-white card-shadow'}`}
              >
                Hayvan Dostlar 🐾
              </button>
              <button
                onClick={() => { playToolSelect(); setActiveCategory('dinos'); }}
                className={`px-5 py-2.5 font-display font-black text-sm rounded-full border-2 border-black cursor-pointer transition-all ${activeCategory === 'dinos' ? 'bg-[#ffceca]' : 'bg-white card-shadow'}`}
              >
                Dinozorlar 🦖
              </button>
            </div>

            {/* Animals Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {filteredAnimals.map((animal) => (
                <button
                  key={animal.id}
                  onClick={() => handleSelectAnimal(animal)}
                  className={`group block w-full text-left ${animal.cardBgColor} border-ink-thick rounded-[32px] p-4.5 card-shadow card-shadow-hover card-shadow-active transition-all focus:outline-none focus:ring-4 focus:ring-black cursor-pointer`}
                  id={`animal-card-${animal.id}`}
                >
                  {/* Drawing Outline Container */}
                  <div className="bg-white rounded-2xl border-ink aspect-square overflow-hidden mb-4 relative flex items-center justify-center p-3 shadow-inner">
                    <img 
                      src={getProxiedImageUrl(animal.lineArtUrl)} 
                      alt={animal.name}
                      referrerPolicy="no-referrer"
                      className="object-contain w-full h-full opacity-95 group-hover:scale-105 transition-transform duration-300 pointer-events-none select-none filter drop-shadow-sm"
                    />
                  </div>

                  {/* Info Row inside card */}
                  <div className="flex items-center justify-between px-2">
                    <span className="font-display font-black text-xl text-black">
                      {animal.nameTr}
                    </span>
                    <div className="w-9 h-9 rounded-full bg-white border-ink flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors duration-200">
                      <ArrowRight size={18} className="stroke-[3px]" />
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Quick guide helper banner */}
            <div className="mt-14 bg-white border-ink rounded-3xl p-6 shadow-[4px_4px_0px_0px_#000000] flex flex-col md:flex-row items-center gap-4 justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#e1f0ff] flex items-center justify-center text-[#0001c0] shrink-0 border-2 border-black">
                  <HelpCircle size={24} />
                </div>
                <div>
                  <h4 className="font-display font-black text-lg text-black">Nasıl Oynanır Merak mı Ediyorsun?</h4>
                  <p className="font-sans font-semibold text-black/50 text-sm">Kolay adımlarla harika şaheserler yaratmayı öğren.</p>
                </div>
              </div>
              <button 
                onClick={() => { playToolSelect(); setActiveTab('settings'); }}
                className="bg-[#cbe6ff] hover:bg-[#badeff] border-2 border-black rounded-full px-6 py-2.5 font-display font-black text-sm card-shadow active:translate-x-[2px] active:translate-y-[2px] transition-all cursor-pointer"
              >
                Rehberi İncele 📖
              </button>
            </div>
          </div>
        )}

        {activeTab === 'gallery' && (
          <ArtGallery 
            items={galleryItems}
            onDeleteItem={handleDeleteItem}
            onToggleStar={handleToggleStar}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsPanel 
            onResetGallery={handleResetGallery}
            soundEnabled={soundEnabled}
            onToggleSound={setSoundEnabled}
          />
        )}
      </main>

      {/* Bottom Navigation Bar (Visible only on Mobile) */}
      <nav className="md:hidden fixed bottom-0 w-full z-50 border-t-4 border-black shadow-[0px_-4px_0px_0px_rgba(0,0,0,1)] bg-white">
        <div className="flex justify-around items-center h-16 px-4 pb-safe pt-1">
          {/* Home Tab Mobile */}
          <button 
            onClick={() => { playToolSelect(); setActiveTab('home'); }}
            className={`flex flex-col items-center justify-center px-4 py-1 transition-all rounded-full min-w-[56px] min-h-[48px] ${
              activeTab === 'home' 
                ? 'bg-[#ffd700] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000000] -translate-y-1' 
                : 'text-black/60'
            }`}
            id="tab-home-mobile"
          >
            <Home size={20} className={activeTab === 'home' ? 'stroke-[3px]' : 'stroke-[2px]'} />
            <span className="font-display font-extrabold text-[10px] mt-0.5">Boyama</span>
          </button>

          {/* Gallery Tab Mobile */}
          <button 
            onClick={() => { playToolSelect(); setActiveTab('gallery'); }}
            className={`flex flex-col items-center justify-center px-4 py-1 transition-all rounded-full min-w-[56px] min-h-[48px] ${
              activeTab === 'gallery' 
                ? 'bg-[#ffd700] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000000] -translate-y-1' 
                : 'text-black/60'
            }`}
            id="tab-gallery-mobile"
          >
            <Images size={20} className={activeTab === 'gallery' ? 'stroke-[3px]' : 'stroke-[2px]'} />
            <span className="font-display font-extrabold text-[10px] mt-0.5">Galeri</span>
          </button>

          {/* Settings Tab Mobile */}
          <button 
            onClick={() => { playToolSelect(); setActiveTab('settings'); }}
            className={`flex flex-col items-center justify-center px-4 py-1 transition-all rounded-full min-w-[56px] min-h-[48px] ${
              activeTab === 'settings' 
                ? 'bg-[#ffd700] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000000] -translate-y-1' 
                : 'text-black/60'
            }`}
            id="tab-settings-mobile"
          >
            <Settings size={20} className={activeTab === 'settings' ? 'stroke-[3px]' : 'stroke-[2px]'} />
            <span className="font-display font-extrabold text-[10px] mt-0.5">Ayarlar</span>
          </button>
        </div>
      </nav>

    </div>
  );
}
