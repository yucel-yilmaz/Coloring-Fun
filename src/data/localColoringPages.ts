import type { Animal } from '../types';

type LocalCategory = Extract<Animal['category'], 'animals' | 'vehicles' | 'people' | 'places'>;

const ANIMAL_FILES = [
  'Albatros-basit.jpg',
  'Albatros-resim.jpg',
  'Basit-Mavi-Alakarga-Cizim.jpg',
  'Basit-Sinek-resim.jpg',
  'Basit-Sinek.jpg',
  'Basit-Sivrisinek.jpg',
  'Ciceklerle-Eglenceli-Kelebek.jpg',
  'Cizim-Kelebek.jpg',
  'Cizmek-Katil-Balina-yazdirilabilir.jpg',
  'Cizmek-Kopek-ve-Kedi-cocuklar-icin-ucretsiz.jpg',
  'Cizmek-Kopek-ve-Kedi-cocuklar-icin-yazdirilabilir.jpg',
  'Cizmek-Kopek-ve-Kedi-kolay.jpg',
  'Cizmek-Mavi-Alakarga-basit.jpg',
  'Cizmek-Pangolin-Kolay.jpg',
  'Cizmek-Pug-Kopegi-Ucretsiz-Yazdirilabilir.jpg',
  'Cizmek-Sinek.jpg',
  'Goruntu-Kopek-ve-Kedi-taslak.jpg',
  'Goruntu-Sinek.jpg',
  'Gulumseyen-Kucuk-Inek.jpg',
  'Gulumseyen-Kucuk-Kelebek.jpg',
  'Japon-Baligi-kolay.jpg',
  'Katil-Balina-Temel.jpg',
  'Kelebek-ucretsiz-Fotograf.jpg',
  'Kelebek-ucretsiz-Indir.jpg',
  'Kolay-Albatros.jpg',
  'Kolay-Sinek-resim.jpg',
  'Komik-Inek.jpg',
  'Kopek-ve-Kedi-kolay.jpg',
  'Kopek-ve-Kedi-taslak.jpg',
  'Kopek-ve-Kedi-temel.jpg',
  'Mavi-Alakarga-resim.jpg',
  'Pug-Kopegi-Uyumak.jpg',
  'Pug-Kopegi-araba-surmek.jpg',
  'Pug-Kopegi-basketbol-oynamak.jpg',
  'Pug-Kopegi-bisikletcilik.jpg',
  'Sevimli-Kurbaga.jpg',
  'Sinek-kolay-Ciz.jpg',
  'Sivrisinek-ucretsiz.jpg',
  'Sut-Inegi.jpg',
  'Ucretsiz-Pangolin-resim.jpg',
  'Yazdirilabilir-Albatros-Cizim.jpg',
  'Yazdirilabilir-Gulumseyen-Kelebek.jpg',
  'Yazdirilabilir-Mavi-Alakarga-resim.jpg',
  'Yazdirilabilir-Pangolin-resim.jpg',
] as const;

const PEOPLE_FILES = [
  'Basit-Ressam-Cizim.jpg',
  'Basit-Ressam-resim.jpg',
  'Basit-Ressam.jpg',
  'Cizmek-Ressam-ucretsiz-yazdirilabilir.jpg',
  'Cizmek-Ressam.jpg',
  'Goruntu-Ressam-ucretsiz-yazdirilabilir.jpg',
  'Ressam-Cizim.jpg',
  'Ressam-temel.jpg',
  'Temel-Ressam-Cizim.jpg',
  'Ucretsiz-Ressam-Cizim.jpg',
  'Ucretsiz-Ressam-resim.jpg',
  'Yazdirilabilir-Ressam-Cizim.jpg',
  'niloya-ve-kaplumbaga.jpg',
] as const;

const VEHICLE_FILES = [
  'Basit-Trafik-isiklari.jpg',
  'Cizim-Vinc-cocuklar-icin-temel.jpg',
  'Cizmek-Dondurma-Kamyonu-Ucretsiz.jpg',
  'Cizmek-Dondurma-Kamyonu-cocuklar-icin-basit.jpg',
  'Dondurma-Kamyonu-1.jpg',
  'Dondurma-Kamyonu-Ucretsiz-Yazdirilabilir.jpg',
  'Resim-Vinc-ucretsiz-yazdirilabilir.jpg',
  'Trafik-isiklari-1.jpg',
  'Ucretsiz-yazdirilabilir-Vinc.jpg',
  'Vinc-Cizimi-1.jpg',
  'Yazdirilabilir-Dondurma-Kamyonu.jpg',
  'araba-cimenlerin-uzerinde-cip.jpg',
  'araba-sayfa-1.jpg',
  'araba-sayfa-2.jpg',
] as const;

const PLACE_FILES = [
  'Basit-Yatak-odasi-resim.jpg',
  'Cizmek-Yatak-odasi-basit.jpg',
  'Cizmek-Yatak-odasi.jpg',
  'Goruntu-Yatak-odasi-ucretsiz.jpg',
  'Goruntu-Yatak-odasi-yazdirilabilir.jpg',
  'Temel-Yatak-odasi-resim.jpg',
  'Yatak-odasi-Goruntu.jpg',
  'Yazdirilabilir-Yatak-odasi-Cizim.jpg',
] as const;

const TITLE_REPLACEMENTS: Record<string, string> = {
  Ciceklerle: 'Çiçeklerle',
  Cizim: 'Çizim',
  Cizimi: 'Çizimi',
  Cizmek: 'Çizmek',
  Goruntu: 'Görüntü',
  Gulumseyen: 'Gülümseyen',
  Inek: 'İnek',
  Katil: 'Katil',
  Kopek: 'Köpek',
  Kurbaga: 'Kurbağa',
  Kucuk: 'Küçük',
  Ucretsiz: 'Ücretsiz',
  Vinc: 'Vinç',
  Yazdirilabilir: 'Yazdırılabilir',
  cocuklar: 'çocuklar',
  icin: 'için',
  kolay: 'kolay',
  resim: 'resim',
  taslak: 'taslak',
  temel: 'temel',
  ucretsiz: 'ücretsiz',
  yazdirilabilir: 'yazdırılabilir',
};

function createTitle(file: string) {
  return file
    .replace(/\.[^.]+$/, '')
    .split('-')
    .map((word) => TITLE_REPLACEMENTS[word] ?? word)
    .join(' ');
}

function createPages(files: readonly string[], category: LocalCategory) {
  return files.map((file) => ({
    id: `local-${file.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name: createTitle(file),
    nameTr: createTitle(file),
    file,
    category,
  }));
}

export const LOCAL_COLORING_PAGES = [
  ...createPages(ANIMAL_FILES, 'animals'),
  ...createPages(VEHICLE_FILES, 'vehicles'),
  ...createPages(PEOPLE_FILES, 'people'),
  ...createPages(PLACE_FILES, 'places'),
];
