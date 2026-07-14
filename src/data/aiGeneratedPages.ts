import type { ColoringCategory } from '../types';

export interface AiGeneratedPageDefinition {
  id: string;
  nameTr: string;
  file: string;
  category: ColoringCategory;
  prompt: string;
}

function page(index: number, id: string, nameTr: string, category: ColoringCategory, prompt: string): AiGeneratedPageDefinition {
  return { id: `ai-${id}`, nameTr, file: `ai-${String(index).padStart(3, '0')}-${id}.png`, category, prompt };
}

export const AI_GENERATED_PAGES: AiGeneratedPageDefinition[] = [
  page(1, 'panda-bambu', 'Bambulu Sevimli Panda', 'animals', 'one cute panda sitting and holding one bamboo branch'),
  page(2, 'fil-balon', 'Balonlu Fil', 'animals', 'one friendly baby elephant holding one balloon with its trunk'),
  page(3, 'aslan-yavrusu', 'Aslan Yavrusu', 'animals', 'one smiling friendly lion cub sitting'),
  page(4, 'tavsan-havuc', 'Havuçlu Tavşan', 'animals', 'one cute rabbit holding one large carrot'),
  page(5, 'deniz-kaplumbagasi', 'Deniz Kaplumbağası', 'animals', 'one friendly sea turtle swimming with two simple bubbles'),
  page(6, 'yunus', 'Neşeli Yunus', 'animals', 'one happy dolphin jumping above one simple wave'),
  page(7, 'baykus', 'Sevimli Baykuş', 'animals', 'one cute owl sitting on one simple branch'),
  page(8, 'zurafa', 'Minik Zürafa', 'animals', 'one friendly baby giraffe standing'),
  page(9, 'penguen', 'Neşeli Penguen', 'animals', 'one cute penguin waving one flipper'),
  page(10, 'tilki', 'Sevimli Tilki', 'animals', 'one friendly fox sitting with a large simple tail'),
  page(11, 'koala', 'Uykucu Koala', 'animals', 'one cute koala hugging a simple tree trunk'),
  page(12, 'sincap', 'Meşeli Sincap', 'animals', 'one cute squirrel holding one large acorn'),

  page(13, 'trex', 'El Sallayan T-Rex', 'dinos', 'one cute baby tyrannosaurus rex waving, friendly not scary'),
  page(14, 'triceratops', 'Çiçekli Triceratops', 'dinos', 'one cute triceratops beside one large simple flower'),
  page(15, 'brontosaurus', 'Uzun Boyunlu Dinozor', 'dinos', 'one smiling baby brontosaurus standing'),
  page(16, 'stegosaurus', 'Sevimli Stegosaurus', 'dinos', 'one friendly stegosaurus with large simple back plates'),
  page(17, 'pterodaktil', 'Uçan Pterodaktil', 'dinos', 'one cute pterodactyl flying with open wings'),
  page(18, 'yumurtadan-dinozor', 'Yumurtadan Çıkan Dinozor', 'dinos', 'one baby dinosaur hatching from one large cracked egg'),

  page(19, 'itfaiye-araci', 'İtfaiye Aracı', 'vehicles', 'one simple friendly fire truck viewed from the side'),
  page(20, 'traktor', 'Çiftlik Traktörü', 'vehicles', 'one simple tractor with two large wheels'),
  page(21, 'tren', 'Neşeli Tren', 'vehicles', 'one simple friendly locomotive with two carriages'),
  page(22, 'ucak', 'Gökyüzünde Uçak', 'vehicles', 'one simple passenger airplane flying beside two rounded clouds'),
  page(23, 'yelkenli', 'Yelkenli Tekne', 'vehicles', 'one simple sailboat on one gentle wave'),
  page(24, 'ekskavator', 'Ekskavatör', 'vehicles', 'one simple excavator viewed from the side with a large bucket'),
  page(25, 'ambulans', 'Ambulans', 'vehicles', 'one simple friendly ambulance viewed from the side, no text'),
  page(26, 'okul-otobusu', 'Okul Otobüsü', 'vehicles', 'one simple school bus viewed from the side, no text'),

  page(27, 'astronot', 'Minik Astronot', 'people', 'one happy child astronaut in a simple spacesuit waving'),
  page(28, 'itfaiyeci', 'Cesur İtfaiyeci', 'people', 'one friendly child firefighter holding a simple hose, no text'),
  page(29, 'doktor', 'Sevimli Doktor', 'people', 'one friendly child doctor with a stethoscope, no text'),
  page(30, 'asci', 'Minik Aşçı', 'people', 'one happy child chef holding a large mixing spoon'),
  page(31, 'ressam', 'Minik Ressam', 'people', 'one happy child painter holding a brush and simple palette'),
  page(32, 'bahcivan', 'Minik Bahçıvan', 'people', 'one happy child gardener holding a watering can'),

  page(33, 'mantar-ev', 'Mantar Ev', 'places', 'one simple cute mushroom-shaped cottage with one door and two windows'),
  page(34, 'oyun-parki', 'Oyun Parkı', 'places', 'simple playground with one slide and one swing, no people'),
  page(35, 'ciftlik', 'Çiftlik Evi', 'places', 'one simple barn with one fence and one large tree'),
  page(36, 'sato', 'Masal Şatosu', 'places', 'one simple friendly fairy-tale castle with three towers, no flags'),
  page(37, 'agac-ev', 'Ağaç Ev', 'places', 'one simple treehouse with a ladder in one large tree'),
  page(38, 'sinif', 'Neşeli Sınıf', 'places', 'simple classroom with one desk, one chair and one chalkboard, no text'),
  page(39, 'firin', 'Küçük Fırın', 'places', 'one simple bakery storefront with bread shapes in the window, no text'),
  page(40, 'hayvanat-bahcesi', 'Hayvanat Bahçesi Girişi', 'places', 'one simple zoo entrance arch with leaf decorations, no text and no animals'),

  page(41, 'roket', 'Uzay Roketi', 'space', 'one simple rocket launching above two rounded clouds'),
  page(42, 'gezegenler', 'Gülümseyen Gezegenler', 'space', 'three simple friendly planets with rings and tiny stars'),
  page(43, 'ay-araci', 'Ay Aracı', 'space', 'one simple moon rover with four large wheels on the moon'),
  page(44, 'uzayli', 'Sevimli Uzaylı', 'space', 'one friendly cute alien waving, standing on a simple moon surface'),
  page(45, 'uydu', 'Uzay Uydusu', 'space', 'one simple satellite with two large rectangular solar panels'),
  page(46, 'teleskop', 'Yıldız Teleskobu', 'space', 'one simple telescope pointing toward three large stars'),
  page(47, 'uzay-istasyonu', 'Uzay İstasyonu', 'space', 'one simple space station with large geometric modules'),
  page(48, 'ayda-astronot', 'Ayda Astronot', 'space', 'one happy child astronaut standing on the moon beside one flag with no symbol'),
  page(49, 'kuyruklu-yildiz', 'Kuyruklu Yıldız', 'space', 'one large friendly comet flying past two simple stars'),
  page(50, 'gunes-sistemi', 'Güneş Sistemi', 'space', 'one large smiling sun with four simple planets on separate circular orbits'),
];
